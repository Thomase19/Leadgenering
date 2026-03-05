import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@leadbot/shared";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateResponse, generateSummary } from "@/lib/ai/provider";
import { getRelevantChunks } from "@/lib/ai/embeddings";
import { scoreLead, meetsThreshold } from "@leadbot/shared";
import type { QualificationState } from "@leadbot/shared";
import { addCrmJob } from "@/lib/queue";

function mergeState(prev: QualificationState | null, next: QualificationState): QualificationState {
  const out = { ...prev };
  for (const [k, v] of Object.entries(next)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, content } = parsed.data;

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { site: { include: { widgetConfig: true } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.site.widgetConfig) {
    return NextResponse.json({ error: "Widget not configured" }, { status: 400 });
  }

  if (!checkRateLimit(session.siteId, session.visitorId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await prisma.chatMessage.create({
    data: { sessionId, role: "VISITOR", content },
  });

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  const chatMessages = messages.map((m) => ({
    role: m.role as "VISITOR" | "BOT",
    content: m.content,
  }));

  const config = session.site.widgetConfig;
  const questions = Array.isArray(config.qualificationQuestions)
    ? (config.qualificationQuestions as { id: string; question: string; required: boolean }[])
    : [];
  let kbChunks: string[] = [];
  try {
    const ragChunks = await getRelevantChunks(session.siteId, content, 5);
    if (ragChunks.length > 0) kbChunks = ragChunks;
  } catch {
    // RAG failed (e.g. no embeddings yet); use fallback
  }
  if (kbChunks.length === 0) {
    const kb = await prisma.knowledgeChunk.findMany({
      where: { siteId: session.siteId },
      take: 10,
    });
    kbChunks = kb.slice(0, 5).map((c) => c.content);
  }

  const outsideBusinessHours = !(config.businessHoursStart != null && config.businessHoursEnd != null)
    ? false
    : (() => {
        const h = new Date().getHours();
        const d = new Date().getDay();
        if (d === 0 || d === 6) return true;
        return h < (config.businessHoursStart ?? 0) || h >= (config.businessHoursEnd ?? 24);
      })();

  const recentSessions = await prisma.chatSession.findMany({
    where: { siteId: session.siteId, id: { not: sessionId } },
    orderBy: { startedAt: "desc" },
    take: 25,
    select: { summary: true, status: true, score: true },
  });
  const siteHistoryContext = recentSessions
    .filter((s) => s.summary || s.status !== "OPEN")
    .slice(0, 15)
    .map((s) => `- Outcome: ${s.status}, score ${s.score}. ${s.summary ? `Summary: ${s.summary.slice(0, 200)}${s.summary.length > 200 ? "…" : ""}` : ""}`)
    .join("\n");

  const currentState = (session.qualificationState as QualificationState | null) ?? undefined;
  let aiResult: { content: string; qualificationState: QualificationState };
  try {
    aiResult = await generateResponse({
      greeting: config.greetingText,
      qualificationQuestions: questions,
      messages: chatMessages,
      kbChunks,
      outsideBusinessHours,
      currentState: currentState ?? null,
      toneOfVoice: config.toneOfVoice ?? null,
      collectEmailPhoneFirst: config.collectEmailPhoneFirst,
      siteHistoryContext: siteHistoryContext || "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("AI error:", message, err);
    aiResult = {
      content: "Sorry, I'm having trouble right now. Please try again in a moment.",
      qualificationState: currentState ?? {},
    };
  }

  const mergedState = mergeState(currentState ?? null, aiResult.qualificationState);

  await prisma.chatMessage.create({
    data: { sessionId, role: "BOT", content: aiResult.content },
  });

  const hasEmail = !!(
    mergedState.contactEmail?.trim() ||
    (mergedState.contactCaptured && chatMessages.some((m) => /@/.test(m.content)))
  );
  const hasPhone = !!(mergedState.contactPhone?.trim() || /\+?[\d\s-]{10,}/.test(content));
  const score = scoreLead(
    mergedState,
    hasEmail || !!mergedState.contactEmail,
    hasPhone || !!mergedState.contactPhone
  );

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      qualificationState: mergedState as object,
      score,
    },
  });

  const contactCaptured = !!(mergedState.contactEmail || mergedState.contactPhone || hasEmail || hasPhone);
  const qualified = meetsThreshold(score, config.leadThreshold) && contactCaptured;

  let botMessage = aiResult.content;
  let leadId: string | null = null;

  if (qualified && session.status === "OPEN") {
    const summary = await generateSummary(
      messages.map((m) => ({ role: m.role, content: m.content })).concat([
        { role: "VISITOR", content },
        { role: "BOT", content: aiResult.content },
      ])
    );
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: "QUALIFIED", summary },
    });
    const lead = await prisma.lead.create({
      data: {
        sessionId,
        siteId: session.siteId,
        name: mergedState.contactName ?? null,
        email: mergedState.contactEmail ?? null,
        phone: mergedState.contactPhone ?? null,
        company: mergedState.contactCompany ?? null,
        score,
        qualified: true,
        crmProvider: "NONE",
      },
    });
    leadId = lead.id;

    const tenantId = session.site.tenantId;
    const webhookConn = await prisma.crmConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider: "WEBHOOK" } },
    });
    if (webhookConn?.webhookUrl) {
      try {
        await addCrmJob({ leadId: lead.id, tenantId, provider: "WEBHOOK" });
      } catch (e) {
        console.error("Enqueue webhook job failed", e);
      }
    }
    const hubspotConn = await prisma.crmConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider: "HUBSPOT" } },
    });
    if (hubspotConn?.hubspotAccessToken) {
      try {
        await addCrmJob({ leadId: lead.id, tenantId, provider: "HUBSPOT" });
      } catch (e) {
        console.error("Enqueue HubSpot job failed", e);
      }
    }
    try {
      const { runWorkflowsForLead } = await import("@/lib/workflows");
      await runWorkflowsForLead(lead.id, tenantId, "LEAD_QUALIFIED");
    } catch (e) {
      console.error("Workflows failed", e);
    }
  }

  return NextResponse.json({
    ok: true,
    botMessage: { content: botMessage },
    score,
    qualified: qualified ? true : undefined,
    leadId: leadId ?? undefined,
  });
}

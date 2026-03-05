import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser, getSiteForTenant, createAuditLog } from "@/lib/tenancy";
import { widgetConfigUpdateSchema } from "@leadbot/shared";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: siteId } = await params;
  const site = await getSiteForTenant(siteId, ctx.tenantId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = widgetConfigUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const config = await prisma.widgetConfig.upsert({
    where: { siteId },
    create: {
      siteId,
      botName: d.botName ?? "LeadBot",
      avatarUrl: d.avatarUrl ?? null,
      avatarEmoji: d.avatarEmoji ?? null,
      primaryColor: d.primaryColor ?? "#2563eb",
      greetingText: d.greetingText ?? "",
      offlineMessage: d.offlineMessage ?? "",
      qualificationQuestions: (d.qualificationQuestions ?? []) as object,
      leadThreshold: d.leadThreshold ?? 60,
      businessHoursStart: d.businessHoursStart ?? null,
      businessHoursEnd: d.businessHoursEnd ?? null,
      collectEmailPhoneFirst: d.collectEmailPhoneFirst ?? true,
      toneOfVoice: d.toneOfVoice ?? null,
      inputPlaceholder: d.inputPlaceholder ?? null,
      typingText: d.typingText ?? null,
      sendButtonLabel: d.sendButtonLabel ?? null,
    },
    update: {
      ...(d.botName !== undefined && { botName: d.botName }),
      ...(d.avatarUrl !== undefined && { avatarUrl: d.avatarUrl }),
      ...(d.avatarEmoji !== undefined && { avatarEmoji: d.avatarEmoji }),
      ...(d.primaryColor !== undefined && { primaryColor: d.primaryColor }),
      ...(d.greetingText !== undefined && { greetingText: d.greetingText }),
      ...(d.offlineMessage !== undefined && { offlineMessage: d.offlineMessage }),
      ...(d.qualificationQuestions !== undefined && { qualificationQuestions: d.qualificationQuestions as object }),
      ...(d.leadThreshold !== undefined && { leadThreshold: d.leadThreshold }),
      ...(d.businessHoursStart !== undefined && { businessHoursStart: d.businessHoursStart }),
      ...(d.businessHoursEnd !== undefined && { businessHoursEnd: d.businessHoursEnd }),
      ...(d.collectEmailPhoneFirst !== undefined && { collectEmailPhoneFirst: d.collectEmailPhoneFirst }),
      ...(d.toneOfVoice !== undefined && { toneOfVoice: d.toneOfVoice }),
      ...(d.inputPlaceholder !== undefined && { inputPlaceholder: d.inputPlaceholder }),
      ...(d.typingText !== undefined && { typingText: d.typingText }),
      ...(d.sendButtonLabel !== undefined && { sendButtonLabel: d.sendButtonLabel }),
    },
  });
  await createAuditLog(ctx.tenantId, "widget_config.updated", { siteId }, ctx.userId);
  return NextResponse.json(config);
}

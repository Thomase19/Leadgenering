import OpenAI from "openai";
import path from "path";
import fs from "fs";
import type { QualificationState } from "@leadbot/shared";

function loadKeyFromEnvFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/OPENAI_API_KEY\s*=\s*["']?([^"'\n#]+)["']?/);
    const value = match?.[1]?.trim() ?? "";
    return value;
  } catch {
    return "";
  }
}

export function getOpenAI(): OpenAI {
  let key = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!key || key.startsWith("sk-...")) {
    const cwd = process.cwd();
    const pathsToTry = [
      path.join(cwd, ".env"),
      path.join(cwd, ".env.local"),
      path.join(cwd, "apps", "web", ".env"),
      path.join(cwd, "apps", "web", ".env.local"),
    ];
    for (const p of pathsToTry) {
      key = loadKeyFromEnvFile(p);
      if (key && !key.startsWith("sk-...")) break;
    }
  }
  if (!key || key.startsWith("sk-...")) {
    throw new Error("OPENAI_API_KEY is not set or is placeholder. Add your key to apps/web/.env and restart the server.");
  }
  return new OpenAI({ apiKey: key });
}

export type AiResponseResult = {
  content: string;
  qualificationState: QualificationState;
};

export async function generateResponse(params: {
  greeting: string;
  qualificationQuestions: { id: string; question: string; required: boolean }[];
  messages: { role: "VISITOR" | "BOT"; content: string }[];
  kbChunks: string[];
  outsideBusinessHours: boolean;
  currentState: QualificationState | null;
  toneOfVoice: string | null;
  collectEmailPhoneFirst: boolean;
  siteHistoryContext: string;
}): Promise<AiResponseResult> {
  const {
    greeting,
    qualificationQuestions,
    messages,
    kbChunks,
    outsideBusinessHours,
    currentState,
    toneOfVoice,
    collectEmailPhoneFirst,
    siteHistoryContext,
  } = params;

  const systemParts = [
    "You are an in-house advisor and salesperson for this company, available 24/7 on their website. Your role: (1) Advise visitors helpfully and professionally. (2) Qualify leads by understanding their intent, timeline, and needs. (3) Collect contact data (name, email, and optionally phone) so the sales team can follow up. You are not a generic bot – you represent the company and should sound like their team.",
    "Keep responses concise (1–3 sentences unless the visitor asks for more). Be warm but efficient.",
    `Opening line / greeting context: ${greeting}`,
  ];

  if (toneOfVoice?.trim()) {
    systemParts.push(
      `Tone of voice (follow this strictly): ${toneOfVoice.trim()}`
    );
  }

  if (outsideBusinessHours) {
    systemParts.push(
      "Outside opening hours: the visitor will get a follow-up when the team is back. Still advise and qualify as usual; collecting their email/phone is especially important so the team can reach them."
    );
  }

  if (collectEmailPhoneFirst) {
    systemParts.push(
      "Contact collection is key: once the visitor is engaged, naturally ask for their name and email (and phone if relevant). A lead is only qualified when we have at least email or phone. Weave the ask into the conversation (e.g. after answering a question or when they show interest)."
    );
  }

  if (qualificationQuestions.length > 0) {
    systemParts.push(
      "Qualification questions to weave in when relevant: " +
        qualificationQuestions.map((q) => q.question).join("; ")
    );
  }

  if (siteHistoryContext.trim()) {
    systemParts.push(
      "Learn from past conversations on this site. Use them to match tone, avoid repeated mistakes, and improve how you advise and qualify:\n" +
        siteHistoryContext.trim()
    );
  }

  if (kbChunks.length > 0) {
    systemParts.push("Relevant knowledge:\n" + kbChunks.slice(0, 5).join("\n\n"));
  }

  systemParts.push(
    "After each response, output a JSON block (on a single line, no markdown) with updated qualification state. Keys: intent, urgency, budgetSignal, serviceType, timeline, contactCaptured (true if they shared email or phone), companySizeSignal, contactEmail, contactPhone, contactName, contactCompany. Only include keys that you can infer from the conversation."
  );

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemParts.join("\n\n") },
    ...messages.map((m) => ({
      role: m.role === "VISITOR" ? "user" as const : "assistant" as const,
      content: m.content,
    })),
  ];

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: chatMessages,
    max_tokens: 400,
    temperature: 0.5,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  let content = raw;
  let qualificationState: QualificationState = currentState ?? {};

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      content = raw.replace(jsonMatch[0], "").trim();
      qualificationState = {
        intent: typeof parsed.intent === "string" ? parsed.intent : undefined,
        urgency: typeof parsed.urgency === "string" ? parsed.urgency : undefined,
        budgetSignal: typeof parsed.budgetSignal === "string" ? parsed.budgetSignal : undefined,
        serviceType: typeof parsed.serviceType === "string" ? parsed.serviceType : undefined,
        timeline: typeof parsed.timeline === "string" ? parsed.timeline : undefined,
        contactCaptured: typeof parsed.contactCaptured === "boolean" ? parsed.contactCaptured : undefined,
        companySizeSignal: typeof parsed.companySizeSignal === "string" ? parsed.companySizeSignal : undefined,
        contactEmail: typeof parsed.contactEmail === "string" ? parsed.contactEmail : undefined,
        contactPhone: typeof parsed.contactPhone === "string" ? parsed.contactPhone : undefined,
        contactName: typeof parsed.contactName === "string" ? parsed.contactName : undefined,
        contactCompany: typeof parsed.contactCompany === "string" ? parsed.contactCompany : undefined,
      };
    } catch {
      // keep content as full response if JSON parse fails
    }
  }
  if (!content) content = "How can I help you today?";

  return { content, qualificationState };
}

export async function generateSummary(messages: { role: string; content: string }[]): Promise<string> {
  const text = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Summarize this sales chat in 5 bullet points for the sales team. End with one line: Next step: [suggestion].",
      },
      { role: "user", content: text },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content ?? "No summary.";
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WidgetConfigPublic } from "@leadbot/shared";

function isWithinBusinessHours(start: number | null, end: number | null): boolean {
  if (start == null || end == null) return true;
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  if (day === 0 || day === 6) return false; // weekend
  return hour >= start && hour < end;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: { widgetConfig: true },
  });
  if (!site?.widgetConfig) {
    return NextResponse.json({ error: "Site or config not found" }, { status: 404 });
  }

  const c = site.widgetConfig;
  const questions = Array.isArray(c.qualificationQuestions)
    ? (c.qualificationQuestions as { id: string; question: string; required: boolean }[])
    : [];

  const config: WidgetConfigPublic = {
    botName: c.botName,
    avatarUrl: c.avatarUrl,
    avatarEmoji: c.avatarEmoji ?? null,
    primaryColor: c.primaryColor,
    greetingText: c.greetingText,
    offlineMessage: c.offlineMessage,
    qualificationQuestions: questions,
    leadThreshold: c.leadThreshold,
    businessHoursStart: c.businessHoursStart,
    businessHoursEnd: c.businessHoursEnd,
    collectEmailPhoneFirst: c.collectEmailPhoneFirst,
    toneOfVoice: c.toneOfVoice ?? null,
    inputPlaceholder: c.inputPlaceholder ?? null,
    typingText: c.typingText ?? null,
    sendButtonLabel: c.sendButtonLabel ?? null,
    isWithinBusinessHours: isWithinBusinessHours(c.businessHoursStart, c.businessHoursEnd),
  };

  return NextResponse.json(config);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionSchema } from "@leadbot/shared";
import { getClientIp } from "@/lib/ip";
import { hashIp } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { siteId, visitorId, pageUrl, referrer, utm } = parsed.data;

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const ip = getClientIp(req.headers);
  const clientId = visitorId || ip || "anonymous";
  if (!checkRateLimit(siteId, clientId)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const ipHashVal = hashIp(ip);

  const session = await prisma.chatSession.create({
    data: {
      siteId,
      visitorId,
      pageUrl: pageUrl || null,
      referrer: referrer || null,
      utm: utm ?? undefined,
      userAgent,
      ipHash: ipHashVal,
    },
  });

  return NextResponse.json({ sessionId: session.id });
}

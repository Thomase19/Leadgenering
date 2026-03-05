import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { beaconSchema } from "@leadbot/shared";
import { checkBeaconRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = beaconSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { siteId, visitorId, path, referrer } = parsed.data;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
  });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  if (!checkBeaconRateLimit(siteId, visitorId)) {
    return NextResponse.json({ ok: true }); // 200 to avoid retries; we skip duplicate
  }

  await prisma.pageView.create({
    data: {
      siteId,
      visitorId,
      path: path.slice(0, 2000),
      referrer: referrer?.slice(0, 2000) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

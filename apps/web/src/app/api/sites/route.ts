import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantForUser } from "@/lib/tenancy";
import { createSiteSchema } from "@leadbot/shared";
import { createAuditLog } from "@/lib/tenancy";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sites = await prisma.site.findMany({
    where: { tenantId: ctx.tenantId },
    include: { widgetConfig: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sites);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.site.findUnique({
    where: { tenantId_domain: { tenantId: ctx.tenantId, domain: parsed.data.domain } },
  });
  if (existing) {
    return NextResponse.json({ error: "Site with this domain already exists" }, { status: 409 });
  }

  const site = await prisma.site.create({
    data: { tenantId: ctx.tenantId, domain: parsed.data.domain },
  });
  await prisma.widgetConfig.create({
    data: { siteId: site.id },
  });
  await createAuditLog(ctx.tenantId, "site.created", { siteId: site.id, domain: site.domain }, ctx.userId);
  return NextResponse.json(site);
}

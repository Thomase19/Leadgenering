import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { webhookUrlSchema } from "@leadbot/shared";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/tenancy";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = webhookUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  await prisma.crmConnection.upsert({
    where: { tenantId_provider: { tenantId: ctx.tenantId, provider: "WEBHOOK" } },
    create: {
      tenantId: ctx.tenantId,
      provider: "WEBHOOK",
      webhookUrl: parsed.data.webhookUrl,
    },
    update: { webhookUrl: parsed.data.webhookUrl },
  });
  await createAuditLog(
    ctx.tenantId,
    "integration.webhook.updated",
    { webhookUrl: parsed.data.webhookUrl ? "[set]" : "[cleared]" },
    ctx.userId
  );
  return NextResponse.json({ ok: true });
}

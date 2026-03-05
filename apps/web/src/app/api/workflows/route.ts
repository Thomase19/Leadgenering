import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { workflowCreateSchema } from "@leadbot/shared";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workflows = await prisma.workflow.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = workflowCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, trigger, enabled, actions } = parsed.data;
  const workflow = await prisma.workflow.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      trigger,
      enabled: enabled ?? true,
      actions: actions as object,
    },
  });
  return NextResponse.json(workflow);
}

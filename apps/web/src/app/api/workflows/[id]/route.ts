import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { workflowUpdateSchema } from "@leadbot/shared";

async function getWorkflowForUser(id: string, userId: string) {
  const ctx = await getTenantForUser(userId);
  if (!ctx) return null;
  const w = await prisma.workflow.findFirst({
    where: { id, tenantId: ctx.tenantId },
  });
  return w;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await getWorkflowForUser(id, session.user.id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = workflowUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: { name?: string; trigger?: string; enabled?: boolean; actions?: object } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.trigger !== undefined) data.trigger = parsed.data.trigger;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.actions !== undefined) data.actions = parsed.data.actions as object;

  const updated = await prisma.workflow.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await getWorkflowForUser(id, session.user.id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

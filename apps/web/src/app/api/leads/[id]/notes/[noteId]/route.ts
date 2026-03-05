import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";

async function getNoteForLeadAndTenant(noteId: string, leadId: string, tenantId: string) {
  return prisma.leadNote.findFirst({
    where: {
      id: noteId,
      leadId,
      lead: { site: { tenantId } },
    },
    include: { user: { select: { email: true } } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId, noteId } = await params;
  const existing = await getNoteForLeadAndTenant(noteId, leadId, ctx.tenantId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  const updated = await prisma.leadNote.update({
    where: { id: noteId },
    data: { content },
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    content: updated.content,
    createdAt: updated.createdAt,
    authorEmail: updated.user.email,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId, noteId } = await params;
  const existing = await getNoteForLeadAndTenant(noteId, leadId, ctx.tenantId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.leadNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}

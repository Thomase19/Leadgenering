import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";

async function getLeadForTenant(leadId: string, tenantId: string) {
  return prisma.lead.findFirst({
    where: { id: leadId, site: { tenantId } },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, site: { tenantId: ctx.tenantId } },
    include: {
      leadNotes: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      },
    },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    lead.leadNotes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
      authorEmail: n.user.email,
    }))
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const lead = await getLeadForTenant(leadId, ctx.tenantId);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  const note = await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadNotes: {
        create: { userId: ctx.userId, content },
      },
    },
    select: {
      leadNotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { user: { select: { email: true } } },
      },
    },
  });
  const created = note.leadNotes[0];
  if (!created) return NextResponse.json({ error: "Failed to create note" }, { status: 500 });

  return NextResponse.json({
    id: created.id,
    content: created.content,
    createdAt: created.createdAt,
    authorEmail: created.user.email,
  });
}

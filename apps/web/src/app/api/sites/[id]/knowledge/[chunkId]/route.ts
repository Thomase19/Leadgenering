import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: siteId, chunkId } = await params;
  const chunk = await prisma.knowledgeChunk.findFirst({
    where: { id: chunkId, siteId, site: { tenantId: ctx.tenantId } },
  });
  if (!chunk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.knowledgeChunk.delete({ where: { id: chunkId } });
  return NextResponse.json({ ok: true });
}

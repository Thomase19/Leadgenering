import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser, deleteLeadForTenant } from "@/lib/tenancy";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: leadId } = await params;
  const deleted = await deleteLeadForTenant(leadId, ctx.tenantId);
  if (!deleted)
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

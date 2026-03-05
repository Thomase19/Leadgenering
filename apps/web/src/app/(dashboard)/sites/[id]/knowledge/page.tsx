import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSiteForTenant } from "@/lib/tenancy";
import { KnowledgeForm } from "./KnowledgeForm";

export default async function SiteKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const site = await getSiteForTenant(id, session.user.tenantId);
  if (!site) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700">
          ← Sider
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-1">{site.domain}</h1>
        <p className="text-slate-600 text-sm mt-0.5">Viden / Knowledge base</p>
      </div>
      <KnowledgeForm siteId={site.id} />
    </div>
  );
}

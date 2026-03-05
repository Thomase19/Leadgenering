import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSiteForTenant } from "@/lib/tenancy";
import { ConfigForm } from "./ConfigForm";
import { SnippetBlock } from "./SnippetBlock";

export default async function SiteConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const site = await getSiteForTenant(id, session.user.tenantId);
  if (!site) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const snippetUrl = `${baseUrl}/widget/leadbot.js`;

  return (
    <div>
      <div className="mb-6">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700">
          ← Sider
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-1">{site.domain}</h1>
        <p className="text-slate-600 text-sm mt-0.5">Widget-konfiguration</p>
        <Link
          href={`/sites/${site.id}/knowledge`}
          className="text-sm text-blue-600 hover:underline mt-1 inline-block"
        >
          Viden →
        </Link>
      </div>

      <div className="grid gap-8">
        <ConfigForm site={site} config={site.widgetConfig} />
        <SnippetBlock siteId={site.id} snippetUrl={snippetUrl} baseUrl={baseUrl} />
      </div>
    </div>
  );
}

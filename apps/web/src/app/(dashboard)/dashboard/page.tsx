import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function daysAgo(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return startOfDay(out);
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;
  const now = new Date();
  const last30 = daysAgo(now, 30);

  const [
    sites,
    totalLeads,
    qualifiedLeads,
    leadsLast30,
    sessionsLast30,
    sessionsToday,
    pageViewsLast30,
    uniqueVisitorsLast30,
    recentLeads,
    recentSessions,
  ] = await Promise.all([
    prisma.site.findMany({
      where: { tenantId },
      include: { widgetConfig: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.count({ where: { site: { tenantId } } }),
    prisma.lead.count({
      where: { site: { tenantId }, qualified: true },
    }),
    prisma.lead.count({
      where: {
        site: { tenantId },
        createdAt: { gte: last30 },
      },
    }),
    prisma.chatSession.count({
      where: {
        site: { tenantId },
        startedAt: { gte: last30 },
      },
    }),
    prisma.chatSession.count({
      where: {
        site: { tenantId },
        startedAt: { gte: startOfDay(now) },
      },
    }),
    prisma.pageView.count({
      where: { site: { tenantId }, createdAt: { gte: last30 } },
    }),
    prisma.pageView.groupBy({
      by: ["visitorId"],
      where: { site: { tenantId }, createdAt: { gte: last30 } },
    }).then((r) => r.length),
    prisma.lead.findMany({
      where: { site: { tenantId } },
      include: { site: { select: { domain: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.chatSession.findMany({
      where: { site: { tenantId } },
      include: { site: { select: { domain: true } }, _count: { select: { messages: true } } },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  if (sites.length === 0) redirect("/onboarding");

  const qualifiedLast30 = await prisma.lead.count({
    where: {
      site: { tenantId },
      qualified: true,
      createdAt: { gte: last30 },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Forside</h1>
        <p className="text-slate-600 mt-1">Oversigt over dine sider og lead-aktivitet.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          href="/sites"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
        >
          <p className="text-sm font-medium text-slate-500">Sider</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{sites.length}</p>
          <p className="text-xs text-slate-400 mt-1">Widget aktiveret på {sites.filter((s) => s.widgetConfig).length} sider</p>
        </Link>
        <Link
          href="/leads"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
        >
          <p className="text-sm font-medium text-slate-500">Leads i alt</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalLeads}</p>
          <p className="text-xs text-emerald-600 mt-1">{qualifiedLeads} kvalificeret</p>
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500">Chats (sidste 30 dage)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{sessionsLast30}</p>
          <p className="text-xs text-slate-400 mt-1">{sessionsToday} i dag</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500">Nye leads (sidste 30 dage)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{leadsLast30}</p>
          <p className="text-xs text-emerald-600 mt-1">{qualifiedLast30} kvalificeret</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-500">Sidevisninger (30 dage)</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pageViewsLast30}</p>
          <p className="text-xs text-slate-400 mt-1">{uniqueVisitorsLast30} unikke besøgende</p>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Seneste leads</h2>
            <Link href="/leads" className="text-sm text-blue-600 hover:underline">
              Se alle
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentLeads.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">Ingen leads endnu.</li>
            ) : (
              recentLeads.map((lead) => (
                <li key={lead.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {lead.name || lead.email || "Ukendt"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {lead.site.domain}
                      {lead.qualified && (
                        <span className="ml-1 text-emerald-600">· Kvalificeret</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href="/leads"
                    className="text-sm text-blue-600 hover:underline shrink-0"
                  >
                    Åbn
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Seneste sessioner</h2>
            <Link href="/sessions" className="text-sm text-blue-600 hover:underline">
              Se alle
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentSessions.length === 0 ? (
              <li className="px-4 py-6 text-sm text-slate-500">Ingen chat-sessioner endnu.</li>
            ) : (
              recentSessions.map((s) => (
                <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.site.domain}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s._count.messages} beskeder · {s.status === "QUALIFIED" ? "Kvalificeret" : s.status}
                    </p>
                  </div>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="text-sm text-blue-600 hover:underline shrink-0"
                  >
                    Åbn
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sites/new"
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Tilføj side
        </Link>
        <Link
          href="/leads"
          className="rounded-lg border border-slate-300 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Leads
        </Link>
        <Link
          href="/analytics"
          className="rounded-lg border border-slate-300 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Rapporter
        </Link>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { AnalyticsKPIs } from "./AnalyticsKPIs";
import { SiteVisitorChart } from "./SiteVisitorChart";
import { FunnelAndScore } from "./FunnelAndScore";
import { BySiteTable } from "./BySiteTable";
import { AnalyticsDateFilter } from "./AnalyticsDateFilter";

const MS_PER_DAY = 86400000;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(str: string): Date {
  const d = new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function lastDayOfMonth(y: number, m: number): Date {
  return new Date(y, m, 0);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | null>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const params = await searchParams;
  const tenantId = session.user.tenantId;
  const now = new Date();
  const todayStart = startOfDay(now);

  // Resolve date range: drill (single month) or from/to or range preset
  const drill = params.drill ?? null; // YYYY-MM
  const rangeParam = params.range ?? null;
  const fromParam = params.from ?? null;
  const toParam = params.to ?? null;

  let from: Date;
  let to: Date;
  let isDrillView = false;

  if (drill) {
    const [y, m] = drill.split("-").map(Number);
    from = startOfDay(new Date(y, m - 1, 1));
    to = endOfDay(lastDayOfMonth(y, m));
    isDrillView = true;
  } else if (fromParam && toParam) {
    from = startOfDay(parseDate(fromParam));
    to = endOfDay(parseDate(toParam));
  } else {
    const days = rangeParam === "90" ? 90 : rangeParam === "30" ? 30 : 7;
    to = endOfDay(new Date(todayStart));
    from = new Date(todayStart);
    from.setDate(from.getDate() - days);
    from = startOfDay(from);
  }

  const periodDays = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
  const useMonthlyChart = periodDays > 31 && !isDrillView;
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - periodDays);
  const prevTo = new Date(from);
  prevTo.setMilliseconds(prevTo.getMilliseconds() - 1);

  const [sessionsRaw, leadsRaw, pageViewsRaw, sites] = await Promise.all([
    prisma.chatSession.findMany({
      where: {
        site: { tenantId },
        startedAt: { gte: prevFrom, lte: to },
      },
      select: {
        id: true,
        startedAt: true,
        siteId: true,
        status: true,
        score: true,
      },
    }),
    prisma.lead.findMany({
      where: {
        site: { tenantId },
        createdAt: { gte: prevFrom, lte: to },
      },
      select: { id: true, createdAt: true, siteId: true, qualified: true },
    }),
    prisma.pageView.findMany({
      where: {
        site: { tenantId },
        createdAt: { gte: prevFrom, lte: to },
      },
      select: { createdAt: true, visitorId: true },
    }),
    prisma.site.findMany({
      where: { tenantId },
      select: { id: true, domain: true },
    }),
  ]);

  const periodStart = from.getTime();
  const periodEnd = to.getTime() + 1;
  const sessionsInPeriod = sessionsRaw.filter(
    (s) => s.startedAt.getTime() >= periodStart && s.startedAt.getTime() < periodEnd
  );
  const leadsInPeriod = leadsRaw.filter(
    (l) => l.createdAt.getTime() >= periodStart && l.createdAt.getTime() < periodEnd
  );
  const prevStart = prevFrom.getTime();
  const sessionsPrev = sessionsRaw.filter(
    (s) => s.startedAt.getTime() >= prevStart && s.startedAt.getTime() < periodStart
  );
  const leadsPrev = leadsRaw.filter(
    (l) => l.createdAt.getTime() >= prevStart && l.createdAt.getTime() < periodStart
  );

  const sessionsToday = sessionsRaw.filter(
    (s) => s.startedAt.getTime() >= todayStart.getTime()
  ).length;
  const qualifiedToday = leadsRaw.filter(
    (l) => l.qualified && l.createdAt.getTime() >= todayStart.getTime()
  ).length;

  const qualRate =
    sessionsInPeriod.length > 0
      ? Math.round(
          (sessionsInPeriod.filter((s) => s.status === "QUALIFIED").length /
            sessionsInPeriod.length) *
            100
        )
      : 0;
  const qualRatePrev =
    sessionsPrev.length > 0
      ? Math.round(
          (sessionsPrev.filter((s) => s.status === "QUALIFIED").length /
            sessionsPrev.length) *
            100
        )
      : 0;
  const avgScore =
    sessionsInPeriod.length > 0
      ? Math.round(
          sessionsInPeriod.reduce((a, s) => a + s.score, 0) /
            sessionsInPeriod.length
        )
      : 0;
  const avgScorePrev =
    sessionsPrev.length > 0
      ? Math.round(
          sessionsPrev.reduce((a, s) => a + s.score, 0) / sessionsPrev.length
        )
      : 0;

  const trend = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const kpis = {
    sessionsToday,
    sessionsInPeriod: sessionsInPeriod.length,
    sessionsPrev: sessionsPrev.length,
    qualifiedToday,
    qualifiedInPeriod: leadsInPeriod.filter((l) => l.qualified).length,
    qualifiedPrev: leadsPrev.filter((l) => l.qualified).length,
    leadsInPeriod: leadsInPeriod.length,
    leadsPrev: leadsPrev.length,
    qualRate,
    qualRatePrev,
    avgScore,
    avgScorePrev,
    trendSessions: trend(sessionsInPeriod.length, sessionsPrev.length),
    trendLeads: trend(leadsInPeriod.length, leadsPrev.length),
    trendQualRate: qualRatePrev === 0 ? (qualRate > 0 ? 100 : 0) : qualRate - qualRatePrev,
    trendAvgScore: avgScorePrev === 0 ? (avgScore > 0 ? 100 : 0) : avgScore - avgScorePrev,
  };

  // Chart data: daily or monthly
  let chartData:
    | {
        mode: "daily";
        labels: string[];
        sessions: number[];
        leads: number[];
        drillMonth?: string;
        backToFrom?: string;
        backToTo?: string;
        backToRange?: string;
      }
    | {
        mode: "monthly";
        labels: string[];
        sessions: number[];
        leads: number[];
        monthKeys: string[];
      };

  if (useMonthlyChart) {
    const monthMap = new Map<string, { sessions: number; leads: number }>();
    for (const s of sessionsRaw) {
      if (s.startedAt.getTime() < periodStart || s.startedAt.getTime() >= periodEnd) continue;
      const key = `${s.startedAt.getFullYear()}-${String(s.startedAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { sessions: 0, leads: 0 });
      monthMap.get(key)!.sessions++;
    }
    for (const l of leadsRaw) {
      if (l.createdAt.getTime() < periodStart || l.createdAt.getTime() >= periodEnd) continue;
      const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { sessions: 0, leads: 0 });
      monthMap.get(key)!.leads++;
    }
    const sortedMonths = Array.from(monthMap.entries()).sort(
      (a, b) => a[0].localeCompare(b[0])
    );
    chartData = {
      mode: "monthly",
      labels: sortedMonths.map(([k]) => {
        const [y, m] = k.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("da-DK", {
          month: "short",
          year: "numeric",
        });
      }),
      sessions: sortedMonths.map(([, v]) => v.sessions),
      leads: sortedMonths.map(([, v]) => v.leads),
      monthKeys: sortedMonths.map(([k]) => k),
    };
  } else {
    const labels: string[] = [];
    const sessions: number[] = [];
    const leads: number[] = [];
    const d = new Date(from);
    const pad = (n: number) => String(n).padStart(2, "0");
    while (d.getTime() <= to.getTime()) {
      const start = startOfDay(d).getTime();
      const end = start + MS_PER_DAY;
      labels.push(
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
      );
      sessions.push(
        sessionsRaw.filter(
          (s) => s.startedAt.getTime() >= start && s.startedAt.getTime() < end
        ).length
      );
      leads.push(
        leadsRaw.filter(
          (l) => l.createdAt.getTime() >= start && l.createdAt.getTime() < end
        ).length
      );
      d.setDate(d.getDate() + 1);
    }
    chartData = {
      mode: "daily",
      labels,
      sessions,
      leads,
    };
    if (isDrillView && drill) {
      chartData.drillMonth = drill;
      const backRange = params.backRange ?? (periodDays > 31 ? "90" : "30");
      chartData.backToRange = backRange;
    }
  }

  // Site visitor chart: same buckets as main chart (daily or monthly)
  let visitorChartData: { labels: string[]; pageViews: number[]; uniqueVisitors: number[] };
  if (useMonthlyChart) {
    const monthMap = new Map<string, { pv: number; visitors: Set<string> }>();
    for (const pv of pageViewsRaw) {
      if (pv.createdAt.getTime() < periodStart || pv.createdAt.getTime() >= periodEnd) continue;
      const key = `${pv.createdAt.getFullYear()}-${String(pv.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { pv: 0, visitors: new Set() });
      const entry = monthMap.get(key)!;
      entry.pv++;
      entry.visitors.add(pv.visitorId);
    }
    const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    visitorChartData = {
      labels: sortedMonths.map(([k]) => {
        const [y, m] = k.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("da-DK", {
          month: "short",
          year: "numeric",
        });
      }),
      pageViews: sortedMonths.map(([, v]) => v.pv),
      uniqueVisitors: sortedMonths.map(([, v]) => v.visitors.size),
    };
  } else {
    const labels: string[] = [];
    const pageViews: number[] = [];
    const uniqueVisitors: number[] = [];
    const d = new Date(from);
    const pad = (n: number) => String(n).padStart(2, "0");
    while (d.getTime() <= to.getTime()) {
      const start = startOfDay(d).getTime();
      const end = start + MS_PER_DAY;
      const dayPv = pageViewsRaw.filter(
        (p) => p.createdAt.getTime() >= start && p.createdAt.getTime() < end
      );
      const visitors = new Set(dayPv.map((p) => p.visitorId));
      labels.push(
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
      );
      pageViews.push(dayPv.length);
      uniqueVisitors.push(visitors.size);
      d.setDate(d.getDate() + 1);
    }
    visitorChartData = { labels, pageViews, uniqueVisitors };
  }

  const bySite = sites.map((site) => {
    const sSessions = sessionsInPeriod.filter((s) => s.siteId === site.id);
    const sLeads = leadsInPeriod.filter((l) => l.siteId === site.id);
    const sQual = sSessions.filter((s) => s.status === "QUALIFIED").length;
    const rate =
      sSessions.length > 0
        ? Math.round((sQual / sSessions.length) * 100)
        : 0;
    return {
      domain: site.domain,
      siteId: site.id,
      sessions: sSessions.length,
      leads: sLeads.length,
      qualificationRate: rate,
    };
  });

  const buckets = [0, 0, 0, 0];
  for (const s of sessionsInPeriod) {
    if (s.score < 25) buckets[0]++;
    else if (s.score < 50) buckets[1]++;
    else if (s.score < 75) buckets[2]++;
    else buckets[3]++;
  }
  const maxBucket = Math.max(1, ...buckets);

  const periodLabel = isDrillView
    ? from.toLocaleDateString("da-DK", { month: "long", year: "numeric" })
    : `${from.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })} – ${to.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Rapporter
            </h1>
            <p className="mt-1 text-slate-500 text-sm">
              {isDrillView
                ? `Detalje: ${periodLabel}`
                : `Nøgletal og tendenser · ${periodLabel}`}
            </p>
          </div>
          <AnalyticsDateFilter />
        </div>
        <p className="text-xs text-slate-400">{periodLabel}</p>
      </div>

      <AnalyticsKPIs kpis={kpis} />

      <AnalyticsCharts
        chartData={chartData}
        isDrillView={isDrillView}
        periodLabel={periodLabel}
      />

      <SiteVisitorChart
        visitorChartData={visitorChartData}
        isDrillView={isDrillView}
        periodLabel={periodLabel}
      />

      <FunnelAndScore
        sessionsInPeriod={sessionsInPeriod.length}
        qualifiedInPeriod={sessionsInPeriod.filter((s) => s.status === "QUALIFIED").length}
        leadsInPeriod={leadsInPeriod.length}
        qualRate={kpis.qualRate}
        avgScore={kpis.avgScore}
        scoreBuckets={buckets}
        maxBucket={maxBucket}
      />

      <BySiteTable rows={bySite} periodLabel={periodLabel} />
    </div>
  );
}

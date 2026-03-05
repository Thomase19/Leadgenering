import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MonthChartView } from "./MonthChartView";

const MS_PER_DAY = 86400000;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function lastDayOfMonth(y: number, m: number): Date {
  return new Date(y, m, 0);
}

export default async function AnalyticsMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ monthKey: string }>;
  searchParams: Promise<Record<string, string | null>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const { monthKey } = await params;
  const sp = await searchParams;
  const chartFilter = sp.chart === "chats" || sp.chart === "leads" ? sp.chart : null;

  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) notFound();
  const [, yStr, mStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  if (m < 1 || m > 12) notFound();

  const from = startOfDay(new Date(y, m - 1, 1));
  const to = lastDayOfMonth(y, m);

  const [sessionsRaw, leadsRaw] = await Promise.all([
    prisma.chatSession.findMany({
      where: {
        site: { tenantId: session.user.tenantId },
        startedAt: { gte: from, lte: to },
      },
      select: { startedAt: true },
    }),
    prisma.lead.findMany({
      where: {
        site: { tenantId: session.user.tenantId },
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true },
    }),
  ]);

  const labels: string[] = [];
  const dateLabels: string[] = [];
  const sessionsByDay: number[] = [];
  const leadsByDay: number[] = [];
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(from);
  while (d.getTime() <= to.getTime()) {
    const start = startOfDay(d).getTime();
    const end = start + MS_PER_DAY;
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
    labels.push(dateStr);
    dateLabels.push(dateStr);
    sessionsByDay.push(
      sessionsRaw.filter(
        (s) => s.startedAt.getTime() >= start && s.startedAt.getTime() < end
      ).length
    );
    leadsByDay.push(
      leadsRaw.filter(
        (l) => l.createdAt.getTime() >= start && l.createdAt.getTime() < end
      ).length
    );
    d.setDate(d.getDate() + 1);
  }

  const title = from.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <MonthChartView
        title={title}
        labels={labels}
        dateLabels={dateLabels}
        sessionsByDay={sessionsByDay}
        leadsByDay={leadsByDay}
        chartFilter={chartFilter}
      />
    </div>
  );
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-400 text-xs">—</span>;
  const up = value > 0;
  return (
    <span
      className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}
    >
      {up ? "↑" : "↓"} {Math.abs(value)}% vs forrige periode
    </span>
  );
}

export function AnalyticsKPIs({
  kpis,
}: {
  kpis: {
    sessionsToday: number;
    sessionsInPeriod: number;
    qualifiedToday: number;
    qualifiedInPeriod: number;
    leadsInPeriod: number;
    qualRate: number;
    avgScore: number;
    trendSessions: number;
    trendLeads: number;
    trendQualRate: number;
    trendAvgScore: number;
  };
}) {
  const cards = [
    {
      label: "Chats – I dag",
      value: kpis.sessionsToday,
      accent: "primary",
      trend: null,
    },
    {
      label: "Chats (periode)",
      value: kpis.sessionsInPeriod,
      accent: "primary",
      trend: kpis.trendSessions,
    },
    {
      label: "Kvalificerede leads – I dag",
      value: kpis.qualifiedToday,
      accent: "emerald",
      trend: null,
    },
    {
      label: "Kvalificerede leads (periode)",
      value: kpis.qualifiedInPeriod,
      accent: "emerald",
      trend: kpis.trendLeads,
    },
    {
      label: "Kvalifikationsscore",
      value: `${kpis.qualRate}%`,
      accent: "slate",
      trend: kpis.trendQualRate,
    },
    {
      label: "GNS. lead-score",
      value: kpis.avgScore,
      suffix: " / 100",
      accent: "slate",
      trend: kpis.trendAvgScore,
    },
  ];

  const accentBorder = (accent: string) => {
    switch (accent) {
      case "primary":
        return "border-l-primary-500";
      case "emerald":
        return "border-l-emerald-500";
      default:
        return "border-l-slate-400";
    }
  };

  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Nøgletal
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-white rounded-2xl border border-slate-200/80 border-l-4 ${accentBorder(c.accent)} shadow-sm p-4 hover:shadow-md transition-shadow`}
          >
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {c.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {c.value}
              {c.suffix ?? ""}
            </p>
            {c.trend !== null && (
              <div className="mt-2">
                <Trend value={c.trend} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

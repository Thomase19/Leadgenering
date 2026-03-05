export function FunnelAndScore({
  sessionsInPeriod,
  qualifiedInPeriod,
  leadsInPeriod,
  qualRate,
  avgScore,
  scoreBuckets,
  maxBucket,
}: {
  sessionsInPeriod: number;
  qualifiedInPeriod: number;
  leadsInPeriod: number;
  qualRate: number;
  avgScore: number;
  scoreBuckets: number[];
  maxBucket: number;
}) {
  const funnelSteps = [
    { label: "Chat-sessioner", value: sessionsInPeriod, width: 100 },
    {
      label: "Kvalificeret",
      value: qualifiedInPeriod,
      width: sessionsInPeriod > 0 ? (qualifiedInPeriod / sessionsInPeriod) * 100 : 0,
    },
    {
      label: "Leads indsamlet",
      value: leadsInPeriod,
      width: sessionsInPeriod > 0 ? (leadsInPeriod / sessionsInPeriod) * 100 : 0,
    },
  ];

  const bucketLabels = ["0–25", "25–50", "50–75", "75–100"];

  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Sessioner og scorefordeling
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Sessioner (7 dage)
          </p>
          <div className="space-y-4">
            {funnelSteps.map((step, i) => (
              <div key={step.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{step.label}</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {step.value}
                    {i === 1 && sessionsInPeriod > 0 && (
                      <span className="text-slate-400 font-normal">
                        {" "}
                        ({qualRate}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${step.width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Lead-scorefordeling (7 dage)
          </p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mb-4">
            GNS.: {avgScore}
            <span className="text-slate-400 text-lg font-normal"> / 100</span>
          </p>
          <div className="space-y-3">
            {scoreBuckets.map((count, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-12 tabular-nums">
                  {bucketLabels[i]}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${maxBucket > 0 ? (count / maxBucket) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 w-6 tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

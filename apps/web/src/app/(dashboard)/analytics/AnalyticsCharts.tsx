"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type ChartDataDaily = {
  mode: "daily";
  labels: string[];
  sessions: number[];
  leads: number[];
  drillMonth?: string;
  backToRange?: string;
};

type ChartDataMonthly = {
  mode: "monthly";
  labels: string[];
  sessions: number[];
  leads: number[];
  monthKeys: string[];
};

function BarChartWithTooltip({
  label,
  labels,
  values,
  color,
  maxValue,
  onBarClick,
  clickable,
  large,
  chartType,
}: {
  label: string;
  labels: string[];
  values: number[];
  color: string;
  maxValue: number;
  onBarClick?: (index: number, chartType: "chats" | "leads") => void;
  clickable?: boolean;
  large?: boolean;
  chartType?: "chats" | "leads";
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const barHeightPx = large ? 200 : 128;
  const chartHeight = large ? "h-56" : "h-36";
  const scale = maxValue > 0 ? barHeightPx / maxValue : 0;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hoverIndex === null) return;
    const el = containerRef.current?.querySelector(`[data-bar-index="${hoverIndex}"]`);
    if (!el) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setTooltipPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 6,
    });
  }, [hoverIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 ${large ? "p-8" : ""}`}
    >
      <p className={`font-semibold text-slate-400 uppercase tracking-wider mb-4 ${large ? "text-sm" : "text-xs"}`}>
        {label}
      </p>
      <div className={`flex items-end gap-2 ${chartHeight}`}>
        {values.map((v, i) => (
          <div
            key={i}
            data-bar-index={i}
            className="flex-1 flex flex-col items-center gap-2 min-w-0 group"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => clickable && chartType && onBarClick?.(i, chartType)}
          >
            <div className="w-full flex-1 flex flex-col justify-end min-h-0">
              <div
                className={`w-full rounded-t ${color} transition-all duration-500 ${
                  clickable ? "cursor-pointer hover:opacity-90" : ""
                }`}
                style={{
                  height: `${Math.max(v * scale, v > 0 ? 4 : 0)}px`,
                }}
              />
            </div>
            <span className={`font-medium text-slate-400 truncate w-full text-center ${large ? "text-xs" : "text-[10px]"}`}>
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      {hoverIndex !== null && (
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="rounded-lg bg-slate-800 px-2 py-1.5 text-white text-xs font-medium shadow-lg whitespace-nowrap">
            {labels[hoverIndex]}: <strong>{values[hoverIndex]}</strong>
          </div>
        </div>
      )}
      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  );
}

function getMonthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function AnalyticsCharts({
  chartData,
  isDrillView,
  periodLabel,
}: {
  chartData: ChartDataDaily | ChartDataMonthly;
  isDrillView: boolean;
  periodLabel: string;
}) {
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") ?? "90";

  const handleMonthClick = (index: number, chartType: "chats" | "leads") => {
    if (chartData.mode !== "monthly") return;
    const monthKey = chartData.monthKeys[index];
    window.open(
      `/analytics/month/${monthKey}?chart=${chartType}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleBackToMonthly = () => {
    const params = new URLSearchParams();
    params.set("range", chartData.backToRange ?? "90");
    // Prefer opening in same tab when we're in a drill tab; user can close this tab
    window.location.href = `/analytics?${params.toString()}`;
  };

  const maxSessions = Math.max(1, ...chartData.sessions);
  const maxLeads = Math.max(1, ...chartData.leads);

  const sectionTitle =
    chartData.mode === "monthly"
      ? "Over tid (pr. måned)"
      : isDrillView
        ? `Daglig opdeling: ${periodLabel}`
        : "Periode";

  const chartGridClass = isDrillView
    ? "grid grid-cols-1 gap-6"
    : "grid grid-cols-1 lg:grid-cols-2 gap-4";

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className={`font-semibold text-slate-400 uppercase tracking-wider ${isDrillView ? "text-sm" : "text-xs"}`}>
          {sectionTitle}
        </h2>
        {isDrillView && chartData.mode === "daily" && chartData.backToRange && (
          <button
            type="button"
            onClick={handleBackToMonthly}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Tilbage til månedsvisning
          </button>
        )}
      </div>
      <div className={chartGridClass}>
        <BarChartWithTooltip
          label="Chats"
          labels={chartData.labels}
          values={chartData.sessions}
          color="bg-primary-500"
          maxValue={maxSessions}
          onBarClick={chartData.mode === "monthly" ? handleMonthClick : undefined}
          clickable={chartData.mode === "monthly"}
          large={isDrillView}
          chartType="chats"
        />
        <BarChartWithTooltip
          label="Leads"
          labels={chartData.labels}
          values={chartData.leads}
          color="bg-emerald-500"
          maxValue={maxLeads}
          onBarClick={chartData.mode === "monthly" ? handleMonthClick : undefined}
          clickable={chartData.mode === "monthly"}
          large={isDrillView}
          chartType="leads"
        />
      </div>
    </section>
  );
}

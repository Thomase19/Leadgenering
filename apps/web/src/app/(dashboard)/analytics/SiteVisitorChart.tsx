"use client";

import { useState, useRef, useEffect } from "react";

type VisitorChartData = {
  labels: string[];
  pageViews: number[];
  uniqueVisitors: number[];
};

function BarChart({
  label,
  labels,
  values,
  color,
  maxValue,
  large,
}: {
  label: string;
  labels: string[];
  values: number[];
  color: string;
  maxValue: number;
  large?: boolean;
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
    if (!el || !containerRef.current) return;
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
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
            className="flex-1 flex flex-col items-center gap-2 min-w-0"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div className="w-full flex-1 flex flex-col justify-end min-h-0">
              <div
                className={`w-full rounded-t ${color} transition-all duration-500`}
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

export function SiteVisitorChart({
  visitorChartData,
  isDrillView,
  periodLabel,
}: {
  visitorChartData: VisitorChartData;
  isDrillView: boolean;
  periodLabel: string;
}) {
  const { labels, pageViews, uniqueVisitors } = visitorChartData;
  const maxPageViews = Math.max(1, ...pageViews);
  const maxVisitors = Math.max(1, ...uniqueVisitors);

  const sectionTitle = isDrillView
    ? `Trafik: ${periodLabel}`
    : "Trafik (Sidebesøg)";

  const chartGridClass = isDrillView
    ? "grid grid-cols-1 gap-6"
    : "grid grid-cols-1 lg:grid-cols-2 gap-4";

  return (
    <section>
      <h2 className="font-semibold text-slate-400 uppercase tracking-wider text-xs mb-4">
        {sectionTitle}
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Unikke besøgende og sidevisninger fra sider hvor widgeten er indlæst (alle besøgende, ikke kun chat).
      </p>
      <div className={chartGridClass}>
        <BarChart
          label="Unikke besøgende"
          labels={labels}
          values={uniqueVisitors}
          color="bg-violet-500"
          maxValue={maxVisitors}
          large={isDrillView}
        />
        <BarChart
          label="Sidevisninger"
          labels={labels}
          values={pageViews}
          color="bg-amber-500"
          maxValue={maxPageViews}
          large={isDrillView}
        />
      </div>
    </section>
  );
}

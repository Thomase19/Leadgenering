"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// Show day label only for 1, 5, 10, 15, 20, 25, and last day to reduce clutter
function shouldShowDayLabel(dayIndex: number, totalDays: number): boolean {
  const day = dayIndex + 1;
  if (day === 1 || day === totalDays) return true;
  if (day % 5 === 0) return true;
  return false;
}

function BarChartWithTooltip({
  label,
  labels,
  dateLabels,
  values,
  color,
  maxValue,
  totalSummary,
}: {
  label: string;
  labels: string[];
  dateLabels: string[];
  values: number[];
  color: string;
  maxValue: number;
  totalSummary: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const barHeightPx = 180;
  const scale = maxValue > 0 ? barHeightPx / maxValue : 0;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hoverIndex === null) return;
    const el = containerRef.current?.querySelector(
      `[data-bar-index="${hoverIndex}"]`
    );
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
      className="relative bg-white rounded-xl border border-slate-200/60 shadow-sm p-6"
    >
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-sm text-slate-400">
          I alt: <span className="font-medium text-slate-700">{totalSummary}</span>
        </p>
      </div>
      <div className="flex items-end gap-1 h-52">
        {values.map((v, i) => (
          <div
            key={i}
            data-bar-index={i}
            className="flex-1 min-w-0 flex flex-col items-center gap-1.5"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div className="w-full flex-1 flex flex-col justify-end min-h-0">
              <div
                className={`w-full rounded-sm ${color} transition-all duration-200`}
                style={{
                  height: `${Math.max(v * scale, v > 0 ? 3 : 0)}px`,
                }}
              />
            </div>
            {shouldShowDayLabel(i, labels.length) ? (
              <span className="text-[10px] text-slate-400 tabular-nums">
                {labels[i]}
              </span>
            ) : (
              <span className="text-[10px] text-transparent select-none" aria-hidden>
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
      {hoverIndex !== null && (
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="rounded-md bg-slate-800 px-2 py-1 text-white text-xs font-medium shadow-lg whitespace-nowrap">
            {dateLabels[hoverIndex]}: <strong>{values[hoverIndex]}</strong>
          </div>
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  );
}

export function MonthChartView({
  title,
  labels,
  dateLabels,
  sessionsByDay,
  leadsByDay,
  chartFilter,
}: {
  title: string;
  labels: string[];
  dateLabels: string[];
  sessionsByDay: number[];
  leadsByDay: number[];
  chartFilter: "chats" | "leads" | null;
}) {
  const maxSessions = Math.max(1, ...sessionsByDay);
  const maxLeads = Math.max(1, ...leadsByDay);
  const totalSessions = sessionsByDay.reduce((a, b) => a + b, 0);
  const totalLeads = leadsByDay.reduce((a, b) => a + b, 0);

  const showChats = chartFilter === null || chartFilter === "chats";
  const showLeads = chartFilter === null || chartFilter === "leads";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <Link
          href="/analytics"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Tilbage til Rapporter
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {showChats && (
          <BarChartWithTooltip
            label="Chats pr. dag"
            labels={labels}
            dateLabels={dateLabels}
            values={sessionsByDay}
            color="bg-primary-500"
            maxValue={maxSessions}
            totalSummary={totalSessions}
          />
        )}
        {showLeads && (
          <BarChartWithTooltip
            label="Leads pr. dag"
            labels={labels}
            dateLabels={dateLabels}
            values={leadsByDay}
            color="bg-emerald-500"
            maxValue={maxLeads}
            totalSummary={totalLeads}
          />
        )}
      </div>
    </div>
  );
}

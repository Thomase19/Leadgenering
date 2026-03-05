"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

const PRESETS = [
  { label: "7 dage", range: 7 },
  { label: "30 dage", range: 30 },
  { label: "90 dage", range: 90 },
] as const;

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") ?? (searchParams.get("from") == null && searchParams.get("to") == null ? "7" : null);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const setRange = useCallback(
    (days: number) => {
      const to = new Date();
      to.setHours(0, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - days);
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", toYYYYMMDD(from));
      params.set("to", toYYYYMMDD(to));
      params.set("range", String(days));
      params.delete("drill");
      router.push(`/analytics?${params.toString()}`);
    },
    [router, searchParams]
  );

  const setCustom = useCallback(
    (from: string, to: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", from);
      params.set("to", to);
      params.delete("range");
      params.delete("drill");
      router.push(`/analytics?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500 mr-1">Periode:</span>
      {PRESETS.map(({ label, range }) => (
        <button
          key={range}
          type="button"
          onClick={() => setRange(range)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            currentRange === String(range)
              ? "bg-primary-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
      <CustomRangePicker
        currentFrom={fromParam ?? undefined}
        currentTo={toParam ?? undefined}
        currentRange={currentRange ?? undefined}
        onApply={setCustom}
      />
    </div>
  );
}

function CustomRangePicker({
  currentFrom,
  currentTo,
  currentRange,
  onApply,
}: {
  currentFrom?: string;
  currentTo?: string;
  currentRange?: string;
  onApply: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(currentFrom ?? "");
  const [to, setTo] = useState(currentTo ?? "");

  const isCustom = currentFrom != null && currentTo != null && !PRESETS.some((p) => String(p.range) === currentRange);
  useEffect(() => {
    if (currentFrom) setFrom(currentFrom);
    if (currentTo) setTo(currentTo);
  }, [currentFrom, currentTo]);

  const handleApply = () => {
    if (from && to) onApply(from, to);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isCustom ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        Tilpasset
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <p className="text-xs font-medium text-slate-500 mb-2">Fra – Til</p>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={handleApply}
              className="w-full rounded-lg bg-primary-500 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              Anvend
            </button>
          </div>
        </>
      )}
    </div>
  );
}

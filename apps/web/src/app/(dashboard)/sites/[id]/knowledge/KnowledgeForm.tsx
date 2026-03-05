"use client";

import { useState, useEffect, useCallback } from "react";

type Chunk = {
  id: string;
  source: string;
  content: string;
  metadata: unknown;
  createdAt: string;
};

type Props = { siteId: string };

export function KnowledgeForm({ siteId }: Props) {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchChunks = useCallback(async () => {
    const res = await fetch(`/api/sites/${siteId}/knowledge`);
    if (res.ok) {
      const data = await res.json();
      setChunks(data);
    }
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    fetchChunks();
  }, [fetchChunks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const body = mode === "url" ? { type: "url", url: url.trim() } : { type: "text", content: text.trim() };
      const res = await fetch(`/api/sites/${siteId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Der opstod en fejl");
        return;
      }
      setSuccess(true);
      setText("");
      setUrl("");
      fetchChunks();
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(chunkId: string) {
    if (!confirm("Slet dette videnstykke?")) return;
    const res = await fetch(`/api/sites/${siteId}/knowledge/${chunkId}`, { method: "DELETE" });
    if (res.ok) fetchChunks();
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Tilføj viden</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`text-sm font-medium ${mode === "text" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              Tekst
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`text-sm font-medium ${mode === "url" ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              URL
            </button>
          </div>
          {mode === "text" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Indsæt tekst fra din hjemmeside, FAQ, produkter osv. Teksten bliver opdelt og indekseret til chatboten."
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://eksempel.dk/side"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Viden tilføjet.</p>}
          <button
            type="submit"
            disabled={submitting || (mode === "text" ? !text.trim() : !url.trim())}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Tilføjer…" : "Tilføj"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Eksisterende viden ({chunks.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Henter…</p>
        ) : chunks.length === 0 ? (
          <p className="text-sm text-slate-500">Ingen viden endnu. Tilføj tekst eller en URL ovenfor.</p>
        ) : (
          <ul className="space-y-3">
            {chunks.map((c) => (
              <li
                key={c.id}
                className="border border-slate-200 rounded-lg p-3 flex justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-500 uppercase">{c.source}</span>
                  <p className="text-sm text-slate-800 mt-0.5 line-clamp-2">{c.content}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(c.createdAt).toLocaleString("da-DK")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 text-sm text-red-600 hover:underline"
                >
                  Slet
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

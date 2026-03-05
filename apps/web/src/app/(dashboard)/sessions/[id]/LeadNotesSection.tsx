"use client";

import { useState, useEffect, useCallback } from "react";

type Note = {
  id: string;
  content: string;
  createdAt: string;
  authorEmail: string;
};

export function LeadNotesSection({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}/notes`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Kunne ikke tilføje note");
        return;
      }
      const newNote = await res.json();
      setNotes((prev) => [newNote, ...prev]);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(n: Note) {
    setEditingId(n.id);
    setEditContent(n.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(noteId: string) {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setSavingId(noteId);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Kunne ikke gemme");
        return;
      }
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
      setEditContent("");
      setError(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm("Slet denne note?")) return;
    setDeletingId(noteId);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes/${noteId}`, { method: "DELETE" });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      <h2 className="font-semibold text-slate-800 mb-2">Noter (log)</h2>
      <p className="text-sm text-slate-500 mb-4">
        Tilføj noter så andre sælgere kan se hvad der er sket (f.eks. &quot;Kunden tog ikke telefonen, prøver igen i morgen&quot;).
      </p>

      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Skriv en note..."
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="mt-2 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Tilføjer…" : "Tilføj note"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Henter noter…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-500">Ingen noter endnu.</p>
      ) : (
        <ul className="space-y-3 border-t border-slate-100 pt-4">
          {notes.map((n) => (
            <li key={n.id} className="text-sm border border-slate-100 rounded-lg p-3">
              {editingId === n.id ? (
                <>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(n.id)}
                      disabled={savingId === n.id || !editContent.trim()}
                      className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingId === n.id ? "Gemmer…" : "Gem"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={!!savingId}
                      className="rounded-lg border border-slate-300 text-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      Annuller
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-800 whitespace-pre-wrap">{n.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-slate-500 text-xs">
                      {n.authorEmail} · {new Date(n.createdAt).toLocaleString("da-DK")}
                    </p>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(n)}
                        className="text-slate-500 hover:text-blue-600 text-xs font-medium"
                      >
                        Rediger
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        className="text-slate-500 hover:text-red-600 text-xs font-medium disabled:opacity-50"
                      >
                        {deletingId === n.id ? "Sletter…" : "Slet"}
                      </button>
                    </span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

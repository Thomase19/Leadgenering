"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type WorkflowAction = { type: "webhook"; webhookUrl: string } | { type: "hubspot" };

type Workflow = {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  actions: unknown;
};

export function WorkflowsSection({
  workflows: initialWorkflows,
  hubspotConnected,
}: {
  workflows: Workflow[];
  hubspotConnected: boolean;
}) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  useEffect(() => setWorkflows(initialWorkflows), [initialWorkflows]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<"LEAD_QUALIFIED" | "LEAD_CAPTURED">("LEAD_QUALIFIED");
  const [actions, setActions] = useState<WorkflowAction[]>([{ type: "hubspot" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAction(type: "webhook" | "hubspot") {
    if (type === "webhook") setActions((a) => [...a, { type: "webhook", webhookUrl: "" }]);
    else setActions((a) => [...a, { type: "hubspot" }]);
  }

  function removeAction(i: number) {
    setActions((a) => a.filter((_, idx) => idx !== i));
  }

  function updateAction(i: number, upd: Partial<WorkflowAction>) {
    setActions((a) => {
      const next = [...a];
      next[i] = { ...next[i], ...upd } as WorkflowAction;
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = actions.filter((a) => a.type === "hubspot" || (a.type === "webhook" && a.webhookUrl?.trim()));
    if (valid.length === 0) {
      setError("Tilføj mindst én handling med gyldig webhook-URL eller HubSpot.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Nyt workflow",
        trigger,
        enabled: true,
        actions: valid,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Kunne ikke oprette workflow");
      return;
    }
    router.refresh();
    setShowForm(false);
    setName("");
    setTrigger("LEAD_QUALIFIED");
    setActions([{ type: "hubspot" }]);
  }

  async function toggleEnabled(w: Workflow) {
    const res = await fetch(`/api/workflows/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !w.enabled }),
    });
    if (res.ok) router.refresh();
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Slet dette workflow?")) return;
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function formatTrigger(t: string) {
    return t === "LEAD_QUALIFIED" ? "Lead kvalificeret (chat)" : "Lead indsendt (offline)";
  }

  function formatActions(actionsJson: unknown) {
    const arr = Array.isArray(actionsJson) ? actionsJson : [];
    return arr
      .map((a: { type?: string; webhookUrl?: string }) =>
        a.type === "webhook" ? `Webhook` : a.type === "hubspot" ? "HubSpot" : ""
      )
      .filter(Boolean)
      .join(", ") || "—";
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? "Annuller" : "Opret workflow"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 mb-6 max-w-xl space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Navn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Notifier Slack"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Udløser</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as "LEAD_QUALIFIED" | "LEAD_CAPTURED")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="LEAD_QUALIFIED">Når lead kvalificeres i chat</option>
              <option value="LEAD_CAPTURED">Når lead indsendes (offline-formular)</option>
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Handlinger</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addAction("webhook")}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Webhook
                </button>
                {hubspotConnected && (
                  <button
                    type="button"
                    onClick={() => addAction("hubspot")}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + HubSpot
                  </button>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="flex gap-2 items-center">
                  {a.type === "webhook" ? (
                    <input
                      type="url"
                      value={a.webhookUrl}
                      onChange={(e) => updateAction(i, { webhookUrl: e.target.value })}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-slate-600">Send til HubSpot</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAction(i)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Fjern
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Opretter…" : "Opret workflow"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Annuller
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3 max-w-xl">
        {workflows.length === 0 && !showForm ? (
          <li className="text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-200 px-4 py-6">
            Ingen workflows endnu. Opret et for at køre handlinger automatisk ved nye leads.
          </li>
        ) : (
          workflows.map((w) => (
            <li
              key={w.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-medium text-slate-800">{w.name}</p>
                <p className="text-sm text-slate-500">
                  {formatTrigger(w.trigger)} → {formatActions(w.actions)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleEnabled(w)}
                  className={`rounded-lg px-3 py-1 text-sm font-medium ${
                    w.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {w.enabled ? "Aktiv" : "Inaktiv"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteWorkflow(w.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Slet
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

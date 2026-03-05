"use client";

import { useState, useEffect } from "react";

export function IntegrationsForm({
  webhookUrl,
  hubspotConnected,
  hubspotError,
  appBaseUrl,
}: {
  webhookUrl: string | null;
  hubspotConnected: boolean;
  hubspotError?: string | null;
  appBaseUrl: string;
}) {
  const [url, setUrl] = useState(webhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUrl(webhookUrl ?? "");
  }, [webhookUrl]);

  async function saveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/integrations/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl: url.trim() || null }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function connectHubSpot() {
    window.location.href = "/api/integrations/hubspot/connect";
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Webhook</h2>
        <p className="text-sm text-slate-600 mb-4">
          Kvalificerede leads sendes som POST til denne URL som JSON (leadId, siteDomain, contact, score, summary, transcriptUrl).
        </p>
        <form onSubmit={saveWebhook} className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Gemmer…" : "Gem"}
          </button>
          {saved && <span className="text-sm text-green-600 self-center">Gemt.</span>}
        </form>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">HubSpot</h2>
        <p className="text-sm text-slate-600 mb-4">
          Tilslut din HubSpot-konto for at oprette kontakter for kvalificerede leads.
        </p>
        {hubspotError === "hubspot_not_configured" && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            HubSpot er ikke konfigureret endnu. Sæt <code className="bg-amber-100 px-1 rounded">HUBSPOT_CLIENT_ID</code> og{" "}
            <code className="bg-amber-100 px-1 rounded">HUBSPOT_CLIENT_SECRET</code> i miljøvariablerne for denne app, og opret en app i HubSpot Developer Portal med redirect-URL:{" "}
            <code className="bg-amber-100 px-1 rounded text-xs break-all">{appBaseUrl}/api/integrations/hubspot/connect</code>
          </div>
        )}
        {hubspotError === "hubspot_token" && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            Kunne ikke tilslutte HubSpot (token-fejl). Prøv igen eller tjek at app-opsætningen i HubSpot matcher redirect-URL og scope.
          </div>
        )}
        {hubspotConnected ? (
          <p className="text-sm text-green-600 font-medium">Tilsluttet</p>
        ) : (
          <button
            type="button"
            onClick={connectHubSpot}
            className="rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600"
          >
            Tilslut HubSpot
          </button>
        )}
      </section>
    </div>
  );
}

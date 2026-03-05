"use client";

import { useState } from "react";
import Link from "next/link";

export function SnippetBlock({
  siteId,
  snippetUrl,
  baseUrl,
}: {
  siteId: string;
  snippetUrl: string;
  baseUrl: string;
}) {
  const snippet = `<script>
  window.LEADBOT_SITE_ID = "${siteId}";
</script>
<script src="${snippetUrl}" async></script>`;
  const [copied, setCopied] = useState(false);
  const demoUrl = `${baseUrl}/demo?siteId=${siteId}`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Installer snippet</h2>
      <p className="text-sm text-slate-600 mb-4">
        Tilføj denne kode før lukke-tagget <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code> på dit site.
      </p>
      <p className="text-sm text-slate-600 mb-2">
        <Link
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-medium"
        >
          Se demo →
        </Link>{" "}
        Åbn denne side for at prøve widgeten uden at indsætte koden på et andet site.
      </p>
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
        {snippet}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="mt-3 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
      >
        {copied ? "Kopieret!" : "Kopier til udklipsholder"}
      </button>
    </section>
  );
}

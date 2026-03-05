"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LeadRow = {
  id: string;
  sessionId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  score: number;
  crmProvider: string;
  createdAt: Date;
  site: { domain: string };
};

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(leadId: string) {
    setDeletingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmId(null);
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (leads.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-8 px-4 text-center text-slate-500">
          Ingen leads endnu. Tilføj widgeten til dit site for at indsamle leads.
        </td>
      </tr>
    );
  }

  return (
    <>
      {leads.map((lead) => (
        <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
          <td className="py-3 px-4">
            <span className="font-medium text-slate-800">
              {lead.name || lead.email || lead.phone || "—"}
            </span>
            {lead.email && (
              <span className="block text-slate-500 text-xs">{lead.email}</span>
            )}
          </td>
          <td className="py-3 px-4 text-slate-600">{lead.site.domain}</td>
          <td className="py-3 px-4">{lead.score}</td>
          <td className="py-3 px-4 text-slate-600">
            {lead.crmProvider === "NONE" ? "—" : lead.crmProvider}
          </td>
          <td className="py-3 px-4 text-slate-500">
            {new Date(lead.createdAt).toLocaleDateString("da-DK", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </td>
          <td className="py-3 px-4">
            <Link
              href={`/sessions/${lead.sessionId}`}
              className="text-blue-600 hover:underline"
            >
              Se
            </Link>
          </td>
          <td className="py-3 px-4">
            {confirmId === lead.id ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(lead.id)}
                  disabled={!!deletingId}
                  className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
                >
                  {deletingId === lead.id ? "Sletter…" : "Bekræft"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="text-slate-500 hover:underline text-xs"
                >
                  Annuller
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(lead.id)}
                className="text-red-600 hover:underline text-xs"
              >
                Slet
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

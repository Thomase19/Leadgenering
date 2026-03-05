import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSessionForTenant } from "@/lib/tenancy";
import { LeadNotesSection } from "./LeadNotesSection";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const chatSession = await getSessionForTenant((await params).id, session.user.tenantId);
  if (!chatSession) notFound();

  const messages = chatSession.messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
          ← Leads
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-1">Chat-session</h1>
        <p className="text-slate-600 text-sm mt-0.5">
          {chatSession.site.domain} ·{" "}
          {chatSession.status === "OPEN"
            ? "Åben"
            : chatSession.status === "QUALIFIED"
              ? "Kvalificeret"
              : chatSession.status === "NOT_QUALIFIED"
                ? "Ikke kvalificeret"
                : chatSession.status}{" "}
          · Score: {chatSession.score} ·{" "}
          {new Date(chatSession.startedAt).toLocaleString()}
        </p>
      </div>

      {chatSession.lead && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <h2 className="font-semibold text-slate-800 mb-2">Lead</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Navn</dt>
              <dd>{chatSession.lead.name ?? "—"}</dd>
              <dt className="text-slate-500">E-mail</dt>
              <dd>{chatSession.lead.email ?? "—"}</dd>
              <dt className="text-slate-500">Telefon</dt>
              <dd>{chatSession.lead.phone ?? "—"}</dd>
              <dt className="text-slate-500">Virksomhed</dt>
              <dd>{chatSession.lead.company ?? "—"}</dd>
            </dl>
          </div>
          <LeadNotesSection leadId={chatSession.lead.id} />
        </>
      )}

      {chatSession.summary && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
          <h2 className="font-semibold text-slate-800 mb-2">Opsummering</h2>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{chatSession.summary}</pre>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b border-slate-200">Transskript</h2>
        <ul className="divide-y divide-slate-100">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`p-4 ${msg.role === "VISITOR" ? "bg-slate-50" : ""}`}
            >
              <span className="text-xs font-medium text-slate-500 uppercase">
                {msg.role}
              </span>
              <p className="mt-1 text-slate-800 whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {new Date(msg.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getSessionsForTenant } from "@/lib/tenancy";
import { getSitesForTenant } from "@/lib/tenancy";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const params = await searchParams;
  const siteId = params.siteId && params.siteId !== "all" ? params.siteId : undefined;
  const status = params.status && params.status !== "all" ? params.status : undefined;

  const [sessions, sites] = await Promise.all([
    getSessionsForTenant(session.user.tenantId, { siteId, status }),
    getSitesForTenant(session.user.tenantId),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Sessioner</h1>

      <div className="flex gap-4 mb-6 flex-wrap">
        <form method="get" action="/sessions" className="flex gap-2 flex-wrap items-center">
          <select
            name="siteId"
            defaultValue={siteId ?? "all"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Alle sider</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? "all"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Alle status</option>
            <option value="OPEN">Åben</option>
            <option value="QUALIFIED">Kvalificeret</option>
            <option value="NOT_QUALIFIED">Ikke kvalificeret</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium">
            Anvend
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-700">Side</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">Score</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">Startet</th>
              <th className="text-left py-3 px-4 font-medium text-slate-700"></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                  Ingen sessioner endnu.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-600">{s.site.domain}</td>
                  <td className="py-3 px-4">
                    {s.status === "OPEN"
                      ? "Åben"
                      : s.status === "QUALIFIED"
                        ? "Kvalificeret"
                        : s.status === "NOT_QUALIFIED"
                          ? "Ikke kvalificeret"
                          : s.status}
                  </td>
                  <td className="py-3 px-4">{s.score}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/sessions/${s.id}`} className="text-blue-600 hover:underline">
                      Se
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

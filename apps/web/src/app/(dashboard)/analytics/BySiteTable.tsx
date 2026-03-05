import Link from "next/link";

type Row = {
  siteId: string;
  domain: string;
  sessions: number;
  leads: number;
  qualificationRate: number;
};

export function BySiteTable({ rows, periodLabel }: { rows: Row[]; periodLabel?: string }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Pr. side {periodLabel ? `(${periodLabel})` : ""}
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="text-left py-3 px-4 font-medium text-slate-600">
                Side
              </th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">
                Chats
              </th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">
                Leads
              </th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">
                Kval. score
              </th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 px-4 text-center text-slate-500"
                >
                  Ingen steder eller ingen aktivitet i de seneste 7 dage.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.siteId}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                >
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {r.domain}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                    {r.sessions}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                    {r.leads}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                    {r.qualificationRate}%
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/sites/${r.siteId}/config`}
                      className="text-primary-600 hover:underline text-xs font-medium"
                    >
                      Konfigurer
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

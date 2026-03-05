import { DemoWidget } from "./DemoWidget";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const { siteId } = await searchParams;
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        {siteId ? (
          <>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">LeadBot demo</h1>
            <p className="text-sm text-slate-600 mb-6">
              Åbn chat-boblen nederst til højre for at prøve widgeten.
            </p>
            <DemoWidget siteId={siteId} baseUrl={baseUrl} />
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-800 mb-2">LeadBot demo</h1>
            <p className="text-sm text-slate-600 mb-4">
              For at se widgeten skal du tilføje dit site-id til URL&apos;en:
            </p>
            <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2 text-slate-700 break-all">
              {baseUrl}/demo?siteId=DIT_SITE_ID
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Find dit site-id i dashboardet under <strong>Sider → Konfigurer</strong> (i install-snippet).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

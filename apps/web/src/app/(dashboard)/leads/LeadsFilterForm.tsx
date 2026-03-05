"use client";

type Site = { id: string; domain: string };

type Props = {
  sites: Site[];
  defaultValues: {
    siteId: string;
    qualified: string;
    from: string;
    to: string;
    minScore: string;
    maxScore: string;
    search: string;
    crmProvider: string;
  };
};

export function LeadsFilterForm({ sites, defaultValues }: Props) {
  return (
    <form method="get" action="/leads" className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Side</span>
          <select
            name="siteId"
            defaultValue={defaultValues.siteId}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="all">Alle sider</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Kvalificeret</span>
          <select
            name="qualified"
            defaultValue={defaultValues.qualified}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Alle</option>
            <option value="true">Kvalificeret</option>
            <option value="false">Ikke kvalificeret</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">CRM</span>
          <select
            name="crmProvider"
            defaultValue={defaultValues.crmProvider}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">Alle</option>
            <option value="NONE">Ingen</option>
            <option value="WEBHOOK">Webhook</option>
            <option value="HUBSPOT">HubSpot</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Fra dato</span>
          <input
            type="date"
            name="from"
            defaultValue={defaultValues.from}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Til dato</span>
          <input
            type="date"
            name="to"
            defaultValue={defaultValues.to}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Min. score</span>
          <input
            type="number"
            name="minScore"
            min={0}
            max={100}
            placeholder="0"
            defaultValue={defaultValues.minScore}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Maks. score</span>
          <input
            type="number"
            name="maxScore"
            min={0}
            max={100}
            placeholder="100"
            defaultValue={defaultValues.maxScore}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-20"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Søg</span>
          <input
            type="search"
            name="search"
            placeholder="Navn, e-mail, telefon, virksomhed…"
            defaultValue={defaultValues.search}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            Anvend filtre
          </button>
          <a
            href="/leads"
            className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
          >
            Ryd
          </a>
        </div>
      </div>
    </form>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSitesForTenant } from "@/lib/tenancy";
import { NewSiteForm } from "./NewSiteForm";

export default async function NewSitePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");
  await getSitesForTenant(session.user.tenantId); // ensure tenant exists

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Tilføj side</h1>
      <p className="text-slate-600 mb-6">Indtast det domæne, hvor du vil indsætte widgeten (f.eks. example.com).</p>
      <NewSiteForm />
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: { sites: true },
  });
  if (!tenant) redirect("/login");
  if (tenant.sites.length > 0) redirect("/sites");

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Kom i gang</h1>
      <p className="text-slate-600 mb-6">Opret dit første sted for at installere LeadBot-widgeten.</p>
      <OnboardingForm tenantId={tenant.id} />
    </div>
  );
}

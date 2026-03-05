import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkflowsSection } from "./WorkflowsSection";

export default async function WorkflowsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const [workflows, hubspotConn] = await Promise.all([
    prisma.workflow.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.crmConnection.findUnique({
      where: {
        tenantId_provider: { tenantId: session.user.tenantId, provider: "HUBSPOT" },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Workflows</h1>
      <p className="text-slate-600 mb-6">
        Automatiserede handlinger når et lead kvalificeres eller indsendes via offline-formularen.
      </p>
      <WorkflowsSection
        workflows={workflows}
        hubspotConnected={!!hubspotConn?.hubspotAccessToken}
      />
    </div>
  );
}

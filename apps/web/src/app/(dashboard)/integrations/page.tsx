import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntegrationsForm } from "./IntegrationsForm";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect("/login");

  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : null;

  const connections = await prisma.crmConnection.findMany({
    where: { tenantId: session.user.tenantId },
  });
  const webhook = connections.find((c) => c.provider === "WEBHOOK");
  const hubspot = connections.find((c) => c.provider === "HUBSPOT");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Integrationer</h1>
      <IntegrationsForm
        webhookUrl={webhook?.webhookUrl ?? null}
        hubspotConnected={!!hubspot?.hubspotAccessToken}
        hubspotError={error}
        appBaseUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}

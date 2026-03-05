import { Worker } from "bullmq";
import { connection } from "./queue";
import { prisma } from "./prisma";
import type { WebhookPayload } from "@leadbot/shared";

async function pushWebhook(leadId: string, tenantId: string): Promise<void> {
  const conn = await prisma.crmConnection.findUnique({
    where: { tenantId_provider: { tenantId, provider: "WEBHOOK" } },
  });
  if (!conn?.webhookUrl) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { session: true, site: true },
  });
  if (!lead) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const transcriptUrl = `${baseUrl}/api/widget/transcript/${lead.sessionId}`;

  const payload: WebhookPayload = {
    leadId: lead.id,
    siteDomain: lead.site.domain,
    capturedAt: lead.createdAt.toISOString(),
    contact: {
      name: lead.name ?? undefined,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      company: lead.company ?? undefined,
      notes: lead.notes ?? undefined,
    },
    score: lead.score,
    summary: lead.session.summary ?? null,
    transcriptUrl,
  };

  const res = await fetch(conn.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook failed: ${res.status}`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { pushedAt: new Date(), crmProvider: "WEBHOOK" },
  });
}

async function pushHubSpot(leadId: string, tenantId: string): Promise<void> {
  const conn = await prisma.crmConnection.findUnique({
    where: { tenantId_provider: { tenantId, provider: "HUBSPOT" } },
  });
  if (!conn?.hubspotAccessToken) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { session: true, site: true },
  });
  if (!lead) return;

  // Create contact by email
  const email = lead.email ?? "unknown@leadbot.local";
  const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.hubspotAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email,
        firstname: lead.name?.split(" ")[0] ?? "",
        lastname: lead.name?.split(" ").slice(1).join(" ") ?? "",
        phone: lead.phone ?? "",
        company: lead.company ?? "",
      },
    }),
  });

  if (!contactRes.ok) {
    const err = await contactRes.text();
    throw new Error(`HubSpot contact failed: ${err}`);
  }

  const contactData = (await contactRes.json()) as { id: string };
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      pushedAt: new Date(),
      crmProvider: "HUBSPOT",
      crmExternalId: contactData.id,
    },
  });
}

export const CrmWorker = new Worker<{ leadId: string; tenantId: string; provider: "WEBHOOK" | "HUBSPOT" }>(
  "crm-push",
  async (job) => {
    const { leadId, tenantId, provider } = job.data;
    if (provider === "WEBHOOK") await pushWebhook(leadId, tenantId);
    else if (provider === "HUBSPOT") await pushHubSpot(leadId, tenantId);
  },
  { connection, concurrency: 2 }
);

CrmWorker.on("failed", (job, err) => {
  console.error("CRM job failed", job?.id, err);
});

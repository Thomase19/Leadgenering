import { prisma } from "./prisma";
import { addCrmJob } from "./queue";
import type { WebhookPayload } from "@leadbot/shared";

export type WorkflowTrigger = "LEAD_QUALIFIED" | "LEAD_CAPTURED";

type WorkflowAction =
  | { type: "webhook"; webhookUrl: string }
  | { type: "hubspot" };

function isWorkflowAction(a: unknown): a is WorkflowAction {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  if (o.type === "webhook") return typeof o.webhookUrl === "string" && o.webhookUrl.length > 0;
  if (o.type === "hubspot") return true;
  return false;
}

function parseActions(actions: unknown): WorkflowAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.filter(isWorkflowAction);
}

async function buildWebhookPayload(leadId: string): Promise<WebhookPayload | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { session: true, site: true },
  });
  if (!lead) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const transcriptUrl = `${baseUrl}/api/widget/transcript/${lead.sessionId}`;

  return {
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
}

/**
 * Run all enabled workflows for the given trigger. Fires webhooks and enqueues HubSpot jobs.
 * Does not throw; logs errors.
 */
export async function runWorkflowsForLead(
  leadId: string,
  tenantId: string,
  trigger: WorkflowTrigger
): Promise<void> {
  const workflows = await prisma.workflow.findMany({
    where: { tenantId, trigger, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  if (workflows.length === 0) return;

  const payload = await buildWebhookPayload(leadId);
  if (!payload) return;

  for (const w of workflows) {
    const actions = parseActions(w.actions);
    for (const action of actions) {
      try {
        if (action.type === "webhook") {
          const res = await fetch(action.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            console.error(`Workflow ${w.id} webhook failed: ${res.status}`);
          }
        } else if (action.type === "hubspot") {
          await addCrmJob({ leadId, tenantId, provider: "HUBSPOT" });
        }
      } catch (e) {
        console.error("Workflow action failed", w.id, action.type, e);
      }
    }
  }
}

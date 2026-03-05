import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const crmQueue = new Queue("crm-push", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
  },
});

export type CrmJobPayload = {
  leadId: string;
  tenantId: string;
  provider: "WEBHOOK" | "HUBSPOT";
};

export async function addCrmJob(payload: CrmJobPayload): Promise<void> {
  await crmQueue.add("push", payload, {
    jobId: payload.leadId, // idempotency
  });
}

export { connection };

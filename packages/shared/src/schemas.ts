import { z } from "zod";

export const qualificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  required: z.boolean(),
});

export const widgetConfigUpdateSchema = z.object({
  botName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().max(500).nullable().optional(), // URL or path e.g. /avatars/default-1.svg, /uploads/avatars/...
  avatarEmoji: z.string().max(20).nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  greetingText: z.string().max(500).optional(),
  offlineMessage: z.string().max(500).optional(),
  qualificationQuestions: z.array(qualificationQuestionSchema).optional(),
  leadThreshold: z.number().min(0).max(100).optional(),
  businessHoursStart: z.number().min(0).max(23).nullable().optional(),
  businessHoursEnd: z.number().min(0).max(23).nullable().optional(),
  collectEmailPhoneFirst: z.boolean().optional(),
  toneOfVoice: z.string().max(2000).nullable().optional(),
  inputPlaceholder: z.string().max(200).nullable().optional(),
  typingText: z.string().max(100).nullable().optional(),
  sendButtonLabel: z.string().max(50).nullable().optional(),
});

export const beaconSchema = z.object({
  siteId: z.string().min(1),
  visitorId: z.string().min(1).max(100),
  path: z.string().max(2000), // pathname e.g. / or /pricing
  referrer: z.string().max(2000).optional(),
});

export const createSessionSchema = z.object({
  siteId: z.string().min(1),
  visitorId: z.string().min(1),
  pageUrl: z.string().url().optional().or(z.literal("")),
  referrer: z.string().optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
});

export const sendMessageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(10000),
});

export const leadCaptureSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  message: z.string().max(2000).optional(),
});

export const webhookUrlSchema = z.object({
  webhookUrl: z.string().url().nullable(),
});

export const createSiteSchema = z.object({
  domain: z.string().min(1).max(253),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
});

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("webhook"), webhookUrl: z.string().url() }),
  z.object({ type: z.literal("hubspot") }),
]);

export const workflowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum(["LEAD_QUALIFIED", "LEAD_CAPTURED"]),
  enabled: z.boolean().optional().default(true),
  actions: z.array(workflowActionSchema).min(1).max(10),
});

export const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  trigger: z.enum(["LEAD_QUALIFIED", "LEAD_CAPTURED"]).optional(),
  enabled: z.boolean().optional(),
  actions: z.array(workflowActionSchema).min(1).max(10).optional(),
});

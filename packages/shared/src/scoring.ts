import type { QualificationState } from "./types";

/**
 * Score a lead 0-100 based on qualification state and contact info.
 * Must have at least email or phone to qualify.
 * Adds points for: urgency, timeline, clear intent, company size.
 */
export function scoreLead(
  state: QualificationState,
  hasEmail: boolean,
  hasPhone: boolean
): number {
  let score = 0;
  const hasContact = hasEmail || hasPhone;
  if (!hasContact) return 0;

  score += 25; // base for having contact

  if (state.urgency) {
    const u = state.urgency.toLowerCase();
    if (u.includes("asap") || u.includes("urgent") || u.includes("immediately")) score += 20;
    else if (u.includes("soon") || u.includes("week")) score += 15;
    else if (u.includes("month") || u.includes("exploring")) score += 5;
  }

  if (state.timeline) {
    const t = state.timeline.toLowerCase();
    if (t.includes("now") || t.includes("this week")) score += 15;
    else if (t.includes("month")) score += 10;
    else if (t.length > 2) score += 5;
  }

  if (state.intent && state.intent.length > 3) score += 15;
  if (state.serviceType && state.serviceType.length > 2) score += 10;
  if (state.budgetSignal && state.budgetSignal.length > 2) score += 10;
  if (state.companySizeSignal && state.companySizeSignal.length > 2) score += 5;

  return Math.min(100, score);
}

export function meetsThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}

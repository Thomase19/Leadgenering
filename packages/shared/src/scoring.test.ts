/**
 * Unit tests for scoring logic. Run with: npx tsx src/scoring.test.ts
 */
import { scoreLead, meetsThreshold } from "./scoring";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// scoreLead returns 0 when no contact
assert(scoreLead({ intent: "buy" }, false, false) === 0, "no contact => 0");

// Base score when has contact
assert(scoreLead({}, true, false) === 25, "email only => 25");
assert(scoreLead({}, false, true) === 25, "phone only => 25");

// Adds points for urgency/timeline
const state = { urgency: "asap", timeline: "this week", intent: "need help" };
assert(scoreLead(state, true, false) > 50, "urgency+timeline increases score");

// Caps at 100
const highState = {
  urgency: "asap",
  timeline: "now",
  intent: "buy",
  serviceType: "enterprise",
  budgetSignal: "approved",
  companySizeSignal: "500+",
};
assert(scoreLead(highState, true, true) <= 100, "score capped at 100");

// meetsThreshold
assert(meetsThreshold(60, 60) === true, "score >= threshold");
assert(meetsThreshold(70, 60) === true, "score > threshold");
assert(meetsThreshold(59, 60) === false, "score < threshold");

console.log("All scoring tests passed.");

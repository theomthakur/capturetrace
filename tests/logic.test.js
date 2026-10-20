import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, displayMeasurement, summarize, validateEvent } from "../logic.js";

test("lost acknowledgment counts one capture and suppresses the retry", () => {
  assert.deepEqual(summarize(SCENARIOS.acknowledgement.events), {
    captured: 1,
    accepted: 1,
    duplicate: 1,
    review: 0,
    lost: 0,
  });
});

test("duplicate event identities are suppressed", () => {
  const event = SCENARIOS.acknowledgement.events[0];
  const result = validateEvent(event, new Set([event.id]));
  assert.equal(result.outcome, "duplicate");
  assert.match(result.reason, /no second write/);
});

test("unexpected units enter review instead of being guessed", () => {
  const event = SCENARIOS.units.events[0];
  const result = validateEvent(event);
  assert.equal(result.outcome, "review");
  assert.match(result.reason, /Expected inches/);
});

test("unsupported contract versions enter review", () => {
  const result = validateEvent(SCENARIOS.contract.events[0]);
  assert.equal(result.outcome, "review");
  assert.match(result.reason, /Unsupported data contract/);
});

test("accepted events have explicit identity and context", () => {
  const event = SCENARIOS.normal.events[0];
  assert.equal(validateEvent(event).outcome, "accepted");
  assert.ok(event.id && event.device && event.field && event.contract);
});

test("fractional measurements render for field readability", () => {
  assert.equal(displayMeasurement(SCENARIOS.normal.events[0]), "36 ⅝ IN");
});

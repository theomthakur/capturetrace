import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, displayMeasurement, summarize, validateEvent } from "../logic.js";

test("retry scenario counts unique captures separately from duplicate delivery", () => {
  assert.deepEqual(summarize(SCENARIOS.retry.events), {
    captured: 6,
    accepted: 5,
    duplicate: 1,
    review: 1,
    lost: 0,
  });
});

test("duplicate event identities are suppressed", () => {
  const event = SCENARIOS.retry.events[0];
  assert.equal(validateEvent(event, new Set([event.id])).outcome, "duplicate");
});

test("unexpected units enter review instead of being guessed", () => {
  const event = SCENARIOS.retry.events.at(-1);
  const result = validateEvent(event);
  assert.equal(result.outcome, "review");
  assert.match(result.reason, /Expected inches/);
});

test("accepted events have explicit identity and context", () => {
  const event = SCENARIOS.normal.events[0];
  assert.equal(validateEvent(event).outcome, "accepted");
  assert.ok(event.id && event.device && event.field && event.contract);
});

test("fractional measurements render for field readability", () => {
  assert.equal(displayMeasurement(SCENARIOS.normal.events[0]), "36 ⅝ IN");
});

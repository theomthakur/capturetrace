import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, createReceiver, displayMeasurement, getRunDecision, simulate, summarize, validateEvent } from "../logic.js";

test("scenario data carries conditions, never precomputed outcomes", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    for (const item of scenario.events) assert.equal(item.outcome, undefined);
  }
});

test("clean capture: the receiver accepts all three", () => {
  assert.deepEqual(summarize(simulate(SCENARIOS.normal)), { captured: 3, accepted: 3, duplicate: 0, review: 0, lost: 0 });
});

test("lost acknowledgment: the retry is recognized by the receiver and written once", () => {
  const events = simulate(SCENARIOS.acknowledgement);
  assert.deepEqual(events.map((item) => item.outcome), ["accepted", "duplicate"]);
  assert.deepEqual(summarize(events), { captured: 1, accepted: 1, duplicate: 1, review: 0, lost: 0 });
});

test("offline: events queue locally, then replay through the receiver", () => {
  const events = simulate(SCENARIOS.offline);
  assert.ok(events.every((item) => item.replayed && item.outcome === "accepted"));
  assert.equal(summarize(events).lost, 0);
});

test("lost is measured, not assumed: an event that never settles counts as lost", () => {
  const events = [{ id: "evt_a", outcome: "accepted" }, { id: "evt_b", outcome: "sending" }];
  assert.equal(summarize(events).lost, 1);
});

test("a queued event is visible, not lost", () => {
  assert.equal(summarize([{ id: "evt_q", outcome: "queued" }]).lost, 0);
});

test("receiver suppresses a second delivery of the same ID", () => {
  const receiver = createReceiver();
  const item = SCENARIOS.normal.events[0];
  assert.equal(receiver.receive(item).outcome, "accepted");
  const retry = receiver.receive(item);
  assert.equal(retry.outcome, "duplicate");
  assert.match(retry.reason, /no second write/);
});

test("unexpected units enter review instead of being guessed", () => {
  const [item] = simulate(SCENARIOS.units);
  assert.equal(item.outcome, "review");
  assert.match(validateEvent(item).reason, /Expected inches/);
});

test("unsupported contract versions enter review", () => {
  const [item] = simulate(SCENARIOS.contract);
  assert.equal(item.outcome, "review");
  assert.match(validateEvent(item).reason, /Unsupported data contract/);
});

test("missing context is caught before any other check", () => {
  const item = { ...SCENARIOS.units.events[0], device: undefined };
  assert.match(validateEvent(item).reason, /Required context is missing/);
});

test("fractional measurements render for field readability", () => {
  assert.equal(displayMeasurement(SCENARIOS.normal.events[0]), "36 ⅝ IN");
});

test("a completed offline replay produces a clear field decision", () => {
  assert.deepEqual(getRunDecision(SCENARIOS.offline, simulate(SCENARIOS.offline)), {
    status: "Ready after sync",
    action: "Continue the survey. The queued measurements were replayed and verified.",
    tone: "clear",
  });
});

test("a unit mismatch produces a hold decision and operator action", () => {
  assert.deepEqual(getRunDecision(SCENARIOS.units, simulate(SCENARIOS.units)), {
    status: "Hold this field",
    action: "Confirm the tool mode and intended units before approving the value.",
    tone: "hold",
  });
});

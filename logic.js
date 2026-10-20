export const SCENARIOS = {
  normal: {
    label: "Normal capture",
    description: "Three connected measurements are validated and accepted immediately.",
    events: [
      event("evt_CT07_0421", "width", 36.625, "in", "accepted", 421),
      event("evt_CT07_0422", "height", 58.25, "in", "accepted", 422),
      event("evt_CT07_0423", "depth", 5.5, "in", "accepted", 423),
    ],
  },
  offline: {
    label: "Offline jobsite",
    description: "Events are committed locally, queued, and replayed in sequence after reconnection.",
    events: [
      event("evt_CT07_0431", "width", 36.625, "in", "queued", 431),
      event("evt_CT07_0432", "height", 58.25, "in", "queued", 432),
      event("evt_CT07_0433", "depth", 5.5, "in", "queued", 433),
    ],
  },
  retry: {
    label: "Retry + mismatch",
    description: "A repeated delivery is suppressed and unexpected units are held for human confirmation.",
    events: [
      event("evt_CT07_0441", "width", 36.625, "in", "accepted", 441),
      event("evt_CT07_0442", "height", 58.25, "in", "accepted", 442),
      event("evt_CT07_0443", "depth", 5.5, "in", "accepted", 443),
      event("evt_CT07_0444", "width", 37.0, "in", "accepted", 444, "North elevation"),
      event("evt_CT07_0445", "height", 59.0, "in", "accepted", 445, "North elevation"),
      event("evt_CT07_0444", "width", 37.0, "in", "duplicate", 444, "North elevation"),
      event("evt_CT07_0446", "depth", 140, "mm", "review", 446, "North elevation"),
    ],
  },
};

function event(id, field, value, unit, outcome, sequence, location = "South elevation") {
  return { id, field, value, unit, outcome, sequence, location, device: "CT-07", contract: "measurement.v3" };
}

export function summarize(events) {
  const uniqueCaptures = new Set(events.filter((item) => item.outcome !== "duplicate").map((item) => item.id));
  return {
    captured: uniqueCaptures.size,
    accepted: events.filter((item) => item.outcome === "accepted").length,
    duplicate: events.filter((item) => item.outcome === "duplicate").length,
    review: events.filter((item) => item.outcome === "review").length,
    lost: 0,
  };
}

export function validateEvent(candidate, seen = new Set()) {
  if (seen.has(candidate.id)) return { outcome: "duplicate", reason: "Acknowledgement was lost; retry reused an accepted event ID, so no second write occurred" };
  if (candidate.contract !== "measurement.v3") return { outcome: "review", reason: "Unsupported data contract" };
  if (candidate.unit !== "in") return { outcome: "review", reason: `Expected inches; received ${candidate.unit}` };
  if (!candidate.id || !candidate.device || !candidate.field) return { outcome: "review", reason: "Required context is missing" };
  return { outcome: "accepted", reason: "Identity, contract, units, and context verified" };
}

export function displayMeasurement(item) {
  const formatted = Number.isInteger(item.value) ? String(item.value) : String(item.value).replace(".625", " ⅝").replace(".25", " ¼").replace(".5", " ½");
  return `${formatted} ${item.unit.toUpperCase()}`;
}

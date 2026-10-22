export const SCENARIOS = {
  normal: {
    label: "Clean capture",
    category: "Baseline",
    question: "What happens when everything works?",
    description: "The tool captures three measurements while connected. Each event arrives once with the expected identity, units, and field context.",
    expected: "All three measurements become trusted form values immediately.",
    decision: "Ready to use",
    action: "Continue the survey. All three form fields are trusted.",
    journey: ["The tool creates three identified events.", "The connected app sends each event immediately.", "The receiver validates and accepts all three."],
    events: [
      event("evt_CT07_0421", "width", 36.625, "in", 421),
      event("evt_CT07_0422", "height", 58.25, "in", 422),
      event("evt_CT07_0423", "depth", 5.5, "in", 423),
    ],
  },
  offline: {
    label: "Offline jobsite",
    startsOffline: true,
    category: "Connectivity",
    question: "What happens when the jobsite loses internet?",
    description: "The tool keeps capturing while offline. The app saves each event locally, shows that it is queued, and waits for connectivity.",
    expected: "Nothing is silently lost. Reconnection replays all three events in sequence.",
    decision: "Ready after sync",
    action: "Continue the survey. The queued measurements were replayed and verified.",
    journey: ["The tool captures while the app is offline.", "Three events stay visibly queued on the device.", "Reconnection replays and validates them in order."],
    events: [
      event("evt_CT07_0431", "width", 36.625, "in", 431),
      event("evt_CT07_0432", "height", 58.25, "in", 432),
      event("evt_CT07_0433", "depth", 5.5, "in", 433),
    ],
  },
  acknowledgement: {
    label: "Lost acknowledgment",
    category: "Safe retry",
    question: "What if the server saves a measurement but the reply is lost?",
    description: "The server accepts the event, but the app never receives the acknowledgment. The app retries using the same stable event ID.",
    expected: "The retry is recognized and suppressed. The measurement is written only once.",
    decision: "Keep the first write",
    action: "No field correction is needed. Record the retry as a suppressed duplicate.",
    journey: ["The tool creates one stable event ID.", "The first delivery succeeds, but its acknowledgment is lost.", "The retry reuses the ID and causes no second write."],
    events: [
      event("evt_CT07_0441", "width", 36.625, "in", 441),
      { ...event("evt_CT07_0441", "width", 36.625, "in", 441), retry: true },
    ],
  },
  units: {
    label: "Wrong units",
    category: "Validation",
    question: "What if a measurement arrives in the wrong units?",
    description: "The form expects inches, but a depth measurement arrives in millimeters. Automatically converting it could hide the wrong device mode or field context.",
    expected: "The value is preserved but held for review. The system does not guess.",
    decision: "Hold this field",
    action: "Confirm the tool mode and intended units before approving the value.",
    journey: ["The tool sends a depth value marked as millimeters.", "The contract expects inches for this field.", "The receiver keeps the raw value and requests confirmation."],
    events: [
      event("evt_CT07_0451", "depth", 140, "mm", 451),
    ],
  },
  contract: {
    label: "Old app contract",
    category: "Compatibility",
    question: "What if an older app sends an unsupported event shape?",
    description: "The measurement itself looks reasonable, but it arrives under an older contract version that the receiver no longer accepts automatically.",
    expected: "The event is held for review instead of being partially interpreted.",
    decision: "Hold this field",
    action: "Update the sending app or use an approved compatibility path before retrying.",
    journey: ["An older app sends a measurement.v2 event.", "The receiver supports measurement.v3.", "The event pauses before it can change the form."],
    events: [
      { ...event("evt_CT07_0461", "height", 58.25, "in", 461), contract: "measurement.v2" },
    ],
  },
};

function event(id, field, value, unit, sequence, location = "South elevation") {
  return { id, field, value, unit, sequence, location, device: "CT-07", contract: "measurement.v3" };
}

const SETTLED = new Set(["accepted", "review", "queued"]);

// "lost" = a captured event ID that never reached a settled state (accepted, held, or visibly queued).
export function summarize(events) {
  const captured = new Set(events.map((item) => item.id));
  const settled = new Set(events.filter((item) => SETTLED.has(item.outcome)).map((item) => item.id));
  return {
    captured: captured.size,
    accepted: events.filter((item) => item.outcome === "accepted").length,
    duplicate: events.filter((item) => item.outcome === "duplicate").length,
    review: events.filter((item) => item.outcome === "review").length,
    lost: [...captured].filter((id) => !settled.has(id)).length,
  };
}

export function validateEvent(candidate, seen = new Set()) {
  if (!candidate.id || !candidate.device || !candidate.field) return { outcome: "review", reason: "Required context is missing" };
  if (seen.has(candidate.id)) return { outcome: "duplicate", reason: "Retry reused an already-received event ID, so no second write occurred" };
  if (candidate.contract !== "measurement.v3") return { outcome: "review", reason: "Unsupported data contract" };
  if (candidate.unit !== "in") return { outcome: "review", reason: `Expected inches; received ${candidate.unit}` };
  return { outcome: "accepted", reason: "Identity, contract, units, and context verified" };
}

// Idempotent receiver: every delivery is validated; an ID it has already recorded is never written twice.
export function createReceiver() {
  const seen = new Set();
  return {
    receive(candidate) {
      const result = validateEvent(candidate, seen);
      if (result.outcome !== "duplicate" && candidate.id) seen.add(candidate.id);
      return result;
    },
  };
}

// Pure, untimed run of a scenario through the same client and receiver rules the UI animates.
export function simulate(scenario) {
  const receiver = createReceiver();
  const events = scenario.events.map((item) => ({
    ...item,
    outcome: scenario.startsOffline ? "queued" : receiver.receive(item).outcome,
  }));
  for (const item of events.filter((candidate) => candidate.outcome === "queued")) {
    item.outcome = receiver.receive(item).outcome;
    item.replayed = true;
  }
  return events;
}

export function displayMeasurement(item) {
  const formatted = Number.isInteger(item.value) ? String(item.value) : String(item.value).replace(".625", " ⅝").replace(".25", " ¼").replace(".5", " ½");
  return `${formatted} ${item.unit.toUpperCase()}`;
}

export function getRunDecision(scenario, events) {
  if (!events.length) {
    return {
      status: "Not run yet",
      action: "Choose a situation and select Show this scenario.",
      tone: "ready",
    };
  }

  const queued = events.filter((item) => item.outcome === "queued").length;
  const review = events.filter((item) => item.outcome === "review").length;

  if (review) {
    return { status: scenario.decision, action: scenario.action, tone: "hold" };
  }
  if (queued) {
    return {
      status: "Waiting for connection",
      action: `${queued} measurement${queued === 1 ? " is" : "s are"} saved locally. Reconnect before closing the job.`,
      tone: "waiting",
    };
  }
  return { status: scenario.decision, action: scenario.action, tone: "clear" };
}

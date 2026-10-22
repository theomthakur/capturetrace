import { SCENARIOS, createReceiver, displayMeasurement, getRunDecision, summarize } from "./logic.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  scenario: "normal",
  running: false,
  online: true,
  events: [],
  timers: [],
  manualSequence: 500,
  receiver: createReceiver(),
};

const elements = {
  buttons: $$(".scenario-button"),
  run: $("#run-scenario"),
  capture: $("#capture-button"),
  network: $("#network-toggle"),
  reset: $("#reset-button"),
  exportReport: $("#export-report"),
  copyLink: $("#copy-scenario-link"),
  traceList: $("#trace-list"),
  traceEmpty: $("#trace-empty"),
  queue: $("#queue-banner"),
  queueCount: $("#queue-count"),
  queueCopy: $("#queue-copy"),
  connection: $("#connection-pill"),
  deviceValue: $("#device-value"),
  deviceUnit: $("#device-unit"),
  deviceField: $("#device-field"),
  deviceSequence: $("#device-sequence"),
  deviceContract: $("#device-contract"),
  progressCopy: $("#progress-copy"),
  progressBar: $("#progress-bar"),
  scenarioCategory: $("#scenario-category"),
  scenarioQuestion: $("#scenario-question"),
  scenarioDescription: $("#scenario-description"),
  scenarioExpected: $("#scenario-expected"),
  journey: [$("#journey-capture"), $("#journey-transport"), $("#journey-decision")],
  dialog: $("#notes-dialog"),
  decisionPanel: $("#run-decision"),
  decisionStatus: $("#decision-status"),
  decisionAction: $("#decision-action"),
};

const fieldLabels = { width: "Opening width", height: "Opening height", depth: "Sill depth" };

elements.buttons.forEach((button) => button.addEventListener("click", () => {
  if (state.running) return;
  state.scenario = button.dataset.scenario;
  elements.buttons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
  updateScenarioGuide();
  updateScenarioUrl();
  resetWorkspace();
}));

elements.run.addEventListener("click", runScenario);
elements.reset.addEventListener("click", resetWorkspace);
elements.exportReport.addEventListener("click", exportRunReport);
elements.copyLink.addEventListener("click", copyScenarioLink);
elements.capture.addEventListener("click", manualCapture);
elements.network.addEventListener("click", toggleNetwork);
$("#open-notes").addEventListener("click", () => elements.dialog.showModal());
$("#close-notes").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

function later(callback, delay) {
  const timer = window.setTimeout(callback, delay);
  state.timers.push(timer);
}

function clearTimers() {
  state.timers.forEach(window.clearTimeout);
  state.timers = [];
}

function setOnline(online) {
  state.online = online;
  elements.connection.className = `status-pill ${online ? "connected" : "offline"}`;
  elements.connection.innerHTML = `<i></i>${online ? "Connected" : "Offline"}`;
  elements.network.setAttribute("aria-pressed", String(!online));
  elements.network.querySelector("span:last-child").textContent = online ? "Take offline" : "Reconnect";
}

function toggleNetwork() {
  if (state.running) return;
  setOnline(!state.online);
  const queued = state.events.filter((item) => item.outcome === "queued");
  if (state.online && queued.length) {
    elements.queueCopy.textContent = "Connectivity restored. Replaying queued events in sequence.";
    replayQueued(queued);
  }
}

function resetWorkspace() {
  clearTimers();
  state.running = false;
  state.events = [];
  state.receiver = createReceiver();
  setOnline(true);
  elements.run.disabled = false;
  elements.run.querySelector("span:first-child").textContent = "Show this scenario";
  elements.exportReport.disabled = true;
  elements.traceList.replaceChildren();
  elements.traceEmpty.hidden = false;
  elements.queue.hidden = true;
  $$(".field-row").forEach((row) => setField(row.dataset.field, null));
  updateMetrics();
  updateProgress();
  updateDecision();
  updateDevice({ value: 36.625, unit: "in", field: "width", sequence: 421 });
}

function runScenario() {
  if (state.running) return;
  resetWorkspace();
  state.running = true;
  elements.run.disabled = true;
  elements.run.querySelector("span:first-child").textContent = "Running…";
  const scenario = SCENARIOS[state.scenario];
  const runEvents = scenario.events.map((item) => ({ ...item }));

  if (scenario.startsOffline) {
    setOnline(false);
    runEvents.forEach((item, index) => later(() => ingest(item), 450 + index * 650));
    later(() => {
      setOnline(true);
      elements.queueCopy.textContent = "Connectivity restored. Replaying queued events in sequence.";
      replayQueued(state.events.filter((item) => item.outcome === "queued"));
    }, 2800);
    later(finishRun, 5200);
    return;
  }

  const interval = state.scenario === "acknowledgement" ? 900 : 700;
  runEvents.forEach((item, index) => later(() => ingest(item), 400 + index * interval));
  later(finishRun, 700 + runEvents.length * interval);
}

function finishRun() {
  state.running = false;
  elements.run.disabled = false;
  elements.run.querySelector("span:first-child").textContent = "Run again";
}

function replayQueued(queued) {
  queued.forEach((item, index) => later(() => {
    const result = state.receiver.receive(item);
    item.outcome = result.outcome;
    item.replayed = true;
    item.reason = result.outcome === "accepted" ? "Replayed once; identity, contract, units, and context verified" : result.reason;
    updateTraceItem(item);
    if (item.outcome === "accepted" || item.outcome === "review") setField(item.field, item);
    updateMetrics();
    updateProgress();
    updateDecision();
    const remaining = state.events.filter((candidate) => candidate.outcome === "queued").length;
    updateQueue(remaining);
  }, 500 + index * 650));
}

function manualCapture() {
  if (state.running) return;
  const fields = ["width", "height", "depth"];
  const field = fields[state.events.filter((item) => item.outcome !== "duplicate").length % fields.length];
  const values = { width: 36.625, height: 58.25, depth: 5.5 };
  state.manualSequence += 1;
  const candidate = {
    id: `evt_CT07_${state.manualSequence}`,
    field,
    value: values[field],
    unit: "in",
    sequence: state.manualSequence,
    location: "South elevation",
    device: "CT-07",
    contract: "measurement.v3",
  };
  ingest(candidate);
}

function deliver(item) {
  if (!state.online) {
    item.outcome = "queued";
    item.reason = "Committed locally; waiting for connectivity";
    return;
  }
  const result = state.receiver.receive(item);
  item.outcome = result.outcome;
  item.reason = result.outcome === "duplicate" && item.retry
    ? "Acknowledgment was lost, so the app retried with the same event ID; the receiver recognized it and made no second write"
    : result.reason;
}

function ingest(item) {
  deliver(item);
  updateDevice(item);
  state.events.push(item);
  appendTrace(item);
  if (item.outcome === "accepted") setField(item.field, item);
  if (item.outcome === "review") setField(item.field, item);
  updateMetrics();
  updateProgress();
  updateQueue(state.events.filter((candidate) => candidate.outcome === "queued").length);
  updateDecision();
}

function updateDevice(item) {
  elements.deviceValue.textContent = displayMeasurement(item).replace(/\s(IN|MM)$/, "");
  elements.deviceUnit.textContent = item.unit.toUpperCase();
  elements.deviceField.textContent = fieldLabels[item.field].toUpperCase();
  elements.deviceSequence.textContent = `SEQ ${String(item.sequence).padStart(4, "0")}`;
  elements.deviceContract.textContent = item.contract;
  $(".device-body").classList.remove("pulse");
  requestAnimationFrame(() => $(".device-body").classList.add("pulse"));
}

function appendTrace(item) {
  elements.traceEmpty.hidden = true;
  const li = document.createElement("li");
  li.dataset.eventId = item.id;
  li.dataset.outcome = item.outcome;
  li.innerHTML = traceMarkup(item, item.reason);
  elements.traceList.append(li);
  elements.traceList.scrollTo({ top: elements.traceList.scrollHeight, behavior: "smooth" });
}

function updateTraceItem(item) {
  const li = [...elements.traceList.querySelectorAll(`[data-event-id="${item.id}"]`)].find((candidate) => candidate.dataset.outcome === "queued");
  if (!li) return;
  li.dataset.outcome = item.outcome;
  li.innerHTML = traceMarkup(item, item.reason);
}

function traceMarkup(item, reason) {
  const labels = { accepted: "Accepted", queued: "Queued locally", duplicate: "Suppressed", review: "Needs review" };
  const icons = { accepted: "✓", queued: "↓", duplicate: "≠", review: "!" };
  return `<div class="trace-icon">${icons[item.outcome]}</div><div class="trace-content"><div><strong>${labels[item.outcome]}</strong><time>${clockTime()}</time></div><p>${fieldLabels[item.field]} · ${displayMeasurement(item)}</p><small>${reason}</small><code>${item.id}</code></div>`;
}

function clockTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date());
}

function setField(field, item) {
  const row = $(`.field-row[data-field="${field}"]`);
  const value = $(".field-value strong", row);
  const status = $(".field-status", row);
  if (!item) {
    value.textContent = "…";
    status.textContent = "Waiting";
    status.className = "field-status empty";
    return;
  }
  value.textContent = displayMeasurement(item);
  status.textContent = item.outcome === "review" ? (item.unit !== "in" ? "Confirm units" : "Review event") : "Trusted";
  status.className = `field-status ${item.outcome}`;
}

function updateQueue(count) {
  elements.queue.hidden = count === 0;
  elements.queueCount.textContent = `${count} queued`;
}

function updateMetrics() {
  const summary = summarize(state.events);
  const metricIds = { captured: "captured", accepted: "accepted", duplicate: "duplicate", review: "review", lost: "loss" };
  for (const [key, id] of Object.entries(metricIds)) {
    $(`#metric-${id}`).textContent = summary[key];
  }
  elements.exportReport.disabled = state.events.length === 0;
}

function exportRunReport() {
  if (!state.events.length) return;
  const scenario = SCENARIOS[state.scenario];
  const summary = summarize(state.events);
  const decision = getRunDecision(scenario, state.events);
  const lines = [
    `# CaptureTrace run report: ${scenario.label}`,
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Scenario:** ${scenario.description}`,
    `**Job:** JOB-2407, Window opening survey, South elevation, Level 2`,
    "",
    "## Field decision",
    "",
    `**Status:** ${decision.status}`,
    `**Next action:** ${decision.action}`,
    "",
    "## Integrity summary",
    "",
    `- Captured: ${summary.captured}`,
    `- Accepted: ${summary.accepted}`,
    `- Duplicate deliveries suppressed: ${summary.duplicate}`,
    `- Held for review: ${summary.review}`,
    `- Silently lost: ${summary.lost}`,
    "",
    "## Event evidence",
    "",
    "| Sequence | Event ID | Field | Measurement | State | Evidence |",
    "|---:|---|---|---|---|---|",
    ...state.events.map((item) => {
      const stateLabel = item.replayed ? `${item.outcome} after replay` : item.outcome;
      return `| ${item.sequence} | ${item.id} | ${fieldLabels[item.field]} | ${displayMeasurement(item)} | ${stateLabel} | ${item.reason} |`;
    }),
    "",
    "## Scope",
    "",
    "Independent browser prototype using synthetic devices and measurements. This report does not represent a production system or REEKON Tools' internal architecture.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `capturetrace-${state.scenario}-run.md`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function updateDecision() {
  const decision = getRunDecision(SCENARIOS[state.scenario], state.events);
  elements.decisionPanel.dataset.tone = decision.tone;
  elements.decisionStatus.textContent = decision.status;
  elements.decisionAction.textContent = decision.action;
}

function updateScenarioUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", state.scenario);
  window.history.replaceState({}, "", url);
}

async function copyScenarioLink() {
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", state.scenario);
  try {
    await navigator.clipboard.writeText(url.toString());
    elements.copyLink.textContent = "Link copied";
  } catch {
    window.prompt("Copy this scenario link", url.toString());
  }
  later(() => { elements.copyLink.textContent = "Copy scenario link"; }, 1800);
}

function updateProgress() {
  const trusted = $$(".field-status.accepted").length;
  elements.progressCopy.textContent = `${trusted} of 3 fields trusted`;
  elements.progressBar.style.width = `${(trusted / 3) * 100}%`;
}

function updateScenarioGuide() {
  const scenario = SCENARIOS[state.scenario];
  const selectedIndex = elements.buttons.findIndex((button) => button.dataset.scenario === state.scenario) + 1;
  elements.scenarioCategory.textContent = `SCENARIO ${String(selectedIndex).padStart(2, "0")} · ${scenario.category.toUpperCase()}`;
  elements.scenarioQuestion.textContent = scenario.question;
  elements.scenarioDescription.textContent = scenario.description;
  elements.scenarioExpected.textContent = scenario.expected;
  elements.journey.forEach((element, index) => { element.textContent = scenario.journey[index]; });
}

const requestedScenario = new URLSearchParams(window.location.search).get("scenario");
if (requestedScenario && SCENARIOS[requestedScenario]) {
  state.scenario = requestedScenario;
  elements.buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.scenario === requestedScenario));
}
updateScenarioGuide();
resetWorkspace();

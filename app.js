import { SCENARIOS, displayMeasurement, summarize, validateEvent } from "./logic.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  scenario: "normal",
  running: false,
  online: true,
  events: [],
  timers: [],
  manualSequence: 500,
};

const elements = {
  buttons: $$(".scenario-button"),
  run: $("#run-scenario"),
  capture: $("#capture-button"),
  network: $("#network-toggle"),
  reset: $("#reset-button"),
  exportReport: $("#export-report"),
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
  progressCopy: $("#progress-copy"),
  progressBar: $("#progress-bar"),
  dialog: $("#notes-dialog"),
};

const fieldLabels = { width: "Opening width", height: "Opening height", depth: "Sill depth" };

elements.buttons.forEach((button) => button.addEventListener("click", () => {
  if (state.running) return;
  state.scenario = button.dataset.scenario;
  elements.buttons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
  resetWorkspace();
}));

elements.run.addEventListener("click", runScenario);
elements.reset.addEventListener("click", resetWorkspace);
elements.exportReport.addEventListener("click", exportRunReport);
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
  setOnline(true);
  elements.run.disabled = false;
  elements.run.querySelector("span:first-child").textContent = "Run scenario";
  elements.exportReport.disabled = true;
  elements.traceList.replaceChildren();
  elements.traceEmpty.hidden = false;
  elements.queue.hidden = true;
  $$(".field-row").forEach((row) => setField(row.dataset.field, null));
  updateMetrics();
  updateProgress();
  updateDevice({ value: 36.625, unit: "in", field: "width", sequence: 421 });
}

function runScenario() {
  if (state.running) return;
  resetWorkspace();
  state.running = true;
  elements.run.disabled = true;
  elements.run.querySelector("span:first-child").textContent = "Running…";
  const scenario = SCENARIOS[state.scenario];

  if (state.scenario === "offline") {
    setOnline(false);
    scenario.events.forEach((item, index) => later(() => ingest(item), 450 + index * 650));
    later(() => {
      setOnline(true);
      elements.queueCopy.textContent = "Connectivity restored. Replaying queued events in sequence.";
      replayQueued(state.events.filter((item) => item.outcome === "queued"));
    }, 2800);
    later(finishRun, 5200);
    return;
  }

  scenario.events.forEach((item, index) => later(() => ingest(item), 400 + index * (state.scenario === "retry" ? 430 : 700)));
  later(finishRun, 700 + scenario.events.length * (state.scenario === "retry" ? 430 : 700));
}

function finishRun() {
  state.running = false;
  elements.run.disabled = false;
  elements.run.querySelector("span:first-child").textContent = "Run again";
}

function replayQueued(queued) {
  queued.forEach((item, index) => later(() => {
    item.outcome = "accepted";
    item.replayed = true;
    updateTraceItem(item);
    setField(item.field, item);
    updateMetrics();
    updateProgress();
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
    outcome: state.online ? "accepted" : "queued",
    sequence: state.manualSequence,
    location: "South elevation",
    device: "CT-07",
    contract: "measurement.v3",
  };
  ingest(candidate);
}

function ingest(item) {
  updateDevice(item);
  state.events.push(item);
  appendTrace(item);
  if (item.outcome === "accepted") setField(item.field, item);
  if (item.outcome === "review") setField(item.field, item);
  updateMetrics();
  updateProgress();
  updateQueue(state.events.filter((candidate) => candidate.outcome === "queued").length);
}

function updateDevice(item) {
  elements.deviceValue.textContent = displayMeasurement(item).replace(/\s(IN|MM)$/, "");
  elements.deviceUnit.textContent = item.unit.toUpperCase();
  elements.deviceField.textContent = fieldLabels[item.field].toUpperCase();
  elements.deviceSequence.textContent = `SEQ ${String(item.sequence).padStart(4, "0")}`;
  $(".device-body").classList.remove("pulse");
  requestAnimationFrame(() => $(".device-body").classList.add("pulse"));
}

function appendTrace(item) {
  elements.traceEmpty.hidden = true;
  const result = explainEvent(item);
  const li = document.createElement("li");
  li.dataset.eventId = item.id;
  li.dataset.outcome = item.outcome;
  li.innerHTML = traceMarkup(item, result.reason);
  elements.traceList.append(li);
  elements.traceList.scrollTo({ top: elements.traceList.scrollHeight, behavior: "smooth" });
}

function explainEvent(item) {
  if (item.outcome === "queued") return { outcome: "queued", reason: "Committed locally; waiting for connectivity" };
  if (item.outcome === "duplicate") return validateEvent(item, new Set([item.id]));
  if (item.replayed) return { outcome: "accepted", reason: "Replayed once; identity, contract, units, and context verified" };
  return validateEvent(item);
}

function updateTraceItem(item) {
  const li = elements.traceList.querySelector(`[data-event-id="${item.id}"]`);
  if (!li) return;
  li.dataset.outcome = item.outcome;
  li.innerHTML = traceMarkup(item, "Replayed once; identity, contract, units, and context verified");
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
    value.textContent = "—";
    status.textContent = "Waiting";
    status.className = "field-status empty";
    return;
  }
  value.textContent = displayMeasurement(item);
  status.textContent = item.outcome === "review" ? "Confirm units" : "Trusted";
  status.className = `field-status ${item.outcome}`;
}

function updateQueue(count) {
  elements.queue.hidden = count === 0;
  elements.queueCount.textContent = `${count} queued`;
}

function updateMetrics() {
  const summary = summarize(state.events);
  for (const key of ["captured", "accepted", "duplicate", "review", "lost"]) {
    $(`#metric-${key}`).textContent = summary[key];
  }
  elements.exportReport.disabled = state.events.length === 0;
}

function exportRunReport() {
  if (!state.events.length) return;
  const scenario = SCENARIOS[state.scenario];
  const summary = summarize(state.events);
  const lines = [
    `# CaptureTrace run report: ${scenario.label}`,
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Scenario:** ${scenario.description}`,
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
      const result = explainEvent(item);
      const stateLabel = item.replayed ? "accepted after replay" : item.outcome;
      return `| ${item.sequence} | ${item.id} | ${fieldLabels[item.field]} | ${displayMeasurement(item)} | ${stateLabel} | ${result.reason} |`;
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

function updateProgress() {
  const trusted = $$(".field-status.accepted").length;
  elements.progressCopy.textContent = `${trusted} of 3 fields trusted`;
  elements.progressBar.style.width = `${(trusted / 3) * 100}%`;
}

resetWorkspace();

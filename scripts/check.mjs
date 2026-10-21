import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const architecture = readFileSync(new URL("../architecture.html", import.meta.url), "utf8");
const documentation = readFileSync(new URL("../documentation.html", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../presentation.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const presentationJs = readFileSync(new URL("../presentation.js", import.meta.url), "utf8");

const required = ["CaptureTrace", "Show this scenario", "Offline jobsite", "Lost acknowledgment", "Wrong units", "Old app contract", "Export report", "Independent prototype", "ONE PIPELINE, FIVE TESTS", "Read the complete step-by-step guide", "FIELD DECISION", "Copy scenario link"];
for (const text of required) {
  if (!html.includes(text)) throw new Error(`Missing required copy: ${text}`);
}
if (!html.includes('name="viewport"')) throw new Error("Missing responsive viewport metadata");
if (!css.includes("prefers-reduced-motion")) throw new Error("Missing reduced-motion support");
if (!js.includes("resetWorkspace")) throw new Error("Interactive controller is missing");
if (!js.includes("exportRunReport")) throw new Error("Run-report export is missing");
if (!js.includes("copyScenarioLink") || !js.includes("getRunDecision")) throw new Error("Shareable scenario or decision output is missing");
if (!js.includes("scenario.events.map((item) => ({ ...item }))")) throw new Error("Scenario runs must clone prepared events before changing state");
if (!html.includes('id="metric-loss"') || !js.includes('lost: "loss"')) throw new Error("Loss metric binding is inconsistent");

if (!architecture.includes("System design") || !architecture.includes("REFERENCE ARCHITECTURE")) {
  throw new Error("System design page is incomplete");
}
if (!documentation.includes("COMPLETE END-TO-END FLOW") || !documentation.includes("One pipeline, five independent scenarios")) {
  throw new Error("Documentation page is incomplete");
}
if (!presentation.includes("System design walkthrough") || !presentation.includes("One end-to-end pipeline. Five independent test scenarios.")) {
  throw new Error("Presentation page is incomplete");
}
if (!presentationJs.includes("requestFullscreen") || !presentationJs.includes("fullscreenchange")) {
  throw new Error("Full-screen presentation controls are missing");
}

for (const page of [html, architecture, documentation, presentation]) {
  for (const match of page.matchAll(/href="([^"#]+\.html(?:#[^"]*)?)"/g)) {
    const target = match[1].split("#")[0];
    const targetUrl = new URL(`../${target}`, import.meta.url);
    if (!existsSync(fileURLToPath(targetUrl))) throw new Error(`Broken internal page link: ${target}`);
  }
}

for (const page of [html, architecture, documentation]) {
  if (!page.includes("theomthakur.github.io/portfolio") || !page.includes("github.com/theomthakur/capturetrace") || !page.includes("linkedin.com/in/theomthakur")) {
    throw new Error("Professional footer links are incomplete");
  }
}

for (const source of [html, architecture, documentation, presentation, js, css]) {
  if (/[—–]/.test(source)) throw new Error("Dash punctuation found; use direct sentence structure instead");
}

console.log("Static integrity checks passed.");

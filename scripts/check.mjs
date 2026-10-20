import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

const required = ["CaptureTrace", "Show this scenario", "Offline jobsite", "Lost acknowledgment", "Wrong units", "Old app contract", "Export report", "Independent prototype", "System design", "Open presentation", "Production lane"];
for (const text of required) {
  if (!html.includes(text)) throw new Error(`Missing required copy: ${text}`);
}
if (!html.includes('name="viewport"')) throw new Error("Missing responsive viewport metadata");
if (!css.includes("prefers-reduced-motion")) throw new Error("Missing reduced-motion support");
if (!js.includes("resetWorkspace")) throw new Error("Interactive controller is missing");
if (!js.includes("exportRunReport")) throw new Error("Run-report export is missing");
if (!js.includes("openPresentation")) throw new Error("Presentation controller is missing");
if (!html.includes('id="metric-loss"') || !js.includes('lost: "loss"')) throw new Error("Loss metric binding is inconsistent");
console.log("Static integrity checks passed.");

import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

const required = ["CaptureTrace", "Show this scenario", "Offline jobsite", "Lost acknowledgment", "Wrong units", "Old app contract", "Export report", "Independent prototype", "FIELD DECISION"];
for (const text of required) {
  if (!html.includes(text)) throw new Error(`Missing required copy: ${text}`);
}
if (!html.includes('name="viewport"')) throw new Error("Missing responsive viewport metadata");
if (!css.includes("prefers-reduced-motion")) throw new Error("Missing reduced-motion support");
if (!js.includes("resetWorkspace") || !js.includes("exportRunReport")) throw new Error("Interactive controller is incomplete");
if (!js.includes("scenario.events.map((item) => ({ ...item }))")) throw new Error("Scenario runs must clone prepared events before changing state");
if (!html.includes('id="metric-loss"') || !js.includes('lost: "loss"')) throw new Error("Loss metric binding is inconsistent");

for (const match of html.matchAll(/href="([^"#:]+\.html)"/g)) {
  if (match[1] !== "index.html") throw new Error(`index.html links to a page that no longer exists: ${match[1]}`);
}
console.log("Static integrity checks passed.");

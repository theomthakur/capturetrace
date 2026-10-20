import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

const required = ["CaptureTrace", "Run scenario", "Offline jobsite", "Retry + mismatch", "Independent prototype"];
for (const text of required) {
  if (!html.includes(text)) throw new Error(`Missing required copy: ${text}`);
}
if (!html.includes('name="viewport"')) throw new Error("Missing responsive viewport metadata");
if (!css.includes("prefers-reduced-motion")) throw new Error("Missing reduced-motion support");
if (!js.includes("resetWorkspace")) throw new Error("Interactive controller is missing");
console.log("Static integrity checks passed.");

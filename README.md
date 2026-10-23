# CaptureTrace

A small browser demo of one idea: **a measurement is only useful if the value and its context arrive together.**

Think of a contractor measuring a window opening on a jobsite. The reading has to reach the job form with its unit, which tool took it, which field it belongs to, and when, even if the signal drops, the app retries, or someone's tool is set to the wrong units. CaptureTrace shows what a safe system does in each of those cases, using synthetic data only.

It is an independent prototype by Om Thakur, built for a technical conversation about connected tools. It is not affiliated with or representative of any company's real architecture.

- Live demo: https://capturetrace.vercel.app
- Source: https://github.com/theomthakur/capturetrace

## The five scenarios

1. **Clean capture:** everything works.
2. **Offline jobsite:** captures are saved on the device, shown as queued, then replayed in order when the signal returns.
3. **Lost acknowledgment:** the server saved the reading but the reply was lost, so the app retries. The same event ID means it is saved only once.
4. **Wrong units:** the form expects inches but gets millimeters. The raw value is kept and a person confirms. Nothing is guessed.
5. **Old app contract:** an older app sends a data format the receiver no longer accepts. The event is held before it can touch the form.

Every run ends with a plain field decision and a next action, and can be exported as a Markdown report.

## Files

| File | What it does |
|---|---|
| `index.html` | The whole page: scenario picker, the three panels (tool, job form, trace), metrics, and the event contract example. |
| `styles.css` | All styling. |
| `app.js` | The page controller. Reads the chosen scenario, animates the run, updates the tool, form, trace and counters, and exports the report. |
| `logic.js` | The core rules, with no page code. Scenario definitions, the validator, the idempotent receiver (never records the same event ID twice), the simulator, and the decision text. |
| `tests/logic.test.js` | 13 unit tests for the rules in `logic.js`. |
| `scripts/check.mjs` | A quick check that the page still has its required pieces. |
| `assets/` | Favicon and the social preview card. |
| `package.json` | Scripts only. No dependencies. |

## Run and check

```bash
npm run dev     # serves http://localhost:4173
npm run check   # unit tests plus page checks
```

Plain HTML, CSS and JavaScript (ES modules). No framework, backend, build step, API keys or Bluetooth dependency. Hosted on Vercel, which redeploys on every push to `main`.

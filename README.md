# CaptureTrace

CaptureTrace is an independent, browser-only reliability sandbox for synthetic connected field measurements. It demonstrates local-first capture, ordered replay, idempotent duplicate suppression, explicit context, unit validation, human-visible review states, and exportable run evidence.

The prototype was prepared by Om Thakur for a technical conversation about connected hardware/software systems. It is not affiliated with, endorsed by, or representative of REEKON Tools or any other company's internal architecture.

## Links

- Live demo: https://capturetrace.vercel.app
- Source: https://github.com/theomthakur/capturetrace

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

## Validate

```bash
npm run check
```

The application is intentionally static and deterministic. It has no authentication, analytics, API keys, backend, external data, or live Bluetooth dependency.

## Prepared scenarios

1. Clean connected capture.
2. Offline capture followed by ordered replay after reconnection.
3. A lost acknowledgment followed by a safe, deduplicated retry.
4. An unexpected unit held for human confirmation.
5. An older data-contract version stopped before it changes the form.

Every completed or partial run can be exported as a Markdown evidence report containing the scenario, integrity totals, event identities, measurements, outcomes, and validation rationale.

## System design walkthrough

The live site includes a full architecture narrative covering:

1. The journey from connected tool to local outbox, validation gate, and trusted workflow state.
2. The trust boundary and the event attributes checked before acceptance.
3. Four core design decisions: store before send, stable retry identity, boundary validation, and visible uncertainty.
4. The implemented prototype stack and a clearly separated production evolution path.
5. A seven-slide presentation mode with keyboard and button navigation for a concise technical walkthrough.

Open `https://capturetrace.vercel.app/?presentation=1` to launch directly into presentation mode.

The current prototype uses semantic HTML, responsive CSS, vanilla JavaScript ES modules, deterministic domain logic, Node tests, GitHub, and Vercel. It has zero runtime packages and no external APIs.

## Scope boundary

All devices, projects, measurements, event identifiers, and workflow behavior are synthetic. The code illustrates engineering principles rather than prescribing a production implementation.

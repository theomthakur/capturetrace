# CaptureTrace

CaptureTrace is an independent, browser-only reliability sandbox for synthetic connected field measurements. It demonstrates local-first capture, ordered replay, idempotent duplicate suppression, explicit context, unit validation, and human-visible review states.

The prototype was prepared by Om Thakur for a technical conversation about connected hardware/software systems. It is not affiliated with, endorsed by, or representative of REEKON Tools or any other company's internal architecture.

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

1. Normal connected capture.
2. Offline capture followed by ordered replay after reconnection.
3. Duplicate retry suppression and an unexpected-unit review gate.

## Scope boundary

All devices, projects, measurements, event identifiers, and workflow behavior are synthetic. The code illustrates engineering principles rather than prescribing a production implementation.

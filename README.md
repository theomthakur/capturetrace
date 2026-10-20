# CaptureTrace

CaptureTrace is an independent, browser-only reliability sandbox for synthetic connected field measurements. It demonstrates local-first capture, ordered replay, idempotent duplicate suppression, explicit context, unit validation, human-visible review states, and exportable run evidence.

The prototype was prepared by Om Thakur for a technical conversation about connected hardware/software systems. It is not affiliated with, endorsed by, or representative of REEKON Tools or any other company's internal architecture.

## Links

- Live demo: https://capturetrace.vercel.app
- Documentation: https://capturetrace.vercel.app/documentation.html
- System design: https://capturetrace.vercel.app/architecture.html
- Presentation: https://capturetrace.vercel.app/presentation.html
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

## One pipeline, five independent tests

CaptureTrace has one end-to-end reliability pipeline: capture, persist, deliver, validate, and decide. The five prepared scenarios are independent test runs through that shared pipeline. They are not five sequential workflow steps.

## System design walkthrough

The live site separates the working demo from the supporting technical narrative:

1. The documentation page explains the purpose, end-to-end journey, interface, scenarios, evidence report, implementation, and talk track.
2. The system design page covers the connected tool, event builder, durable outbox, validation gate, decision states, design choices, stack, and production evolution path.
3. The eight-slide presentation provides a concise technical walkthrough with keyboard, button, and browser full-screen controls.

Open `https://capturetrace.vercel.app/presentation.html` to launch presentation mode. Use the full-screen button or press `F`; use the arrow keys to move between slides.

The current prototype uses semantic HTML, responsive CSS, vanilla JavaScript ES modules, deterministic domain logic, Node tests, GitHub, and Vercel. It has zero runtime packages and no external APIs.

## Scope boundary

All devices, projects, measurements, event identifiers, and workflow behavior are synthetic. The code illustrates engineering principles rather than prescribing a production implementation.

# CaptureTrace complete guide

## 1. Purpose

CaptureTrace is an independent browser prototype that explores reliability at the boundary between a connected measuring tool and a digital field workflow.

The central question is:

> How can a physical measurement remain trustworthy when connectivity, retries, context, and client versions are imperfect?

The design aims to prevent four silent failures:

1. A captured measurement disappears.
2. A retry creates a second write.
3. A value is converted or interpreted without sufficient context.
4. An old or incompatible client changes the active form.

All devices, jobs, values, event IDs, and behavior are synthetic. The project does not represent REEKON Tools' internal architecture.

## 2. The correct mental model

CaptureTrace contains one end-to-end event pipeline and five independent test scenarios.

The scenarios are not five consecutive steps. Selecting a scenario resets the workspace and sends a fresh set of events through the same pipeline under one changed condition.

### Common pipeline

1. Capture the physical reading.
2. Create a complete event envelope.
3. Persist the event locally.
4. Attempt transport.
5. Check event identity.
6. Validate contract and context.
7. Choose a visible outcome.
8. Reflect the decision in the form, trace, metrics, and export.

### Conditions changed by scenarios

| Scenario | Changed condition | Safe response |
|---|---|---|
| Clean capture | Nothing fails | Accept |
| Offline jobsite | Network is unavailable | Queue, reconnect, replay |
| Lost acknowledgment | Client does not receive confirmation | Retry same ID, suppress duplicate |
| Wrong units | Event unit differs from field expectation | Hold for review |
| Old app contract | Event schema is older than receiver expectation | Hold for review |

## 3. Complete event journey

### Step 1: Capture

The synthetic CT-07 tool produces a measurement value, unit, device sequence, and intended workflow field.

### Step 2: Build the event

The field app wraps the reading in a `measurement.v3` event containing:

- `event_id`
- `device_id`
- `captured_at`
- measurement value and unit
- job and field context
- device sequence
- contract version

### Step 3: Persist locally

The app stores the event before it attempts transport. In the browser prototype, this behavior is simulated in memory. A production implementation would use an encrypted durable local database.

### Step 4: Deliver or queue

If connected, the app sends the event. If offline, it keeps the event in the outbox and shows a queued state. Reconnection replays queued events in sequence.

### Step 5: Check identity

The receiver checks whether the stable event ID has already been accepted. A repeated ID cannot create a second measurement.

### Step 6: Validate

The receiver checks:

- Contract version
- Unit
- Job and field context
- Device identity
- Sequence

### Step 7: Decide

The event becomes one of four visible states:

- Accepted
- Queued
- Duplicate
- Review

### Step 8: Reflect and explain

The field form, integrity trace, counters, and export report present the same result and the reason behind it.

## 4. Interface guide

### Panel A: Connected tool

Shows the current value, unit, intended field, sequence, contract, and connection state. It also provides manual capture and network controls.

### Panel B: Field workflow

Shows the active job form. Accepted events fill fields. Review events are marked for confirmation. Queued events appear in a visible local-storage banner.

### Panel C: Integrity trace

Lists each event outcome, reason, measurement, and event ID. It also provides the evidence-report export.

### Metrics

The top counters show captured, accepted, duplicate, review, and silently lost totals. Silently lost remains zero in all prepared scenarios.

## 5. Scenario procedures

### Clean capture

1. Select Clean capture.
2. Read the scenario explanation.
3. Select Show this scenario.
4. Watch three events move from tool to form.
5. Confirm three accepted events and zero loss.

### Offline jobsite

1. Select Offline jobsite.
2. Run the scenario.
3. Watch the connection change to Offline.
4. Confirm events enter the local queue rather than the form.
5. Watch automatic reconnection and ordered replay.
6. Confirm the fields become trusted only after successful replay.

### Lost acknowledgment

1. Select Lost acknowledgment.
2. Run the scenario.
3. Observe the first delivery become accepted.
4. Observe the retry use the same event ID.
5. Confirm the second delivery is suppressed and the form contains one value.

### Wrong units

1. Select Wrong units.
2. Run the scenario.
3. Observe that transport succeeds.
4. Confirm the unit validator holds the event.
5. Confirm the field says Confirm units rather than Trusted.

### Old app contract

1. Select Old app contract.
2. Run the scenario.
3. Observe the tool display `measurement.v2`.
4. Confirm the receiver requires `measurement.v3`.
5. Confirm the event is held before it changes the form.

## 6. Evidence report

After at least one event exists, Export report downloads a Markdown handoff containing:

- Scenario, job, and generation time
- Final field decision and required next action
- Integrity totals
- Event sequence
- Event ID
- Field and measurement
- Outcome
- Decision evidence

## 7. Implemented technology

- Semantic HTML
- Responsive CSS
- Vanilla JavaScript ES modules
- Deterministic scenario and validation logic
- Node test runner
- Static integrity checks
- GitHub source control
- Vercel deployment

The prototype has no runtime packages, external APIs, credentials, analytics, authentication, database, or live Bluetooth connection.

## 8. Production evolution

A production version could add:

- BLE device adapter
- Encrypted durable local database
- Background synchronization and retry policy
- Authenticated ingestion API
- Persistent idempotency registry
- Workflow service
- Audit retention
- Metrics, logs, traces, and alerting

## 9. Suggested presentation order

1. Explain the one-pipeline, five-tests model.
2. Run Offline jobsite.
3. Run Lost acknowledgment.
4. Run Wrong units.
5. Show the event contract.
6. Ask where these guarantees fit or conflict with the real workflow.

## 10. Validation

Run locally:

```bash
npm run dev
```

Run tests and static checks:

```bash
npm run check
```

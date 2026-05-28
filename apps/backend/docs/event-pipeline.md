# Event Pipeline

## Lifecycle
- `CREATED`: event inserted and waiting for processing.
- `PROCESSING`: pipeline is running.
- `PROCESSED`: timeline/checklist/travel/notifications persisted.
- `FAILED`: pipeline failed; retry policy controls reprocessing.
- `ARCHIVED`: event removed from active processing domain.

## Processing Flow
1. Controller validates HTTP input and delegates.
2. `EventProcessingService` starts state transition and idempotency checks.
3. `processEvent()` runs deterministic engine output.
4. Repositories persist checklist, timeline, notifications.
5. Event state/versions/hash updated in a single orchestration flow.

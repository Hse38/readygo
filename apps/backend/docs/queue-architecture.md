# Queue Architecture

## Abstraction
- `QueueProvider` defines enqueue contract.
- `QueueJobType` defines platform job names:
  - `PROCESS_EVENT`
  - `GENERATE_NOTIFICATIONS`
  - `AI_ENRICHMENT`
  - `RECALCULATE_TRAVEL`

## Implementations
- `InMemoryQueueProvider`: local/testing.
- `BullMqQueueProvider`: production placeholder for Redis-backed queue.

## Strategy
- Queue boundary is independent from service logic.
- Retry/backoff can be introduced per job type without refactoring controllers.

# Retry Strategy

## Policy
- Failed events move to `FAILED`.
- Retries increment `retryCount`.
- Backoff delay uses exponential helper `calculateRetryDelay()`.

## Formula
- `delay = min(baseMs * 2^retryCount, maxMs)`.

## Operational Boundaries
- No cron/worker implementation in this phase.
- Architecture is prepared for queue-driven retry executors.

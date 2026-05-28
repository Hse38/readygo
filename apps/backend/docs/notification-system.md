# Notification System

## Architecture
- Notification plans are generated deterministically in engine layer.
- `NotificationSchedulerService` dispatches plans to provider abstractions.
- Providers (`push`, `email`, `live-activity`, `widget`) are swappable adapters.

## Priority Model
- `CRITICAL`: time-sensitive and must be visible.
- `IMPORTANT`: strong recommendation.
- `OPTIONAL`: low-friction reminders.

## Scalability
- Channel fan-out is isolated from business logic.
- Batch `schedule(messages[])` contract supports bulk operations.

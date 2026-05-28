# Versioning System

## Version Fields
- `engineVersion`
- `templateVersion`
- `timelineVersion`
- `notificationVersion`
- `travelVersion`

## Responsibilities
- `version.manager.ts` exposes current version set.
- `toVersionString()` stores compact fingerprint in `lastProcessedVersion`.
- `isStaleEventIntelligence()` identifies outdated processed events.

## Goal
- Safe engine evolution without corrupting historical event intelligence.

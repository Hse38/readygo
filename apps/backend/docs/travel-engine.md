# Travel Engine

## Design
- `travel.engine.ts` calculates leave-home time from travel estimate.
- Provider contract (`TravelProvider`) isolates map vendor specifics.
- Current default provider is `MockTravelProvider`.

## Future Providers
- `GoogleMapsTravelProvider`
- `AppleMapsTravelProvider`
- any custom provider implementing `estimate()`.

## Reliability Rules
- Engine contains no API-specific code.
- Providers return normalized travel minutes only.

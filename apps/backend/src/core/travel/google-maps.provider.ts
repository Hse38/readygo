import type { TravelEstimationInput, TravelEstimationResult, TravelProvider } from "./travel-provider.interface";

export class GoogleMapsTravelProvider implements TravelProvider {
  async estimate(input: TravelEstimationInput): Promise<TravelEstimationResult> {
    void input;
    // TODO: integrate Google Maps Routes API.
    return { travelMinutes: 30 };
  }
}

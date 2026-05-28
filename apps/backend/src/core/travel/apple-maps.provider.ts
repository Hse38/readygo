import type { TravelEstimationInput, TravelEstimationResult, TravelProvider } from "./travel-provider.interface";

export class AppleMapsTravelProvider implements TravelProvider {
  async estimate(input: TravelEstimationInput): Promise<TravelEstimationResult> {
    void input;
    // TODO: integrate Apple Maps provider.
    return { travelMinutes: 30 };
  }
}

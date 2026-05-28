import { getTravelModeMinutes } from "../rules/travel.rules";
import type { TravelEstimationInput, TravelEstimationResult, TravelProvider } from "./travel-provider.interface";

export class MockTravelProvider implements TravelProvider {
  async estimate(input: TravelEstimationInput): Promise<TravelEstimationResult> {
    return { travelMinutes: getTravelModeMinutes(input.travelMode) };
  }
}

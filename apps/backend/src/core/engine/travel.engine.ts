import { calculateLeaveHomeTime, getTravelModeMinutes } from "../rules/travel.rules";
import { MockTravelProvider } from "../travel/mock.provider";
import type { TravelProvider } from "../travel/travel-provider.interface";

export interface TravelComputation {
  travelMinutes: number;
  leaveHomeAt: Date;
}

/**
 * Placeholder deterministic travel engine.
 * Future adapters (Google Maps/OSRM/etc.) should implement this contract
 * and feed accurate duration minutes.
 */
export function computeTravelPlan(eventDate: Date, travelMode?: string | null): TravelComputation {
  const travelMinutes = getTravelModeMinutes(travelMode);
  const leaveHomeAt = calculateLeaveHomeTime(eventDate, travelMinutes);
  return { travelMinutes, leaveHomeAt };
}

export async function computeTravelPlanWithProvider(
  eventDate: Date,
  travelMode?: string | null,
  provider: TravelProvider = new MockTravelProvider()
): Promise<TravelComputation> {
  const estimation = await provider.estimate({ eventDate, travelMode });
  const leaveHomeAt = calculateLeaveHomeTime(eventDate, estimation.travelMinutes);
  return { travelMinutes: estimation.travelMinutes, leaveHomeAt };
}

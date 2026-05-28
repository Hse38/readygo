import { calculateLeaveHomeTime, getTravelModeMinutes } from "../rules/travel.rules";

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

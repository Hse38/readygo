import { computeTravelPlanWithProvider } from "../core/engine/travel.engine";
import { MockTravelProvider } from "../core/travel/mock.provider";

export class TravelPlanningService {
  async calculateLeaveHome(eventDate: Date, travelMode?: string | null): Promise<Date> {
    const result = await computeTravelPlanWithProvider(eventDate, travelMode, new MockTravelProvider());
    return result.leaveHomeAt;
  }
}

export const travelPlanningService = new TravelPlanningService();

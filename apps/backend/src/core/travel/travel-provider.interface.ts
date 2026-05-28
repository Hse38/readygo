export interface TravelEstimationInput {
  eventDate: Date;
  travelMode?: string | null;
  origin?: string | null;
  destination?: string | null;
}

export interface TravelEstimationResult {
  travelMinutes: number;
}

export interface TravelProvider {
  estimate(input: TravelEstimationInput): Promise<TravelEstimationResult>;
}

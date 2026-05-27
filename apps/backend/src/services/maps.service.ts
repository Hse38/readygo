import { config } from "../lib/config";

export type TransitStep = {
  type: "transit" | "walking";
  instruction: string;
  duration: string;
  line?: string;
};

export type TransitDetails = {
  firstDeparture: string;
  steps: TransitStep[];
};

export interface TravelTimeResult {
  durationSeconds: number;
  durationText: string;
  distanceText: string;
  transitDetails?: TransitDetails;
}

const DEFAULT_TRAVEL: TravelTimeResult = {
  durationSeconds: 30 * 60,
  durationText: "30 dakika",
  distanceText: "10 km",
};

const MODE_MAP: Record<string, string> = {
  walking: "walking",
  transit: "transit",
  driving: "driving",
  cycling: "bicycling",
};

function toGoogleTravelMode(mode: string): string {
  return MODE_MAP[mode.toLowerCase()] ?? "driving";
}

function isLatLng(value: string): boolean {
  return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value.trim());
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

type DirectionsResponse = {
  status: string;
  routes?: Array<{
    legs?: Array<{
      duration?: { value: number; text: string };
      distance?: { text: string };
      departure_time?: { value: string };
      steps?: Array<{
        travel_mode?: string;
        html_instructions?: string;
        duration?: { text: string };
        transit_details?: {
          line?: {
            short_name?: string;
            name?: string;
          };
          departure_time?: { value: string };
        };
      }>;
    }>;
  }>;
};

type GeocodeResponse = {
  status: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

export class MapsService {
  private async geocodeAddress(address: string, apiKey: string): Promise<string | null> {
    const params = new URLSearchParams({
      address,
      key: apiKey,
    });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as GeocodeResponse;
    const location = data.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location?.lng !== "number") {
      return null;
    }
    return `${location.lat},${location.lng}`;
  }

  private async normalizeLocation(value: string, apiKey: string): Promise<string> {
    if (isLatLng(value)) return value.trim();
    const geocoded = await this.geocodeAddress(value, apiKey);
    return geocoded ?? value;
  }

  async getTravelTime(
    origin: string,
    destination: string,
    mode: string
  ): Promise<TravelTimeResult> {
    const apiKey = config.googleMaps.apiKey;
    if (!apiKey) {
      console.warn("GOOGLE_MAPS_API_KEY not configured, using default travel time");
      return DEFAULT_TRAVEL;
    }

    try {
      const normalizedOrigin = await this.normalizeLocation(origin, apiKey);
      const normalizedDestination = await this.normalizeLocation(destination, apiKey);
      const params = new URLSearchParams({
        origin: normalizedOrigin,
        destination: normalizedDestination,
        mode: toGoogleTravelMode(mode),
        key: apiKey,
      });

      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error("Google Directions API HTTP error:", response.status);
        return DEFAULT_TRAVEL;
      }

      const data = (await response.json()) as DirectionsResponse;

      if (data.status !== "OK" || !data.routes?.[0]?.legs?.[0]?.duration) {
        console.error("Google Directions API response:", data.status);
        return DEFAULT_TRAVEL;
      }

      const leg = data.routes[0].legs?.[0];
      if (!leg?.duration) return DEFAULT_TRAVEL;

      const duration = leg.duration;
      const distanceText = leg.distance?.text ?? "";
      let transitDetails: TransitDetails | undefined;

      if (toGoogleTravelMode(mode) === "transit") {
        const steps =
          leg.steps?.map((step) => {
            const isTransit = step.travel_mode?.toLowerCase() === "transit";
            const line =
              step.transit_details?.line?.short_name ??
              step.transit_details?.line?.name;
            return {
              type: isTransit ? "transit" : "walking",
              instruction: stripHtml(step.html_instructions ?? ""),
              duration: step.duration?.text ?? "",
              line: isTransit ? line : undefined,
            } satisfies TransitStep;
          }) ?? [];

        const firstTransitStep = leg.steps?.find(
          (step) => step.travel_mode?.toLowerCase() === "transit"
        );
        const firstDeparture =
          firstTransitStep?.transit_details?.departure_time?.value ??
          leg.departure_time?.value;

        if (firstDeparture) {
          transitDetails = {
            firstDeparture: new Date(firstDeparture).toISOString(),
            steps,
          };
        }
      }

      return {
        durationSeconds: duration.value,
        durationText: duration.text,
        distanceText,
        transitDetails,
      };
    } catch (err) {
      console.error("getTravelTime error:", err);
      return DEFAULT_TRAVEL;
    }
  }
}

export const mapsService = new MapsService();

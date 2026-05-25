import { config } from "../lib/config";

export interface TravelTimeResult {
  durationSeconds: number;
  durationText: string;
}

const DEFAULT_TRAVEL: TravelTimeResult = {
  durationSeconds: 30 * 60,
  durationText: "30 mins",
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

export class MapsService {
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
      const params = new URLSearchParams({
        origin,
        destination,
        mode: toGoogleTravelMode(mode),
        key: apiKey,
      });

      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error("Google Directions API HTTP error:", response.status);
        return DEFAULT_TRAVEL;
      }

      const data = (await response.json()) as {
        status: string;
        routes?: Array<{
          legs?: Array<{
            duration?: { value: number; text: string };
          }>;
        }>;
      };

      if (data.status !== "OK" || !data.routes?.[0]?.legs?.[0]?.duration) {
        console.error("Google Directions API response:", data.status);
        return DEFAULT_TRAVEL;
      }

      const duration = data.routes[0].legs[0].duration;
      return {
        durationSeconds: duration.value,
        durationText: duration.text,
      };
    } catch (err) {
      console.error("getTravelTime error:", err);
      return DEFAULT_TRAVEL;
    }
  }
}

export const mapsService = new MapsService();

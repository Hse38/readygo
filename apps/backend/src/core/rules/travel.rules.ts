import type { TransportMode } from "../types/event.types";

export const DEFAULT_TRAVEL_BUFFER_MINUTES = 10;

const MODE_MINUTES: Record<TransportMode, number> = {
  walking: 60,
  transit: 45,
  driving: 30,
  cycling: 40,
};

export function getTravelModeMinutes(mode: string | null | undefined): number {
  const normalized = (mode ?? "driving").toLowerCase() as TransportMode;
  return MODE_MINUTES[normalized] ?? MODE_MINUTES.driving;
}

export function calculateLeaveHomeTime(
  eventDate: Date,
  travelMinutes: number,
  bufferMinutes = DEFAULT_TRAVEL_BUFFER_MINUTES
): Date {
  const total = (travelMinutes + bufferMinutes) * 60 * 1000;
  return new Date(eventDate.getTime() - total);
}

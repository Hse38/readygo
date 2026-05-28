import type { Event } from "@prisma/client";
import { getCurrentVersionSet, toVersionString } from "../versioning/version.manager";

export function computeProcessingHash(event: Pick<Event, "id" | "date" | "title" | "type">): string {
  return `${event.id}:${event.type}:${event.title}:${event.date.toISOString()}`;
}

export function shouldProcessEvent(
  event: Pick<Event, "processingHash" | "lastProcessedVersion" | "id" | "date" | "title" | "type">
): boolean {
  const currentHash = computeProcessingHash(event);
  const currentVersion = toVersionString(getCurrentVersionSet());
  return event.processingHash !== currentHash || event.lastProcessedVersion !== currentVersion;
}

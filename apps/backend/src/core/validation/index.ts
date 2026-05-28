import { z } from "zod";
import { EventType, type GeneratedChecklistItem, type GeneratedTimelineItem } from "../types/event.types";
import { examMetadataSchema } from "./exam.metadata.schema";
import { flightMetadataSchema } from "./flight.metadata.schema";

const unknownMetadataSchema = z.record(z.string(), z.unknown()).optional();

export function validateMetadata(eventType: EventType, metadata: unknown): unknown {
  switch (eventType) {
    case EventType.FLIGHT:
      return flightMetadataSchema.parse(metadata ?? {});
    case EventType.EXAM:
      return examMetadataSchema.parse(metadata ?? {});
    default:
      return unknownMetadataSchema.parse(metadata);
  }
}

export function validateTimelineOutput(items: GeneratedTimelineItem[]): GeneratedTimelineItem[] {
  const schema = z.array(
    z.object({
      title: z.string().min(1),
      scheduledAt: z.date(),
      type: z.string().min(1),
      priority: z.enum(["critical", "important", "optional"]),
      order: z.number().int().positive(),
    })
  );
  return schema.parse(items);
}

export function validateChecklistOutput(items: GeneratedChecklistItem[]): GeneratedChecklistItem[] {
  const schema = z.array(
    z.object({
      title: z.string().min(1),
      scheduledAt: z.date(),
      priority: z.enum(["critical", "important", "optional"]),
      source: z.enum(["template", "ai"]),
      order: z.number().int().positive(),
    })
  );
  return schema.parse(items);
}

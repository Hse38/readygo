import type { EventType } from "@prisma/client";
import { generateTimeline } from "../core/engine/timeline.engine";
import type { TimelineTemplateItem } from "../core/types/timeline.types";

export class TimelineGenerationService {
  generate(eventDate: Date, _eventType: EventType, template: TimelineTemplateItem[]) {
    return generateTimeline(eventDate, template);
  }
}

export const timelineGenerationService = new TimelineGenerationService();

import { applyOffset, ensureBeforeEvent, sortChronologically } from "../rules/timing.rules";
import type { GeneratedTimelineEntry, TimelineTemplateItem } from "../types/timeline.types";

export function generateTimeline(eventDate: Date, template: TimelineTemplateItem[]): GeneratedTimelineEntry[] {
  const generated = template.map((item, index) => ({
    title: item.title,
    type: item.type,
    priority: item.priority,
    scheduledAt: ensureBeforeEvent(applyOffset(eventDate, item.offsetMinutes), eventDate),
    order: index + 1,
  }));

  return sortChronologically(generated).map((item, index) => ({ ...item, order: index + 1 }));
}

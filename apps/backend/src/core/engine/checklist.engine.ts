import { applyOffset, ensureBeforeEvent, sortChronologically } from "../rules/timing.rules";
import type { ChecklistTemplateItem, GeneratedChecklistEntry } from "../types/checklist.types";

export function generateChecklist(
  eventDate: Date,
  template: ChecklistTemplateItem[]
): GeneratedChecklistEntry[] {
  const generated = template.map((item, index) => ({
    title: item.title,
    priority: item.priority,
    source: item.source ?? "template",
    scheduledAt: ensureBeforeEvent(applyOffset(eventDate, item.offsetMinutes), eventDate),
    order: index + 1,
  }));

  return sortChronologically(generated).map((item, index) => ({ ...item, order: index + 1 }));
}

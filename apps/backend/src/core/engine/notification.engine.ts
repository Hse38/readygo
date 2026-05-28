import { resolveNotificationPriority } from "../rules/notification.rules";
import type { NotificationPlan } from "../types/event.types";
import type { GeneratedChecklistEntry } from "../types/checklist.types";
import type { GeneratedTimelineEntry } from "../types/timeline.types";

export function generateNotificationPlan(
  timeline: GeneratedTimelineEntry[],
  checklist: GeneratedChecklistEntry[]
): NotificationPlan[] {
  const candidates = [...timeline, ...checklist];

  return candidates.map((item) => ({
    title: item.title,
    scheduledAt: item.scheduledAt,
    priority: resolveNotificationPriority(item.title),
  }));
}

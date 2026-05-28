export type TimelinePriority = "critical" | "important" | "optional";

export interface TimelineTemplateItem {
  title: string;
  offsetMinutes: number;
  type: string;
  priority: TimelinePriority;
}

export interface GeneratedTimelineEntry {
  title: string;
  scheduledAt: Date;
  type: string;
  priority: TimelinePriority;
  order: number;
}

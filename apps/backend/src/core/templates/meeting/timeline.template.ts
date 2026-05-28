import type { TimelineTemplateItem } from "../../types/timeline.types";

export const meetingTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Toplantı hazırlık kontrolü", offsetMinutes: -24 * 60, type: "prep", priority: "important" },
  { title: "Katılımcı hatırlatması", offsetMinutes: -3 * 60, type: "reminder", priority: "important" },
  { title: "Evden çık", offsetMinutes: -45, type: "departure", priority: "critical" },
];

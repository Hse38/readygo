import type { TimelineTemplateItem } from "../../types/timeline.types";

export const weddingTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Hediye alma hatırlatması", offsetMinutes: -3 * 24 * 60, type: "gift", priority: "important" },
  { title: "Kıyafet hazırlık kontrolü", offsetMinutes: -24 * 60, type: "outfit", priority: "important" },
  { title: "Evden çık", offsetMinutes: -60, type: "departure", priority: "critical" },
];

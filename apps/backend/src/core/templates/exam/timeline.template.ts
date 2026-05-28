import type { TimelineTemplateItem } from "../../types/timeline.types";

export const examTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Çalışma planı bildirimi", offsetMinutes: -7 * 24 * 60, type: "study", priority: "important" },
  { title: "Son tekrar zamanı", offsetMinutes: -24 * 60, type: "review", priority: "important" },
  { title: "Sınav malzemelerini hazırla", offsetMinutes: -12 * 60, type: "materials", priority: "important" },
  { title: "Evden çık", offsetMinutes: -60, type: "departure", priority: "critical" },
];

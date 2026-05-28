import type { TimelineTemplateItem } from "../../types/timeline.types";

export const doctorTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Randevu evraklarını kontrol et", offsetMinutes: -24 * 60, type: "documents", priority: "important" },
  { title: "Evden çık", offsetMinutes: -45, type: "departure", priority: "critical" },
];

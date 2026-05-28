import type { TimelineTemplateItem } from "../../types/timeline.types";

export const flightTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Bavul hazırlama hatırlatması", offsetMinutes: -48 * 60, type: "prep", priority: "important" },
  { title: "Online check-in zamanı", offsetMinutes: -24 * 60, type: "checkin", priority: "critical" },
  { title: "Evden çık", offsetMinutes: -180, type: "departure", priority: "critical" },
  { title: "Havalimanına varış", offsetMinutes: -120, type: "arrival", priority: "critical" },
];

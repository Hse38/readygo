import type { ChecklistTemplateItem } from "../../types/checklist.types";

export const flightChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Bavul hazırla", offsetMinutes: -3 * 24 * 60, priority: "important" },
  { title: "Pasaport/kimlik kontrol et", offsetMinutes: -2 * 24 * 60, priority: "important" },
  { title: "Online check-in yap", offsetMinutes: -24 * 60, priority: "critical" },
  { title: "Havalimanı ulaşımını planla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Havalimanında ol", offsetMinutes: -90, priority: "critical" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

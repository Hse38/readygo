import type { ChecklistTemplateItem } from "../../types/checklist.types";

export const weddingChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Davetiyeyi kontrol et", offsetMinutes: -7 * 24 * 60, priority: "important" },
  { title: "Kıyafet seç ve hazırla", offsetMinutes: -7 * 24 * 60, priority: "important" },
  { title: "Hediye al", offsetMinutes: -3 * 24 * 60, priority: "important" },
  { title: "Ulaşım planla", offsetMinutes: -2 * 24 * 60, priority: "important" },
  { title: "Kıyafeti ütüle", offsetMinutes: -12 * 60, priority: "optional" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

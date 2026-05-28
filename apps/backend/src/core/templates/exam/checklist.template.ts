import type { ChecklistTemplateItem } from "../../types/checklist.types";

export const examChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Çalışma programı oluştur", offsetMinutes: -7 * 24 * 60, priority: "important" },
  { title: "Konu tekrarı yap", offsetMinutes: -3 * 24 * 60, priority: "important" },
  { title: "Son tekrar", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Kırtasiye malzemelerini hazırla", offsetMinutes: -12 * 60, priority: "important" },
  { title: "Erken uyu", offsetMinutes: -10 * 60, priority: "important" },
  { title: "Kahvaltı yap", offsetMinutes: -2 * 60, priority: "optional" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

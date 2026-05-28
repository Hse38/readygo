import type { ChecklistTemplateItem } from "../../types/checklist.types";

export const doctorChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Sigorta kartını hazırla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Önceki raporları topla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Randevu saatini onayla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Aç mı tok mu gidilmeli kontrol et", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

import type { ChecklistTemplateItem } from "../../types/checklist.types";

export const meetingChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Gündem hazırla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Sunum/dokümanları hazırla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Katılımcılara hatırlatma gönder", offsetMinutes: -3 * 60, priority: "important" },
  { title: "Teknik ekipmanları kontrol et", offsetMinutes: -30, priority: "critical" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

import type { NotificationPlan } from "../../types/event.types";

export const doctorNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Randevu belgelerini unutma", priority: "important" },
  { title: "Doktor randevusu için evden çık", priority: "critical" },
];

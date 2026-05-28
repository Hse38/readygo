import type { NotificationPlan } from "../../types/event.types";

export const flightNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Online check-in zamanı geldi", priority: "critical" },
  { title: "Bavulunu kontrol et", priority: "important" },
  { title: "Evden çıkma zamanı", priority: "critical" },
];

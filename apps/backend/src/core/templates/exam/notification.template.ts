import type { NotificationPlan } from "../../types/event.types";

export const examNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Son tekrar zamanın geldi", priority: "important" },
  { title: "Sınav için evden çık", priority: "critical" },
  { title: "Kimlik ve malzemeleri unutma", priority: "important" },
];

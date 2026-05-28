import type { NotificationPlan } from "../../types/event.types";

export const weddingNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Düğün için hazırlıklarını tamamla", priority: "important" },
  { title: "Evden çıkma zamanı", priority: "critical" },
];

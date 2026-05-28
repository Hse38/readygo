import type { NotificationPlan } from "../../types/event.types";

export const meetingNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Toplantı öncesi son kontrol", priority: "important" },
  { title: "Toplantı için yola çık", priority: "critical" },
];

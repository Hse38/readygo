import type { NotificationPlan } from "../core/types/event.types";
import { PushNotificationProvider } from "../core/notifications/push.provider";

export class NotificationSchedulerService {
  async schedule(plans: NotificationPlan[], eventId: string): Promise<void> {
    const provider = new PushNotificationProvider();
    await provider.schedule(
      plans.map((plan) => ({
        eventId,
        title: plan.title,
        scheduledAt: plan.scheduledAt,
        priority:
          plan.priority === "critical"
            ? "CRITICAL"
            : plan.priority === "important"
              ? "IMPORTANT"
              : "OPTIONAL",
      }))
    );
  }
}

export const notificationSchedulerService = new NotificationSchedulerService();

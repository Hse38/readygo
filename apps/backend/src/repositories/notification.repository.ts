import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class NotificationRepository {
  async createNotificationPlans(data: Prisma.NotificationPlanCreateManyInput[]): Promise<void> {
    if (data.length === 0) return;
    await prisma.notificationPlan.createMany({ data });
  }

  listByEvent(eventId: string) {
    return prisma.notificationPlan.findMany({
      where: { eventId },
      orderBy: { scheduledAt: "asc" },
    });
  }
}

export const notificationRepository = new NotificationRepository();

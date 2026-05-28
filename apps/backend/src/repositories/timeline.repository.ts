import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class TimelineRepository {
  async createTimelineItems(data: Prisma.TimelineItemCreateManyInput[]): Promise<void> {
    if (data.length === 0) return;
    await prisma.timelineItem.createMany({ data });
  }

  listByEvent(eventId: string) {
    return prisma.timelineItem.findMany({
      where: { eventId },
      orderBy: { scheduledAt: "asc" },
    });
  }
}

export const timelineRepository = new TimelineRepository();

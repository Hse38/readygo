import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class ChecklistRepository {
  async createChecklistItems(data: Prisma.ChecklistItemCreateManyInput[]): Promise<void> {
    if (data.length === 0) return;
    await prisma.checklistItem.createMany({ data });
  }

  listByEvent(eventId: string) {
    return prisma.checklistItem.findMany({
      where: { eventId },
      orderBy: { scheduledAt: "asc" },
    });
  }

  getById(itemId: string) {
    return prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { event: { select: { userId: true } } },
    });
  }

  updateCompletion(itemId: string, isCompleted: boolean) {
    return prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });
  }
}

export const checklistRepository = new ChecklistRepository();

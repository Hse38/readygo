import { EventProcessingState, type Event, type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class EventRepository {
  createEvent(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return prisma.event.create({ data });
  }

  getByIdForUser(eventId: string, userId: string) {
    return prisma.event.findFirst({
      where: { id: eventId, userId },
      include: {
        checklistItems: { orderBy: { scheduledAt: "asc" } },
      },
    });
  }

  listByUser(userId: string) {
    return prisma.event.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: {
        checklistItems: { orderBy: { scheduledAt: "asc" } },
      },
    });
  }

  updateProcessingState(params: {
    eventId: string;
    state: EventProcessingState;
    processingError?: string | null;
    retryCount?: number;
    startedAt?: Date | null;
    finishedAt?: Date | null;
  }) {
    return prisma.event.update({
      where: { id: params.eventId },
      data: {
        processingState: params.state,
        processingError: params.processingError ?? null,
        retryCount: params.retryCount,
        processingStartedAt: params.startedAt ?? undefined,
        processingFinishedAt: params.finishedAt ?? undefined,
      },
    });
  }

  updateIntelligenceMetadata(eventId: string, data: Prisma.EventUpdateInput) {
    return prisma.event.update({
      where: { id: eventId },
      data,
    });
  }
}

export const eventRepository = new EventRepository();

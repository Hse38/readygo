import {
  EventType as PrismaEventType,
  EventProcessingState,
  type ChecklistItem,
  type Event,
  type User,
} from "@prisma/client";
import { processEvent } from "../core/engine/event.engine";
import { detectEventType } from "../core/types/event.types";
import { shouldProcessEvent, computeProcessingHash } from "../core/idempotency/should-process-event";
import { getCurrentVersionSet, toVersionString } from "../core/versioning/version.manager";
import { logProcessingStage } from "../core/logging/processing.logger";
import { markFailed, markProcessed, startProcessing } from "../core/state/event.state-machine";
import { checklistRepository } from "../repositories/checklist.repository";
import { eventRepository } from "../repositories/event.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { timelineRepository } from "../repositories/timeline.repository";
import { userRepository } from "../repositories/user.repository";

export class EventProcessingService {
  async createAndProcessEvent(userId: string, data: {
    title: string;
    type: string;
    date: Date;
    location?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    travelMode?: string | null;
  }): Promise<{ event: Event; checklistItems: ChecklistItem[] }> {
    const eventType = detectEventType(data.type);
    const event = await eventRepository.createEvent({
      userId,
      title: data.title,
      type: eventType as unknown as PrismaEventType,
      date: data.date,
      location: data.location ?? null,
      locationLat: data.locationLat ?? null,
      locationLng: data.locationLng ?? null,
      travelMode: data.travelMode ?? null,
      processingState: EventProcessingState.created,
    });

    await this.processEventById(event.id, userId);

    const checklistItems = await checklistRepository.listByEvent(event.id);
    const refreshed = await eventRepository.getByIdForUser(event.id, userId);
    if (!refreshed) throw new Error("Event not found after processing");
    return { event: refreshed, checklistItems };
  }

  async processEventById(eventId: string, userId: string): Promise<void> {
    const event = await eventRepository.getByIdForUser(eventId, userId);
    if (!event) throw new Error("Event not found");

    if (!shouldProcessEvent(event)) return;

    const start = new Date();
    await logProcessingStage({
      eventId,
      stage: "pipeline",
      status: "started",
      startedAt: start,
      metadata: { state: event.processingState },
    });

    await eventRepository.updateProcessingState({
      eventId,
      state: startProcessing(event.processingState),
      startedAt: start,
      retryCount: event.retryCount,
    });

    try {
      const intelligence = processEvent({
        id: event.id,
        userId: event.userId,
        title: event.title,
        type: detectEventType(event.type),
        date: event.date,
        location: event.location,
        locationLat: event.locationLat,
        locationLng: event.locationLng,
        travelMode: event.travelMode,
        metadata: (event.metadata as Record<string, unknown> | null) ?? null,
      });

      await checklistRepository.createChecklistItems(
        intelligence.checklist.map((item) => ({
          eventId: event.id,
          title: item.title,
          scheduledAt: item.scheduledAt,
          priority: item.priority,
          source: item.source,
        }))
      );
      await timelineRepository.createTimelineItems(
        intelligence.timeline.map((item) => ({
          eventId: event.id,
          title: item.title,
          scheduledAt: item.scheduledAt,
          type: item.type,
          priority: item.priority,
        }))
      );
      await notificationRepository.createNotificationPlans(
        intelligence.notifications.map((item) => ({
          eventId: event.id,
          title: item.title,
          scheduledAt: item.scheduledAt,
          priority: item.priority,
        }))
      );

      const versions = getCurrentVersionSet();
      await eventRepository.updateIntelligenceMetadata(event.id, {
        metadata: {
          leaveHomeAt: intelligence.leaveHomeAt.toISOString(),
          eventType: intelligence.eventType,
        },
        processedAt: intelligence.processedAt,
        processingFinishedAt: new Date(),
        processingError: null,
        processingHash: computeProcessingHash(event),
        lastProcessedVersion: toVersionString(versions),
        engineVersion: versions.engineVersion,
        templateVersion: versions.templateVersion,
        timelineVersion: versions.timelineVersion,
        notificationVersion: versions.notificationVersion,
        travelVersion: versions.travelVersion,
        intelligenceVersion: intelligence.intelligenceVersion,
        processingState: markProcessed(EventProcessingState.processing),
      });

      await logProcessingStage({
        eventId,
        stage: "pipeline",
        status: "success",
        startedAt: start,
        finishedAt: new Date(),
      });
    } catch (error) {
      await eventRepository.updateProcessingState({
        eventId,
        state: markFailed(EventProcessingState.processing),
        processingError: error instanceof Error ? error.message : "Unknown error",
        retryCount: event.retryCount + 1,
        finishedAt: new Date(),
      });

      await logProcessingStage({
        eventId,
        stage: "pipeline",
        status: "failed",
        startedAt: start,
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  getEventsByUser(userId: string) {
    return eventRepository.listByUser(userId);
  }

  getEventById(userId: string, eventId: string) {
    return eventRepository.getByIdForUser(eventId, userId);
  }

  getChecklist(eventId: string) {
    return checklistRepository.listByEvent(eventId);
  }

  getChecklistItem(itemId: string) {
    return checklistRepository.getById(itemId);
  }

  updateChecklistItem(itemId: string, isCompleted: boolean) {
    return checklistRepository.updateCompletion(itemId, isCompleted);
  }

  getUserById(userId: string): Promise<User | null> {
    return userRepository.getById(userId);
  }
}

export const eventProcessingService = new EventProcessingService();

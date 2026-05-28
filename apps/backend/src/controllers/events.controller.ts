import type { ChecklistItem, Event } from "@prisma/client";
import type { Request, Response } from "express";
import { eventProcessingService } from "../services/event-processing.service";
import type {
  ChecklistItemResponse,
  CreateEventBody,
  CreateEventResponse,
  EventDetailResponse,
  EventWithChecklist,
  EventsListResponse,
  UpdateChecklistItemBody,
  UpdateChecklistItemResponse
} from "../types/events.types";

type EventWithItems = Event & { checklistItems: ChecklistItem[] };

function toChecklistItem(item: ChecklistItem): ChecklistItemResponse {
  return {
    id: item.id,
    eventId: item.eventId,
    title: item.title,
    isCompleted: item.isCompleted,
    scheduledAt: item.scheduledAt,
  };
}

function toEventWithChecklist(event: EventWithItems): EventWithChecklist {
  return {
    id: event.id,
    userId: event.userId,
    title: event.title,
    type: String(event.type),
    date: event.date,
    location: event.location,
    locationLat: event.locationLat,
    locationLng: event.locationLng,
    travelMode: event.travelMode,
    createdAt: event.createdAt,
    checklistItems: event.checklistItems.map(toChecklistItem),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidOptionalCoordinate(value: unknown): value is number | undefined {
  if (value === undefined) return true;
  return typeof value === "number" && !Number.isNaN(value);
}

function getRouteParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function validateCreateEventBody(body: unknown): CreateEventBody | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.title) || !isNonEmptyString(data.type)) return null;
  if (typeof data.date !== "string" || Number.isNaN(Date.parse(data.date))) return null;

  if (
    data.location !== undefined &&
    data.location !== null &&
    typeof data.location !== "string"
  ) {
    return null;
  }

  if (
    data.travelMode !== undefined &&
    data.travelMode !== null &&
    typeof data.travelMode !== "string"
  ) {
    return null;
  }

  if (
    !isValidOptionalCoordinate(data.locationLat) ||
    !isValidOptionalCoordinate(data.locationLng)
  ) {
    return null;
  }

  return {
    title: data.title.trim(),
    type: data.type.trim(),
    date: data.date,
    location:
      typeof data.location === "string" ? data.location.trim() : undefined,
    locationLat: data.locationLat as number | undefined,
    locationLng: data.locationLng as number | undefined,
    travelMode:
      typeof data.travelMode === "string" ? data.travelMode.trim() : undefined,
  };
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = validateCreateEventBody(req.body);
    if (!body) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const user = await eventProcessingService.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const eventDate = new Date(body.date);
    const { event, checklistItems } = await eventProcessingService.createAndProcessEvent(userId, {
      title: body.title,
      type: body.type,
      date: eventDate,
      location: body.location ?? null,
      locationLat: body.locationLat ?? null,
      locationLng: body.locationLng ?? null,
      travelMode: body.travelMode ?? null,
    });

    const eventWithChecklist: EventWithItems = { ...event, checklistItems };

    const response: CreateEventResponse = {
      event: toEventWithChecklist(eventWithChecklist),
      checklistItems: checklistItems.map(toChecklistItem),
    };

    res.status(201).json(response);
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getEvents(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const events = await eventProcessingService.getEventsByUser(userId);

    const response: EventsListResponse = {
      events: events.map(toEventWithChecklist),
    };

    res.json(response);
  } catch (err) {
    console.error("Get events error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getEventById(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = getRouteParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const event = await eventProcessingService.getEventById(userId, id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const response: EventDetailResponse = {
      event: toEventWithChecklist(event as EventWithItems),
    };

    res.json(response);
  } catch (err) {
    console.error("Get event by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getEventChecklist(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const id = getRouteParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const event = await eventProcessingService.getEventById(userId, id);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const checklistItems = await eventProcessingService.getChecklist(id);

    res.json({ checklistItems: checklistItems.map(toChecklistItem) });
  } catch (err) {
    console.error("Get event checklist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

function validateUpdateChecklistBody(body: unknown): UpdateChecklistItemBody | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  if (typeof data.isCompleted !== "boolean") return null;
  return { isCompleted: data.isCompleted };
}

export async function updateChecklistItem(
  req: Request<{ itemId: string }, object, UpdateChecklistItemBody>,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const itemId = getRouteParam(req.params.itemId);
    if (!itemId) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const body = validateUpdateChecklistBody(req.body);
    if (!body) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const existing = await eventProcessingService.getChecklistItem(itemId);

    if (!existing) {
      res.status(404).json({ error: "Checklist item not found" });
      return;
    }

    if (existing.event.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const item = await eventProcessingService.updateChecklistItem(itemId, body.isCompleted);

    const response: UpdateChecklistItemResponse = {
      item: toChecklistItem(item),
    };

    res.json(response);
  } catch (err) {
    console.error("Update checklist item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

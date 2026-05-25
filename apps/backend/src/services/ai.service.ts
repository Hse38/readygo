import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Event, User } from "@prisma/client";
import { config } from "../lib/config";
import { mapsService } from "./maps.service";

export interface GeneratedChecklistItem {
  title: string;
  scheduledAt: Date;
  order: number;
}

const SYSTEM_PROMPT = `You are a smart event preparation assistant. Given an event, generate a preparation checklist with smart scheduling.

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "title": "task title",
    "scheduledAt": "ISO datetime string",
    "order": number
  }
]

Rules:
- For flights: include "Pack luggage" (3 days before), "Online check-in" (exactly 24h before departure), "Leave home" (calculated from travelMode), "Arrive at airport" (90 min before)
- For exams: include study reminders (1 week, 3 days, 1 day before), "Prepare materials" (night before), "Leave home" (travel time before)
- For weddings: include "Prepare outfit" (1 week before), "Buy gift" (3 days before), "Leave home" (travel time before)
- For doctor: include "Prepare documents" (1 day before), "Leave home" (travel time before)
- For other types: generate 3-6 sensible preparation tasks
- "Leave home" scheduledAt must account for travelMode: walking=slower, transit=moderate, driving=faster
- All times must be before the event date`;

interface RawChecklistItem {
  title?: string;
  scheduledAt?: string;
  order?: number;
}

function subtractMs(date: Date, ms: number): Date {
  return new Date(date.getTime() - ms);
}

function formatCoords(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

function resolveOrigin(user: User): string | null {
  if (user.homeLocationLat != null && user.homeLocationLng != null) {
    return formatCoords(user.homeLocationLat, user.homeLocationLng);
  }
  if (user.homeLocation) return user.homeLocation;
  return null;
}

function resolveDestination(event: Event): string | null {
  if (event.locationLat != null && event.locationLng != null) {
    return formatCoords(event.locationLat, event.locationLng);
  }
  if (event.location) return event.location;
  return null;
}

function getTravelMode(event: Event, user: User): string {
  return event.travelMode ?? user.transportMode ?? "driving";
}

function buildDefaultChecklist(event: Event, user: User): GeneratedChecklistItem[] {
  const eventDate = new Date(event.date);
  const travelMode = getTravelMode(event, user);

  const leaveHomeOffset =
    travelMode === "walking"
      ? 60 * 60 * 1000
      : travelMode === "transit"
        ? 45 * 60 * 1000
        : 30 * 60 * 1000;

  return [
    {
      title: "Review event details",
      scheduledAt: subtractMs(eventDate, 24 * 60 * 60 * 1000),
      order: 1,
    },
    {
      title: "Prepare essentials",
      scheduledAt: subtractMs(eventDate, 12 * 60 * 60 * 1000),
      order: 2,
    },
    {
      title: "Leave home",
      scheduledAt: subtractMs(eventDate, leaveHomeOffset),
      order: 3,
    },
  ];
}

function parseGeminiJson(text: string): RawChecklistItem[] | null {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(withoutFence) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as RawChecklistItem[];
  } catch {
    return null;
  }
}

function normalizeItems(
  raw: RawChecklistItem[],
  eventDate: Date
): GeneratedChecklistItem[] {
  const items: GeneratedChecklistItem[] = [];

  for (const entry of raw) {
    if (!entry.title || !entry.scheduledAt) continue;

    const scheduledAt = new Date(entry.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) continue;
    if (scheduledAt >= eventDate) {
      scheduledAt.setTime(eventDate.getTime() - 60 * 60 * 1000);
    }

    items.push({
      title: entry.title,
      scheduledAt,
      order: typeof entry.order === "number" ? entry.order : items.length + 1,
    });
  }

  return items.sort((a, b) => a.order - b.order);
}

async function adjustLeaveHomeItems(
  items: GeneratedChecklistItem[],
  event: Event,
  user: User
): Promise<GeneratedChecklistItem[]> {
  const origin = resolveOrigin(user);
  const destination = resolveDestination(event);
  const travelMode = getTravelMode(event, user);
  const eventDate = new Date(event.date);

  if (!origin || !destination) return items;

  const travel = await mapsService.getTravelTime(origin, destination, travelMode);
  const bufferMs = 10 * 60 * 1000;
  const leaveAt = subtractMs(
    eventDate,
    travel.durationSeconds * 1000 + bufferMs
  );

  return items.map((item) => {
    if (!item.title.toLowerCase().includes("leave home")) return item;
    return { ...item, scheduledAt: leaveAt };
  });
}

async function callGemini(event: Event, user: User): Promise<GeneratedChecklistItem[] | null> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured");
    return null;
  }

  const userMessage = JSON.stringify({
    eventType: event.type,
    eventTitle: event.title,
    eventDate: event.date.toISOString(),
    eventLocation: event.location,
    travelMode: getTravelMode(event, user),
    userHomeLocation: user.homeLocation,
  });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  const raw = parseGeminiJson(text);

  if (!raw || raw.length === 0) return null;

  const eventDate = new Date(event.date);
  const items = normalizeItems(raw, eventDate);
  return items.length > 0 ? items : null;
}

export async function generateChecklist(
  event: Event,
  user: User
): Promise<GeneratedChecklistItem[]> {
  try {
    let items = await callGemini(event, user);

    if (!items) {
      items = buildDefaultChecklist(event, user);
    }

    return adjustLeaveHomeItems(items, event, user);
  } catch (err) {
    console.error("generateChecklist error:", err);
    const fallback = buildDefaultChecklist(event, user);
    return adjustLeaveHomeItems(fallback, event, user);
  }
}

export class AiService {
  generateChecklist = generateChecklist;
}

export const aiService = new AiService();

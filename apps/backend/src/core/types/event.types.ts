export enum EventType {
  FLIGHT = "flight",
  EXAM = "exam",
  WEDDING = "wedding",
  MEETING = "meeting",
  DOCTOR = "doctor",
  CONCERT = "concert",
  TRAVEL = "travel",
  SPORT = "sport",
  BIRTHDAY = "birthday",
  CEREMONY = "ceremony",
  LEGAL = "legal",
  OTHER = "other",
}

export type TransportMode = "walking" | "transit" | "driving" | "cycling";

export interface BaseEvent {
  id: string;
  userId: string;
  title: string;
  type: EventType;
  date: Date;
  location?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  travelMode?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GeneratedTimelineItem {
  title: string;
  scheduledAt: Date;
  type: string;
  priority: "critical" | "important" | "optional";
  order: number;
}

export interface GeneratedChecklistItem {
  title: string;
  scheduledAt: Date;
  priority: "critical" | "important" | "optional";
  source: "template" | "ai";
  order: number;
}

export interface NotificationPlan {
  title: string;
  scheduledAt: Date;
  priority: "critical" | "important" | "optional";
}

export function detectEventType(value: string | null | undefined): EventType {
  const normalized = (value ?? "").trim().toLowerCase();
  const known = Object.values(EventType) as string[];
  if (known.includes(normalized)) return normalized as EventType;
  return EventType.OTHER;
}

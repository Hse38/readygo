import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Event, User } from "@prisma/client";
import { config } from "../lib/config";
import { mapsService } from "./maps.service";

export interface GeneratedChecklistItem {
  title: string;
  scheduledAt: Date;
  order: number;
}

const SYSTEM_PROMPT = `You are a smart event preparation assistant for Turkish users.
Generate a detailed, practical preparation checklist based on the event type.
Return ONLY a JSON array, no markdown:
[{ "title": "task", "scheduledAt": "ISO datetime", "order": number }]

EVENT-SPECIFIC RULES:

FLIGHT (uçuş):
- "Bavul hazırla" → 3 days before
- "Online check-in yap" → exactly 24h before departure
- "Pasaport/kimlik kontrol et" → 2 days before
- "Havalimanı ulaşımını planla" → 1 day before
- "Evden çık" → calculated from travel time
- "Havalimanında ol" → 90 min before (domestic), 2h (international)

EXAM (sınav):
- "Çalışma programı oluştur" → 1 week before
- "Konu tekrarı yap" → 3 days before
- "Son tekrar" → 1 day before
- "Kırtasiye malzemelerini hazırla" → night before (kalem, silgi, kimlik)
- "Erken uyu" → night before
- "Kahvaltı yap" → morning of exam
- "Evden çık" → calculated from travel time

WEDDING (düğün):
- "Davetiyeyi kontrol et" → 1 week before
- "Kıyafet seç ve hazırla" → 1 week before
- "Hediye al" → 3 days before
- "Ulaşım planla" → 2 days before
- "Kıyafeti ütüle" → night before
- "Evden çık" → calculated

DOCTOR (doktor):
- "Sigorta kartını hazırla" → 1 day before
- "Önceki raporları topla" → 1 day before
- "Randevu saatini onayla" → 1 day before
- "Aç mı tok mu gidilmeli kontrol et" → 1 day before
- "Evden çık" → calculated

MEETING (toplantı):
- "Gündem hazırla" → 1 day before
- "Sunum/dokümanları hazırla" → 1 day before
- "Katılımcılara hatırlatma gönder" → morning of meeting
- "Teknik ekipmanları kontrol et" → 30 min before
- "Evden çık" → calculated

CONCERT (konser):
- "Bileti kontrol et" → 1 day before
- "Kıyafet seç" → 1 day before
- "Ulaşım planla" → 1 day before
- "Evden çık" → calculated

TRAVEL (seyahat):
- "Valize eşyaları topla" → 3 days before
- "Pasaport/vize kontrol et" → 1 week before
- "Otel rezervasyonunu onayla" → 2 days before
- "Ulaşım biletlerini kontrol et" → 1 day before
- "Ev/iş işlerini tamamla" → 1 day before
- "Evden çık" → calculated

SPORT (spor):
- "Spor kıyafetlerini hazırla" → night before
- "Su ve atıştırmalık hazırla" → morning of event
- "Ekipmanları kontrol et" → night before
- "Evden çık" → calculated

BIRTHDAY (doğum günü):
- "Hediye al" → 3 days before
- "Kart/mesaj hazırla" → 1 day before
- "Kıyafet seç" → 1 day before
- "Evden çık" → calculated

CEREMONY (tören):
- "Davetiyeyi kontrol et" → 1 week before
- "Kıyafet hazırla" → 3 days before
- "Hediye/çiçek al" → 1 day before
- "Evden çık" → calculated

LEGAL (resmi işlem):
- "Gerekli belgeleri listele" → 3 days before
- "Belgelerin fotokopisini çek" → 1 day before
- "Randevuyu onayla" → 1 day before
- "Evden çık" → calculated

OTHER (diğer):
- Generate 4-6 sensible preparation tasks based on the event title
- Include "Evden çık" if location is provided

GENERAL RULES:
- All task titles must be in Turkish
- "Evden çık" scheduledAt = eventTime minus travelDuration
- All times must be BEFORE the event date
- Never schedule tasks after the event
- Return minimum 4, maximum 8 tasks
- Order tasks chronologically`;

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

function isLeaveHomeTask(title: string): boolean {
  const lower = title.toLocaleLowerCase("tr");
  return (
    lower.includes("evden çık") ||
    lower.includes("evden cik") ||
    lower.includes("leave home")
  );
}

function hasLocation(event: Event): boolean {
  return Boolean(event.location?.trim()) || (event.locationLat != null && event.locationLng != null);
}

type ChecklistTemplate = { title: string; offsetMs: number }[];

const FALLBACK_BY_TYPE: Record<string, ChecklistTemplate> = {
  flight: [
    { title: "Bavul hazırla", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Pasaport/kimlik kontrol et", offsetMs: 2 * 24 * 60 * 60 * 1000 },
    { title: "Havalimanı ulaşımını planla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Online check-in yap", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Havalimanında ol", offsetMs: 90 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  exam: [
    { title: "Çalışma programı oluştur", offsetMs: 7 * 24 * 60 * 60 * 1000 },
    { title: "Konu tekrarı yap", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Son tekrar", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Kırtasiye malzemelerini hazırla", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Erken uyu", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Kahvaltı yap", offsetMs: 2 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  wedding: [
    { title: "Davetiyeyi kontrol et", offsetMs: 7 * 24 * 60 * 60 * 1000 },
    { title: "Kıyafet seç ve hazırla", offsetMs: 7 * 24 * 60 * 60 * 1000 },
    { title: "Hediye al", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Ulaşım planla", offsetMs: 2 * 24 * 60 * 60 * 1000 },
    { title: "Kıyafeti ütüle", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  doctor: [
    { title: "Sigorta kartını hazırla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Önceki raporları topla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Randevu saatini onayla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Aç mı tok mu gidilmeli kontrol et", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  meeting: [
    { title: "Gündem hazırla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Sunum/dokümanları hazırla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Katılımcılara hatırlatma gönder", offsetMs: 3 * 60 * 60 * 1000 },
    { title: "Teknik ekipmanları kontrol et", offsetMs: 30 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  concert: [
    { title: "Bileti kontrol et", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Kıyafet seç", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Ulaşım planla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  travel: [
    { title: "Pasaport/vize kontrol et", offsetMs: 7 * 24 * 60 * 60 * 1000 },
    { title: "Valize eşyaları topla", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Otel rezervasyonunu onayla", offsetMs: 2 * 24 * 60 * 60 * 1000 },
    { title: "Ulaşım biletlerini kontrol et", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Ev/iş işlerini tamamla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  sport: [
    { title: "Ekipmanları kontrol et", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Spor kıyafetlerini hazırla", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Su ve atıştırmalık hazırla", offsetMs: 2 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  birthday: [
    { title: "Hediye al", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Kart/mesaj hazırla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Kıyafet seç", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  ceremony: [
    { title: "Davetiyeyi kontrol et", offsetMs: 7 * 24 * 60 * 60 * 1000 },
    { title: "Kıyafet hazırla", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Hediye/çiçek al", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
  legal: [
    { title: "Gerekli belgeleri listele", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Belgelerin fotokopisini çek", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Randevuyu onayla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Evden çık", offsetMs: 45 * 60 * 1000 },
  ],
};

function buildDefaultChecklist(event: Event, user: User): GeneratedChecklistItem[] {
  const eventDate = new Date(event.date);
  const typeKey = event.type.toLowerCase();
  const template = FALLBACK_BY_TYPE[typeKey];

  const travelMode = getTravelMode(event, user);
  const leaveHomeOffset =
    travelMode === "walking"
      ? 60 * 60 * 1000
      : travelMode === "transit"
        ? 45 * 60 * 1000
        : 30 * 60 * 1000;

  if (template) {
    const items = template
      .filter((entry) => isLeaveHomeTask(entry.title) ? hasLocation(event) : true)
      .map((entry, index) => ({
        title: entry.title,
        scheduledAt: subtractMs(
          eventDate,
          entry.title === "Evden çık" ? leaveHomeOffset : entry.offsetMs
        ),
        order: index + 1,
      }));

    return items.slice(0, 8);
  }

  const generic: ChecklistTemplate = [
    { title: "Etkinlik detaylarını gözden geçir", offsetMs: 3 * 24 * 60 * 60 * 1000 },
    { title: "Gerekli malzemeleri hazırla", offsetMs: 24 * 60 * 60 * 1000 },
    { title: "Kıyafet ve eşyaları hazırla", offsetMs: 12 * 60 * 60 * 1000 },
    { title: "Ulaşım planla", offsetMs: 24 * 60 * 60 * 1000 },
  ];

  if (hasLocation(event)) {
    generic.push({ title: "Evden çık", offsetMs: leaveHomeOffset });
  }

  return generic.map((entry, index) => ({
    title: entry.title,
    scheduledAt: subtractMs(eventDate, entry.offsetMs),
    order: index + 1,
  }));
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

  const sorted = items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return sorted.slice(0, 8).map((item, index) => ({ ...item, order: index + 1 }));
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
  const leaveAt = subtractMs(eventDate, travel.durationSeconds * 1000 + bufferMs);

  return items.map((item) => {
    if (!isLeaveHomeTask(item.title)) return item;
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
    hasLocation: hasLocation(event),
    travelMode: getTravelMode(event, user),
    userHomeLocation: user.homeLocation,
    locale: "tr",
    instructions:
      "Follow EVENT-SPECIFIC RULES for the given eventType. Use Turkish titles only. Include Evden çık only when hasLocation is true.",
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
  return items.length >= 4 ? items : null;
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

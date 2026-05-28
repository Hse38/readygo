import { generateChecklist } from "./checklist.engine";
import { generateTimeline } from "./timeline.engine";
import { generateNotificationPlan } from "./notification.engine";
import { computeTravelPlan } from "./travel.engine";
import { EventType, type BaseEvent, type NotificationPlan, detectEventType } from "../types/event.types";
import type { ChecklistTemplateItem, GeneratedChecklistEntry } from "../types/checklist.types";
import type { GeneratedTimelineEntry, TimelineTemplateItem } from "../types/timeline.types";

import { flightChecklistTemplate } from "../templates/flight/checklist.template";
import { flightTimelineTemplate } from "../templates/flight/timeline.template";
import { examChecklistTemplate } from "../templates/exam/checklist.template";
import { examTimelineTemplate } from "../templates/exam/timeline.template";
import { weddingChecklistTemplate } from "../templates/wedding/checklist.template";
import { weddingTimelineTemplate } from "../templates/wedding/timeline.template";
import { meetingChecklistTemplate } from "../templates/meeting/checklist.template";
import { meetingTimelineTemplate } from "../templates/meeting/timeline.template";
import { doctorChecklistTemplate } from "../templates/doctor/checklist.template";
import { doctorTimelineTemplate } from "../templates/doctor/timeline.template";
import { flightNotificationTemplate } from "../templates/flight/notification.template";
import { examNotificationTemplate } from "../templates/exam/notification.template";
import { weddingNotificationTemplate } from "../templates/wedding/notification.template";
import { meetingNotificationTemplate } from "../templates/meeting/notification.template";
import { doctorNotificationTemplate } from "../templates/doctor/notification.template";

const genericChecklistTemplate: ChecklistTemplateItem[] = [
  { title: "Etkinlik detaylarını gözden geçir", offsetMinutes: -3 * 24 * 60, priority: "important" },
  { title: "Gerekli hazırlıkları tamamla", offsetMinutes: -24 * 60, priority: "important" },
  { title: "Evden çık", offsetMinutes: -45, priority: "critical" },
];

const genericTimelineTemplate: TimelineTemplateItem[] = [
  { title: "Hazırlık hatırlatması", offsetMinutes: -24 * 60, type: "prep", priority: "important" },
  { title: "Evden çık", offsetMinutes: -45, type: "departure", priority: "critical" },
];

const genericNotificationTemplate: Omit<NotificationPlan, "scheduledAt">[] = [
  { title: "Etkinlik hazırlığını kontrol et", priority: "important" },
];

export interface EventIntelligenceResult {
  eventType: EventType;
  timeline: GeneratedTimelineEntry[];
  checklist: GeneratedChecklistEntry[];
  notifications: NotificationPlan[];
  leaveHomeAt: Date;
  processedAt: Date;
  intelligenceVersion: number;
}

function loadChecklistTemplate(type: EventType): ChecklistTemplateItem[] {
  switch (type) {
    case EventType.FLIGHT:
      return flightChecklistTemplate;
    case EventType.EXAM:
      return examChecklistTemplate;
    case EventType.WEDDING:
      return weddingChecklistTemplate;
    case EventType.MEETING:
      return meetingChecklistTemplate;
    case EventType.DOCTOR:
      return doctorChecklistTemplate;
    default:
      return genericChecklistTemplate;
  }
}

function loadTimelineTemplate(type: EventType): TimelineTemplateItem[] {
  switch (type) {
    case EventType.FLIGHT:
      return flightTimelineTemplate;
    case EventType.EXAM:
      return examTimelineTemplate;
    case EventType.WEDDING:
      return weddingTimelineTemplate;
    case EventType.MEETING:
      return meetingTimelineTemplate;
    case EventType.DOCTOR:
      return doctorTimelineTemplate;
    default:
      return genericTimelineTemplate;
  }
}

function loadNotificationTemplate(type: EventType): Omit<NotificationPlan, "scheduledAt">[] {
  switch (type) {
    case EventType.FLIGHT:
      return flightNotificationTemplate;
    case EventType.EXAM:
      return examNotificationTemplate;
    case EventType.WEDDING:
      return weddingNotificationTemplate;
    case EventType.MEETING:
      return meetingNotificationTemplate;
    case EventType.DOCTOR:
      return doctorNotificationTemplate;
    default:
      return genericNotificationTemplate;
  }
}

function scheduleTemplateNotifications(
  eventDate: Date,
  template: Omit<NotificationPlan, "scheduledAt">[]
): NotificationPlan[] {
  return template.map((item, index) => ({
    ...item,
    scheduledAt: new Date(eventDate.getTime() - (index + 1) * 60 * 60 * 1000),
  }));
}

function patchLeaveHome(entries: GeneratedChecklistEntry[], leaveHomeAt: Date): GeneratedChecklistEntry[] {
  return entries.map((item) => {
    if (!item.title.toLocaleLowerCase("tr").includes("evden çık")) return item;
    return { ...item, scheduledAt: leaveHomeAt };
  });
}

export function processEvent(event: BaseEvent): EventIntelligenceResult {
  const eventType = detectEventType(event.type);
  const checklistTemplate = loadChecklistTemplate(eventType);
  const timelineTemplate = loadTimelineTemplate(eventType);

  const timeline = generateTimeline(event.date, timelineTemplate);
  const checklist = generateChecklist(event.date, checklistTemplate);
  const travel = computeTravelPlan(event.date, event.travelMode);
  const checklistWithTravel = patchLeaveHome(checklist, travel.leaveHomeAt);
  const deterministicNotifications = scheduleTemplateNotifications(
    event.date,
    loadNotificationTemplate(eventType)
  );
  const notifications = [
    ...deterministicNotifications,
    ...generateNotificationPlan(timeline, checklistWithTravel),
  ];

  return {
    eventType,
    timeline,
    checklist: checklistWithTravel,
    notifications,
    leaveHomeAt: travel.leaveHomeAt,
    processedAt: new Date(),
    intelligenceVersion: 1,
  };
}

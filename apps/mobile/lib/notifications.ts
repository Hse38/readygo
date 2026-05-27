import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import type { ChecklistItem, Event } from "../constants/types";

function notificationStorageKey(eventId: string): string {
  return `notifs_${eventId}`;
}

async function getStoredNotificationIds(eventId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(notificationStorageKey(eventId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

async function appendNotificationIds(
  eventId: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const existing = await getStoredNotificationIds(eventId);
  await AsyncStorage.setItem(
    notificationStorageKey(eventId),
    JSON.stringify([...existing, ...ids])
  );
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleChecklistNotifications(
  event: Event,
  checklistItems: ChecklistItem[]
): Promise<void> {
  const now = Date.now();
  const scheduledIds: string[] = [];

  for (const item of checklistItems) {
    if (!item.scheduledAt) continue;

    const triggerDate = new Date(item.scheduledAt);
    if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= now) {
      continue;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title,
        body: item.title,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    scheduledIds.push(notificationId);
  }

  await appendNotificationIds(event.id, scheduledIds);
}

export async function cancelEventNotifications(eventId: string): Promise<void> {
  const ids = await getStoredNotificationIds(eventId);

  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );

  await AsyncStorage.removeItem(notificationStorageKey(eventId));
}

type TransitStep = {
  type: "transit" | "walking";
  instruction: string;
  duration: string;
  line?: string;
};

type TransitDetails = {
  firstDeparture: string;
  steps: TransitStep[];
};

export async function scheduleLeaveHomeNotification(
  eventId: string,
  departureTime: string,
  eventTitle: string,
  transitDetails?: TransitDetails
): Promise<void> {
  const walkingSeconds =
    transitDetails?.steps
      ?.filter((step) => step.type === "walking")
      .map((step) => {
        const match = step.duration.match(/(\d+)/);
        return match ? Number.parseInt(match[1], 10) * 60 : 0;
      })
      .reduce((acc, value) => acc + value, 0) ?? 0;

  const transitBase = transitDetails?.firstDeparture
    ? new Date(transitDetails.firstDeparture).getTime()
    : null;
  const defaultBase = new Date(departureTime).getTime();
  const baseMs = transitBase ?? defaultBase;
  const triggerDate = new Date(
    transitBase ? baseMs - walkingSeconds * 1000 : baseMs
  );

  if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return;
  }

  const firstLine = transitDetails?.steps?.find(
    (step) => step.type === "transit" && step.line
  )?.line;
  const firstDepartureLabel = transitDetails?.firstDeparture
    ? new Date(transitDetails.firstDeparture).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const title = transitDetails?.firstDeparture
    ? "Otobüse yetişmek için çık! 🚌"
    : "Yola çıkma zamanı! 🚀";
  const body =
    transitDetails?.firstDeparture && firstDepartureLabel
      ? `İlk sefer: ${firstDepartureLabel}${firstLine ? ` — ${firstLine}` : ""}`
      : `${eventTitle} için evden çıkman gerekiyor`;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { eventId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await appendNotificationIds(eventId, [notificationId]);
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function getEventIdFromNotification(
  response: Notifications.NotificationResponse
): string | null {
  const eventId = response.notification.request.content.data?.eventId;
  return typeof eventId === "string" ? eventId : null;
}

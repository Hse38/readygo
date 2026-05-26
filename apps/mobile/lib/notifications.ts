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

export async function scheduleLeaveHomeNotification(
  eventId: string,
  departureTime: string,
  eventTitle: string
): Promise<void> {
  const triggerDate = new Date(departureTime);
  if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Yola çıkma zamanı! 🚀",
      body: `${eventTitle} için evden çıkman gerekiyor`,
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

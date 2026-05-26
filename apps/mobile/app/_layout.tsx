import "react-native-gesture-handler";
import "../global.css";

import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import {
  configureNotificationHandler,
  getEventIdFromNotification,
} from "../lib/notifications";

configureNotificationHandler();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    function navigateToEvent(eventId: string) {
      router.push(`/event/${eventId}`);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const eventId = getEventIdFromNotification(response);
      if (eventId) navigateToEvent(eventId);
    });

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const eventId = getEventIdFromNotification(response);
        if (eventId) navigateToEvent(eventId);
      });

    return () => subscription.remove();
  }, [router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-event" />
        <Stack.Screen name="event/[id]" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

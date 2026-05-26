import "react-native-gesture-handler";
import "../global.css";

import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import {
  configureNotificationHandler,
  getEventIdFromNotification,
} from "../lib/notifications";
import { getToken, getUser } from "../lib/storage";

configureNotificationHandler();

export default function RootLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getToken();
        if (token) {
          router.replace("/(tabs)/home");
        } else {
          const user = await getUser();
          if (user) {
            router.replace("/auth");
          } else {
            router.replace("/onboarding");
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

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
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
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

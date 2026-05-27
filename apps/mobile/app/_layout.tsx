import "react-native-gesture-handler";
import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking } from "react-native";
import { ThemeProvider, useDarkMode } from "../context/ThemeContext";

import {
  configureNotificationHandler,
  getEventIdFromNotification,
} from "../lib/notifications";
import { initI18n } from "../lib/i18n";

configureNotificationHandler();
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const router = useRouter();
  const { isDark } = useDarkMode();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initI18n();

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

    const handleDeepLink = (url: string) => {
      const match = url.match(/invite\/([^/?#]+)/);
      if (match?.[1]) {
        router.push(`/invite/${match[1]}`);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const deepLinkSubscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
      deepLinkSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-event" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="invite/[token]" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

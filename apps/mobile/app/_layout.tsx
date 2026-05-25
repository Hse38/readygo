import "react-native-gesture-handler";
import "../global.css";

import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getToken, getUser } from "../lib/storage";

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

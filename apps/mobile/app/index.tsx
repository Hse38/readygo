import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import type { User } from "../constants/types";
import { useTheme } from "../hooks/useTheme";
import { apiFetch } from "../lib/api";
import { isProfileComplete } from "../lib/profile";
import { getToken, getUser, saveUser } from "../lib/storage";

type ProfileResponse = { user: User };

function isUser(value: unknown): value is User {
  return !!value && typeof value === "object" && "id" in value;
}

export default function Index() {
  const { colors } = useTheme();
  const [href, setHref] = useState<string | null>(null);

  const checkToken = useCallback(() => {
    async function resolveRoute() {
      setHref(null);
      const token = (await getToken())?.trim() ?? null;

      if (!token) {
        setHref("/auth");
        return;
      }

      try {
        const response = await apiFetch<ProfileResponse>("/profile", {}, token);
        await saveUser(response.user);
        setHref(isProfileComplete(response.user) ? "/(tabs)/home" : "/onboarding");
        return;
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_SESSION_INVALID") {
          setHref("/auth");
          return;
        }

        const cached = await getUser();
        if (isUser(cached)) {
          setHref(isProfileComplete(cached) ? "/(tabs)/home" : "/onboarding");
          return;
        }

        setHref("/onboarding");
      }
    }
    void resolveRoute();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkToken();
    }, [checkToken])
  );

  if (!href) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={href} />;
}

import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../hooks/useTheme";
import { apiFetch } from "../lib/api";
import { isProfileComplete } from "../lib/profile";
import { getToken, saveUser } from "../lib/storage";
import type { User } from "../constants/types";

type ProfileResponse = { user: User };

export default function Index() {
  const { colors } = useTheme();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    async function resolveRoute() {
      const token = await getToken();
      if (!token) {
        setHref("/auth");
        return;
      }

      try {
        const response = await apiFetch<ProfileResponse>("/profile", {}, token);
        await saveUser(response.user);
        setHref(isProfileComplete(response.user) ? "/(tabs)/home" : "/onboarding");
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_SESSION_INVALID") {
          setHref("/auth");
          return;
        }
        setHref("/onboarding");
      }
    }

    void resolveRoute();
  }, []);

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

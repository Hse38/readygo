import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../hooks/useTheme";
import { apiFetch } from "../lib/api";
import { getToken, getUser } from "../lib/storage";

export default function Index() {
  const { colors } = useTheme();
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    async function resolveRoute() {
      const token = await getToken();
      if (token) {
        try {
          await apiFetch("/events", {}, token);
        } catch (error) {
          if (error instanceof Error && error.message === "AUTH_SESSION_INVALID") {
            setHref("/onboarding");
            return;
          }
        }
        setHref("/(tabs)/home");
        return;
      }

      const user = await getUser();
      if (user) {
        setHref("/auth");
        return;
      }

      setHref("/onboarding");
    }

    resolveRoute();
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

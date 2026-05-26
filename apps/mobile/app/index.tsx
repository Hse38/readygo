import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getToken, getUser } from "../lib/storage";

export default function Index() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    async function resolveRoute() {
      const token = await getToken();
      if (token) {
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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={href} />;
}

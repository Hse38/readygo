import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import type { User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { clearAll, getUser } from "../../lib/storage";

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const stored = await getUser();
    setUser(isUser(stored) ? stored : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function handleLogout() {
    await clearAll();
    router.replace("/onboarding");
  }

  function handleEditProfile() {
    Alert.alert("Yakında", "Profil düzenleme yakında eklenecek.");
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: spacing.xl }} contentContainerStyle={{ paddingBottom: spacing.xxl, paddingTop: spacing.lg }}>
        <Text variant="h1" style={{ marginBottom: spacing.xl }}>
          Profil
        </Text>

        <Card style={{ marginBottom: spacing.md }}>
          <InfoRow label="Ad" value={user?.name ?? "-"} />
          <InfoRow label="Soyad" value={user?.surname ?? "-"} />
          <InfoRow label="Meslek" value={user?.occupation ?? "-"} />
          <InfoRow label="İş Konumu" value={user?.workLocation ?? "-"} />
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <InfoRow label="Ev Konumu" value={user?.homeLocation ?? "-"} />
          <InfoRow label="Ulaşım Tercihi" value={user?.transportMode ?? "-"} />
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button onPress={handleEditProfile} variant="primary" size="lg">
            Profili Düzenle
          </Button>
          <Button onPress={handleLogout} variant="secondary" size="lg">
            Çıkış Yap
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: 4 }}>
        {label.toUpperCase()}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

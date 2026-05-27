import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import type { Event, User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { apiFetch } from "../../lib/api";
import { clearAll, getToken, getUser } from "../../lib/storage";

type EventsResponse = { events: Event[] };

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [language, setLanguage] = useState<"TR" | "EN">("TR");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const loadData = useCallback(async () => {
    const stored = await getUser();
    setUser(isUser(stored) ? stored : null);
    const token = await getToken();
    if (token) {
      try {
        const eventsResponse = await apiFetch<EventsResponse>("/events", {}, token);
        const events = eventsResponse.events ?? [];
        setEventCount(events.length);
        const completed = events
          .flatMap((event) => event.checklistItems ?? [])
          .filter((item) => item.isCompleted).length;
        setCompletedTasks(completed);
      } catch {
        setEventCount(0);
        setCompletedTasks(0);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleLogout() {
    await clearAll();
    router.replace("/onboarding");
  }

  const initials = `${user?.name?.[0] ?? ""}${user?.surname?.[0] ?? ""}`.toUpperCase() || "?";

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
        <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: radii.full,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="h2" color={colors.white}>{initials}</Text>
          </View>
          <Text variant="h3" style={{ marginTop: spacing.sm }}>
            {`${user?.name ?? ""} ${user?.surname ?? ""}`.trim() || "Kullanici"}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {user?.occupation || "Meslek belirtilmedi"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(eventCount)}</Text>
            <Text variant="caption" color={colors.textSecondary}>Etkinlik</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(completedTasks)}</Text>
            <Text variant="caption" color={colors.textSecondary}>Tamamlanan</Text>
          </Card>
        </View>

        <Card style={{ marginBottom: spacing.md }}>
          <InfoRow label="Meslek" value={user?.occupation} />
          <InfoRow label="Is Konumu" value={user?.workLocation} />
          <InfoRow label="Ev Konumu" value={user?.homeLocation} />
          <InfoRow label="Calisma Gunleri" value={user?.workDays?.join(", ")} />
          <InfoRow label="Ulasim" value={user?.transportMode} />
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <SettingRow label="Dil">
            <View style={{ flexDirection: "row", borderRadius: radii.full, backgroundColor: colors.backgroundSecondary, padding: 3 }}>
              <Pressable
                onPress={() => setLanguage("TR")}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, backgroundColor: language === "TR" ? colors.primary : "transparent" }}
              >
                <Text variant="caption" color={language === "TR" ? colors.white : colors.textSecondary}>TR</Text>
              </Pressable>
              <Pressable
                onPress={() => setLanguage("EN")}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, backgroundColor: language === "EN" ? colors.primary : "transparent" }}
              >
                <Text variant="caption" color={language === "EN" ? colors.white : colors.textSecondary}>EN</Text>
              </Pressable>
            </View>
          </SettingRow>
          <SettingRow label="Dark Mode">
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={darkMode ? colors.primary : colors.surface}
            />
          </SettingRow>
          <SettingRow label="Bildirimler">
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifications ? colors.primary : colors.surface}
            />
          </SettingRow>
        </Card>

        <Button variant="danger" size="lg" onPress={handleLogout}>
          Cikis Yap
        </Button>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text variant="caption" color={colors.textTertiary}>{label}</Text>
      <Text variant="body">{value || "-"}</Text>
    </View>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

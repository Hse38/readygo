import { useRouter } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import type { Event, User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { apiFetch } from "../../lib/api";
import { clearAll, getToken, getUser } from "../../lib/storage";
import { useTranslation } from "../../lib/i18n";

type EventsResponse = { events: Event[] };

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { t, locale, setLanguage } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventCount, setEventCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
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

  async function handleLanguageChange(next: "tr" | "en") {
    await setLanguage(next);
    try {
      await Updates.reloadAsync();
    } catch {
      // no-op if reload is unavailable
    }
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
            {`${user?.name ?? ""} ${user?.surname ?? ""}`.trim() || t("profile.user")}
          </Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            {user?.occupation || t("profile.professionMissing")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(eventCount)}</Text>
            <Text variant="caption" color={colors.textSecondary}>{t("profile.events")}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(completedTasks)}</Text>
            <Text variant="caption" color={colors.textSecondary}>{t("profile.completed")}</Text>
          </Card>
        </View>

        <Card style={{ marginBottom: spacing.md }}>
          <InfoRow label={t("profile.occupation")} value={user?.occupation} />
          <InfoRow label={t("profile.workLocation")} value={user?.workLocation} />
          <InfoRow label={t("profile.homeLocation")} value={user?.homeLocation} />
          <InfoRow label={t("profile.workDays")} value={user?.workDays?.join(", ")} />
          <InfoRow label={t("profile.transport")} value={user?.transportMode} />
        </Card>

        <Card style={{ marginBottom: spacing.xl }}>
          <SettingRow label={t("profile.language")}>
            <View style={{ flexDirection: "row", borderRadius: radii.full, backgroundColor: colors.backgroundSecondary, padding: 3 }}>
              <Pressable
                onPress={() => void handleLanguageChange("tr")}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, backgroundColor: locale === "tr" ? colors.primary : "transparent" }}
              >
                <Text variant="caption" color={locale === "tr" ? colors.white : colors.textSecondary}>TR</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleLanguageChange("en")}
                style={{ paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.full, backgroundColor: locale === "en" ? colors.primary : "transparent" }}
              >
                <Text variant="caption" color={locale === "en" ? colors.white : colors.textSecondary}>EN</Text>
              </Pressable>
            </View>
          </SettingRow>
          <SettingRow label={t("profile.darkMode")}>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={darkMode ? colors.primary : colors.surface}
            />
          </SettingRow>
          <SettingRow label={t("profile.notifications")}>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifications ? colors.primary : colors.surface}
            />
          </SettingRow>
        </Card>

        <Button variant="danger" size="lg" onPress={handleLogout}>
          {t("profile.logout")}
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
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

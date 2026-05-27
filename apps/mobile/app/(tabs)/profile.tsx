import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LocationInput } from "../../components/ui/LocationInput";
import { Text } from "../../components/ui/Text";
import type { Event, User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { apiFetch } from "../../lib/api";
import { clearAll, getToken, getUser, saveUser } from "../../lib/storage";
import { useTranslation } from "../../lib/i18n";

const PROFILE_PHOTO_KEY = "profile_photo_base64";

const WEEKDAYS = [
  { label: "Pzt", value: "monday" },
  { label: "Sal", value: "tuesday" },
  { label: "Car", value: "wednesday" },
  { label: "Per", value: "thursday" },
  { label: "Cum", value: "friday" },
  { label: "Cmt", value: "saturday" },
  { label: "Paz", value: "sunday" },
] as const;

const TRANSPORT_MODES = [
  { icon: "🚶", label: "Yuruyus", value: "walking" },
  { icon: "🚌", label: "Toplu Tasima", value: "transit" },
  { icon: "🚗", label: "Arac", value: "driving" },
  { icon: "🚲", label: "Bisiklet", value: "cycling" },
] as const;

type EventsResponse = { events: Event[] };
type ProfileResponse = { user: User };

type EditableProfile = {
  name: string;
  surname: string;
  occupation: string;
  workLocation: string;
  workLocationLat?: number;
  workLocationLng?: number;
  homeLocation: string;
  homeLocationLat?: number;
  homeLocationLng?: number;
  workDays: string[];
  transportMode: string;
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

function toEditableProfile(user: User | null): EditableProfile {
  return {
    name: user?.name ?? "",
    surname: user?.surname ?? "",
    occupation: user?.occupation ?? "",
    workLocation: user?.workLocation ?? "",
    workLocationLat: user?.workLocationLat ?? undefined,
    workLocationLng: user?.workLocationLng ?? undefined,
    homeLocation: user?.homeLocation ?? "",
    homeLocationLat: user?.homeLocationLat ?? undefined,
    homeLocationLng: user?.homeLocationLng ?? undefined,
    workDays: user?.workDays ?? [],
    transportMode: user?.transportMode ?? "driving",
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<EditableProfile>(toEditableProfile(null));

  const initials = useMemo(() => {
    const chars = `${user?.name?.[0] ?? ""}${user?.surname?.[0] ?? ""}`.toUpperCase();
    return chars || "?";
  }, [user]);

  const loadData = useCallback(async () => {
    const storedUser = await getUser();
    const typedUser = isUser(storedUser) ? storedUser : null;
    setUser(typedUser);
    setForm(toEditableProfile(typedUser));

    const storedPhoto = await AsyncStorage.getItem(PROFILE_PHOTO_KEY);
    setProfileImage(storedPhoto);

    const token = await getToken();
    if (token) {
      try {
        const eventsResponse = await apiFetch<EventsResponse>("/events", {}, token);
        const events = eventsResponse.events ?? [];
        setEventCount(events.length);
        setCompletedTasks(
          events.flatMap((event) => event.checklistItems ?? []).filter((item) => item.isCompleted)
            .length
        );
        const now = Date.now();
        setUpcomingEvents(
          events.filter((event) => new Date(event.date).getTime() >= now).length
        );
      } catch {
        setEventCount(0);
        setCompletedTasks(0);
        setUpcomingEvents(0);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveProfilePhoto(base64Uri: string | null) {
    if (!base64Uri) {
      await AsyncStorage.removeItem(PROFILE_PHOTO_KEY);
      setProfileImage(null);
      return;
    }
    await AsyncStorage.setItem(PROFILE_PHOTO_KEY, base64Uri);
    setProfileImage(base64Uri);
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    await saveProfilePhoto(`data:image/jpeg;base64,${asset.base64}`);
  }

  async function handlePickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(t("common.error"), "Kamera izni gerekli.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    await saveProfilePhoto(`data:image/jpeg;base64,${asset.base64}`);
  }

  function handleAvatarPress() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Iptal", "Kamera", "Galeri"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void handlePickFromCamera();
          if (index === 2) void handlePickFromGallery();
        }
      );
      return;
    }

    Alert.alert("Profil Fotografi", "Secim yap", [
      { text: "Kamera", onPress: () => void handlePickFromCamera() },
      { text: "Galeri", onPress: () => void handlePickFromGallery() },
      { text: "Iptal", style: "cancel" },
    ]);
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadi.");

      const payload = {
        name: form.name.trim(),
        surname: form.surname.trim(),
        occupation: form.occupation.trim(),
        workLocation: form.workLocation.trim(),
        workLocationLat: form.workLocationLat,
        workLocationLng: form.workLocationLng,
        homeLocation: form.homeLocation.trim(),
        homeLocationLat: form.homeLocationLat,
        homeLocationLng: form.homeLocationLng,
        workDays: form.workDays,
        transportMode: form.transportMode,
      };

      const response = await apiFetch<ProfileResponse>(
        "/profile",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
        token
      );

      setUser(response.user);
      await saveUser(response.user);
      setIsEditOpen(false);
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : "Profil guncellenemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await clearAll();
    await saveProfilePhoto(null);
    router.replace("/onboarding");
  }

  function toggleWorkDay(value: string) {
    setForm((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(value)
        ? prev.workDays.filter((day) => day !== value)
        : [...prev.workDays, value],
    }));
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, paddingHorizontal: spacing.xl }}
        contentContainerStyle={{ paddingBottom: spacing.xxl, paddingTop: spacing.lg }}
      >
        <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
          <Pressable
            onPress={handleAvatarPress}
            style={{
              width: 80,
              height: 80,
              borderRadius: radii.full,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text variant="h2" color={colors.white}>
                {initials}
              </Text>
            )}
          </Pressable>
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
            <Text variant="caption" color={colors.textSecondary}>
              {t("profile.events")}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(completedTasks)}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t("profile.completed")}
            </Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Text variant="h2">{String(upcomingEvents)}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t("profile.upcoming")}
            </Text>
          </Card>
        </View>

        <Card style={{ marginBottom: spacing.md }}>
          <InfoRow label={t("profile.occupation")} value={user?.occupation} />
          <InfoRow label={t("profile.workLocation")} value={user?.workLocation} />
          <InfoRow label={t("profile.homeLocation")} value={user?.homeLocation} />
          <InfoRow label={t("profile.workDays")} value={user?.workDays?.join(", ")} />
          <InfoRow label={t("profile.transport")} value={user?.transportMode} />
        </Card>

        <Card style={{ marginBottom: spacing.md }}>
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

        <View style={{ gap: spacing.sm }}>
          <Button size="lg" onPress={() => setIsEditOpen(true)}>
            Profili Duzenle
          </Button>
          <Button variant="danger" size="lg" onPress={handleLogout}>
            {t("profile.logout")}
          </Button>
        </View>
      </ScrollView>

      <Modal visible={isEditOpen} animationType="slide" onRequestClose={() => setIsEditOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: spacing.xl }}
            contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            <Text variant="h2" style={{ marginBottom: spacing.lg }}>
              Profili Duzenle
            </Text>
            <Input
              label={t("onboarding.name")}
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
            />
            <Input
              label={t("onboarding.surname")}
              value={form.surname}
              onChangeText={(text) => setForm((prev) => ({ ...prev, surname: text }))}
            />
            <Input
              label={t("onboarding.occupation")}
              value={form.occupation}
              onChangeText={(text) => setForm((prev) => ({ ...prev, occupation: text }))}
            />
            <LocationInput
              label={t("onboarding.workLocation")}
              value={form.workLocation}
              onLocationSelect={({ address, lat, lng }) =>
                setForm((prev) => ({
                  ...prev,
                  workLocation: address,
                  workLocationLat: address ? lat : undefined,
                  workLocationLng: address ? lng : undefined,
                }))
              }
            />
            <LocationInput
              label={t("onboarding.homeAddress")}
              value={form.homeLocation}
              onLocationSelect={({ address, lat, lng }) =>
                setForm((prev) => ({
                  ...prev,
                  homeLocation: address,
                  homeLocationLat: address ? lat : undefined,
                  homeLocationLng: address ? lng : undefined,
                }))
              }
            />

            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {t("onboarding.weekdays")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
              {WEEKDAYS.map((day) => {
                const selected = form.workDays.includes(day.value);
                return (
                  <Pressable
                    key={day.value}
                    onPress={() => toggleWorkDay(day.value)}
                    style={{
                      borderRadius: radii.full,
                      paddingHorizontal: spacing.lg,
                      paddingVertical: spacing.sm,
                      backgroundColor: selected ? colors.primary : colors.backgroundSecondary,
                    }}
                  >
                    <Text variant="bodySmall" color={selected ? colors.white : colors.textSecondary}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {t("onboarding.transport")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
              {TRANSPORT_MODES.map((mode) => {
                const selected = form.transportMode === mode.value;
                return (
                  <Pressable
                    key={mode.value}
                    onPress={() => setForm((prev) => ({ ...prev, transportMode: mode.value }))}
                    style={{
                      width: "48%",
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
                      padding: spacing.md,
                      alignItems: "center",
                    }}
                  >
                    <Text>{mode.icon}</Text>
                    <Text variant="bodySmall" style={{ marginTop: spacing.xs }}>
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Button onPress={() => void handleSaveProfile()} loading={isSaving} size="lg">
                {t("common.save")}
              </Button>
              <Button variant="ghost" onPress={() => setIsEditOpen(false)}>
                {t("common.cancel")}
              </Button>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text variant="caption" color={colors.textTertiary}>
        {label}
      </Text>
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
      }}
    >
      <Text variant="body">{label}</Text>
      {children}
    </View>
  );
}

import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { IconCalendar, IconClock, IconMapPin } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { LocationInput } from "../components/ui/LocationInput";
import { Text } from "../components/ui/Text";
import type { ChecklistItem, Event, User } from "../constants/types";
import { useTheme } from "../hooks/useTheme";
import { apiFetch } from "../lib/api";
import {
  requestPermissions,
  scheduleChecklistNotifications,
  scheduleLeaveHomeNotification,
} from "../lib/notifications";
import { getToken, getUser } from "../lib/storage";

const EVENT_TYPES = [
  { value: "flight", emoji: "✈️", label: "Ucus" },
  { value: "exam", emoji: "📝", label: "Sinav" },
  { value: "wedding", emoji: "💍", label: "Dugun" },
  { value: "doctor", emoji: "🏥", label: "Doktor" },
  { value: "meeting", emoji: "👔", label: "Toplanti" },
  { value: "concert", emoji: "🎵", label: "Konser" },
  { value: "travel", emoji: "🧳", label: "Seyahat" },
  { value: "sport", emoji: "🏋️", label: "Spor" },
  { value: "birthday", emoji: "🎂", label: "Dogum" },
] as const;

const TRANSPORT_MODES = [
  { icon: "🚶", label: "Yuruyus", value: "walking" },
  { icon: "🚌", label: "Toplu Tasima", value: "transit" },
  { icon: "🚗", label: "Arac", value: "driving" },
  { icon: "🚲", label: "Bisiklet", value: "cycling" },
] as const;

const TURKISH_MONTHS = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];
type EventType = (typeof EVENT_TYPES)[number]["value"];
type FormData = {
  type: EventType | "";
  title: string;
  eventDate: Date;
  eventTime: Date;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  travelMode: TransportMode | "";
};

type CreateEventResponse = { event: Event; checklistItems: ChecklistItem[] };
type TravelTimeResponse = {
  durationSeconds: number;
  durationText: string;
  distanceText: string;
  departureTime: string;
  transitDetails?: {
    firstDeparture: string;
    steps: Array<{ type: "transit" | "walking"; instruction: string; duration: string; line?: string }>;
  };
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object";
}

function combineDateAndTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

function formatDate(date: Date): string {
  return `${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function NewEventScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState<FormData>({
    type: "",
    title: "",
    eventDate: new Date(),
    eventTime: new Date(),
    location: "",
    locationLat: null,
    locationLng: null,
    travelMode: "",
  });

  useEffect(() => {
    async function loadDefaultTransport() {
      const stored = await getUser();
      if (isUser(stored) && stored.transportMode) {
        setForm((prev) => ({ ...prev, travelMode: stored.transportMode as TransportMode }));
      }
    }
    loadDefaultTransport();
  }, []);

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function animateStepChange(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  function validateStep(): boolean {
    if (step === 1 && !form.type) {
      Alert.alert("Eksik bilgi", "Lutfen etkinlik turu secin.");
      return false;
    }
    if (step === 2 && !form.title.trim()) {
      Alert.alert("Eksik bilgi", "Lutfen etkinlik basligini girin.");
      return false;
    }
    return true;
  }

  async function handleCreateEvent() {
    if (!form.type || !form.title.trim()) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadi.");
      const payload = {
        title: form.title.trim(),
        type: form.type,
        date: combineDateAndTime(form.eventDate, form.eventTime).toISOString(),
        location: form.location.trim() || undefined,
        locationLat: form.locationLat ?? undefined,
        locationLng: form.locationLng ?? undefined,
        travelMode: form.travelMode || undefined,
      };
      const response = await apiFetch<CreateEventResponse>(
        "/events",
        { method: "POST", body: JSON.stringify(payload) },
        token
      );

      if (await requestPermissions()) {
        await scheduleChecklistNotifications(response.event, response.checklistItems);
        const storedUser = await getUser();
        const user = isUser(storedUser) ? storedUser : null;
        const origin = user?.homeLocation?.trim();
        const destination = response.event.location?.trim();
        if (origin && destination) {
          try {
            const params = new URLSearchParams({
              origin,
              destination,
              mode: response.event.travelMode ?? user?.transportMode ?? "driving",
              eventTime: response.event.date,
            });
            const travel = await apiFetch<TravelTimeResponse>(`/travel-time?${params.toString()}`, {}, token);
            await scheduleLeaveHomeNotification(
              response.event.id,
              travel.departureTime,
              response.event.title,
              travel.transitDetails
            );
          } catch {
            // optional
          }
        }
      }
      router.replace(`/event/${response.event.id}`);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Etkinlik olusturulamadi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress = step / 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
          <Pressable onPress={() => (step === 1 ? router.replace("/(tabs)/home") : animateStepChange(step - 1))}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Geri
            </Text>
          </Pressable>
          <View
            style={{
              marginTop: spacing.sm,
              height: 3,
              borderRadius: radii.full,
              overflow: "hidden",
              backgroundColor: colors.borderLight,
            }}
          >
            <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.primary }} />
          </View>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs, textAlign: "right" }}>
            {step} / 3
          </Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: spacing.xl }} contentContainerStyle={{ paddingVertical: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 1 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  Etkinlik Turu
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {EVENT_TYPES.map((item) => {
                    const selected = form.type === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => updateForm("type", item.value)}
                        style={{
                          width: "31%",
                          aspectRatio: 1,
                          borderRadius: radii.lg,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                        <Text variant="caption" style={{ marginTop: spacing.xs, textAlign: "center" }}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  Etkinlik Detaylari
                </Text>
                <Input
                  label="Baslik"
                  value={form.title}
                  onChangeText={(t) => updateForm("title", t)}
                  placeholder="Kayseri Ucusu"
                />

                <Card style={{ marginBottom: spacing.md }}>
                  <Pressable onPress={() => setShowDatePicker(true)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconCalendar size={18} color={colors.textSecondary} />
                      <Text variant="body" style={{ marginLeft: spacing.sm }}>
                        {formatDate(form.eventDate)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" color={colors.textTertiary}>›</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowTimePicker(true)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconClock size={18} color={colors.textSecondary} />
                      <Text variant="body" style={{ marginLeft: spacing.sm }}>
                        {formatTime(form.eventTime)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" color={colors.textTertiary}>›</Text>
                  </Pressable>
                </Card>

                {showDatePicker ? (
                  <DateTimePicker
                    value={form.eventDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS === "android") setShowDatePicker(false);
                      if (event.type !== "dismissed" && selectedDate) updateForm("eventDate", selectedDate);
                    }}
                    minimumDate={new Date()}
                  />
                ) : null}
                {showTimePicker ? (
                  <DateTimePicker
                    value={form.eventTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    is24Hour
                    onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                      if (Platform.OS === "android") setShowTimePicker(false);
                      if (event.type !== "dismissed" && selectedTime) updateForm("eventTime", selectedTime);
                    }}
                  />
                ) : null}

                <LocationInput
                  label="Konum"
                  value={form.location}
                  placeholder="Sabiha Gokcen"
                  onLocationSelect={({ address, lat, lng }) => {
                    updateForm("location", address);
                    updateForm("locationLat", address ? lat : null);
                    updateForm("locationLng", address ? lng : null);
                  }}
                />

                <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                  Ulasim Sekli
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    {TRANSPORT_MODES.map((mode) => {
                      const selected = form.travelMode === mode.value;
                      return (
                        <Pressable
                          key={mode.value}
                          onPress={() => updateForm("travelMode", mode.value)}
                          style={{
                            borderRadius: radii.full,
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Text>{mode.icon}</Text>
                          <Text variant="bodySmall" style={{ marginLeft: spacing.xs }}>
                            {mode.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            ) : null}

            {step === 3 ? (
              <Card>
                <View style={{ alignItems: "center", marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 48 }}>
                    {EVENT_TYPES.find((e) => e.value === form.type)?.emoji ?? "📌"}
                  </Text>
                  <Text variant="h1" style={{ marginTop: spacing.sm, textAlign: "center" }}>
                    {form.title || "Etkinlik"}
                  </Text>
                </View>
                <DetailRow icon={<IconCalendar size={16} color={colors.textSecondary} />} label={formatDate(form.eventDate)} />
                <DetailRow icon={<IconClock size={16} color={colors.textSecondary} />} label={formatTime(form.eventTime)} />
                <DetailRow icon={<IconMapPin size={16} color={colors.textSecondary} />} label={form.location || "Belirtilmedi"} />
              </Card>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
          {step === 3 ? (
            <Button onPress={handleCreateEvent} loading={isSubmitting} size="lg" style={{ borderRadius: radii.xl }}>
              Etkinligi Olustur
            </Button>
          ) : (
            <Button
              onPress={() => {
                if (validateStep()) animateStepChange(step + 1);
              }}
              size="lg"
              style={{ borderRadius: radii.xl }}
            >
              Ileri
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
      {icon}
      <Text variant="body" style={{ marginLeft: spacing.sm }}>
        {label}
      </Text>
    </View>
  );
}

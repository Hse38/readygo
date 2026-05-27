import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { IconCalendar, IconClock, IconMapPin, IconRoute } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
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
import { useTranslation } from "../lib/i18n";
import { apiFetch } from "../lib/api";
import {
  requestPermissions,
  scheduleChecklistNotifications,
  scheduleLeaveHomeNotification,
} from "../lib/notifications";
import { getToken, getUser } from "../lib/storage";

type EventType =
  | "flight"
  | "exam"
  | "wedding"
  | "doctor"
  | "meeting"
  | "concert"
  | "travel"
  | "sport"
  | "birthday"
  | "ceremony"
  | "legal"
  | "other";

type EventTypeConfig = {
  value: EventType;
  emoji: string;
  label: string;
  color: string;
};

const TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  flight: { value: "flight", emoji: "✈️", label: "Uçuş", color: "#EEF2FF" },
  exam: { value: "exam", emoji: "📝", label: "Sınav", color: "#F0FDF4" },
  wedding: { value: "wedding", emoji: "💍", label: "Düğün", color: "#FDF4FF" },
  doctor: { value: "doctor", emoji: "🏥", label: "Doktor", color: "#FFF1F2" },
  meeting: { value: "meeting", emoji: "👔", label: "Toplantı", color: "#FFFBEB" },
  concert: { value: "concert", emoji: "🎵", label: "Konser", color: "#F0F9FF" },
  travel: { value: "travel", emoji: "🧳", label: "Seyahat", color: "#FFF7ED" },
  sport: { value: "sport", emoji: "🏋️", label: "Spor", color: "#F0FDF4" },
  birthday: { value: "birthday", emoji: "🎂", label: "Doğum Günü", color: "#FDF4FF" },
  ceremony: { value: "ceremony", emoji: "🎓", label: "Tören", color: "#FFFBEB" },
  legal: { value: "legal", emoji: "⚖️", label: "Resmi İşlem", color: "#F8FAFC" },
  other: { value: "other", emoji: "📌", label: "Diğer", color: "#F8F8F8" },
};

const EVENT_TYPES = Object.values(TYPE_CONFIG);

const TRANSPORT_MODES = [
  { icon: "🚶", label: "Yürüyüş", value: "walking" },
  { icon: "🚌", label: "Toplu Taşıma", value: "transit" },
  { icon: "🚗", label: "Araç", value: "driving" },
  { icon: "🚲", label: "Bisiklet", value: "cycling" },
] as const;

type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];
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
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function NewEventScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
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

  const selectedTypeConfig = selectedEventType ? TYPE_CONFIG[selectedEventType] : null;

  useEffect(() => {
    async function loadDefaultTransport() {
      const stored = await getUser();
      if (isUser(stored) && stored.transportMode) {
        setForm((prev) => ({ ...prev, travelMode: stored.transportMode as TransportMode }));
      }
    }
    void loadDefaultTransport();
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

  function selectEventType(type: EventType) {
    setSelectedEventType(type);
    updateForm("type", type);
  }

  function validateStep(): boolean {
    if (step === 1 && !selectedEventType) {
      Alert.alert(t("common.missingInfo"), t("newEvent.chooseType"));
      return false;
    }
    if (step === 2 && !form.title.trim()) {
      Alert.alert(t("common.missingInfo"), t("newEvent.chooseTitle"));
      return false;
    }
    return true;
  }

  async function handleCreateEvent() {
    if (!selectedEventType || !form.title.trim()) return;
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error(t("newEvent.noSession"));
      const payload = {
        title: form.title.trim(),
        type: selectedEventType,
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
      if (err instanceof Error && err.message === "AUTH_SESSION_INVALID") return;
      Alert.alert(t("common.error"), err instanceof Error ? err.message : t("newEvent.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress = step / 3;
  const selectedTransport = TRANSPORT_MODES.find((mode) => mode.value === form.travelMode);
  const isBottomButtonDisabled =
    isSubmitting ||
    (step === 1 && !selectedEventType) ||
    (step === 2 && !form.title.trim()) ||
    (step === 3 && !selectedEventType);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexShrink: 0 }}>
            <Pressable onPress={() => (step === 1 ? router.replace("/(tabs)/home") : animateStepChange(step - 1))}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {t("common.back")}
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

          <ScrollView
            style={{ flex: 1, paddingHorizontal: spacing.lg }}
            contentContainerStyle={{ paddingVertical: spacing.lg, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
            {step === 1 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("newEvent.typeTitle")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {EVENT_TYPES.map((item) => {
                    const selected = selectedEventType === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => selectEventType(item.value)}
                        style={{
                          width: "31%",
                          borderRadius: radii.lg,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: colors.surface,
                          alignItems: "center",
                          paddingVertical: spacing.md,
                          paddingHorizontal: spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: radii.lg,
                            backgroundColor: item.color,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
                        </View>
                        <Text variant="caption" style={{ marginTop: spacing.sm, textAlign: "center" }}>
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
                  {t("newEvent.detailTitle")}
                </Text>
                <Input
                  label={t("newEvent.title")}
                  value={form.title}
                  onChangeText={(value) => updateForm("title", value)}
                  placeholder={t("newEvent.titlePlaceholder")}
                />

                <Card style={{ marginBottom: spacing.md }}>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconCalendar size={18} color={colors.textSecondary} />
                      <Text variant="body" style={{ marginLeft: spacing.sm }}>
                        {formatDate(form.eventDate)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" color={colors.textTertiary}>
                      ›
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <IconClock size={18} color={colors.textSecondary} />
                      <Text variant="body" style={{ marginLeft: spacing.sm }}>
                        {formatTime(form.eventTime)}
                      </Text>
                    </View>
                    <Text variant="bodySmall" color={colors.textTertiary}>
                      ›
                    </Text>
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
                  label={t("newEvent.location")}
                  value={form.location}
                  placeholder={t("newEvent.locationPlaceholder")}
                  onLocationSelect={({ address, lat, lng }) => {
                    updateForm("location", address);
                    updateForm("locationLat", address ? lat : null);
                    updateForm("locationLng", address ? lng : null);
                  }}
                />

                <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                  Ulaşım
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

            {step === 3 && selectedTypeConfig ? (
              <Card
                style={{
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.borderLight,
                  ...shadows.sm,
                }}
              >
                <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: radii.full,
                      backgroundColor: selectedTypeConfig.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 38 }}>{selectedTypeConfig.emoji}</Text>
                  </View>
                  <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
                    {selectedTypeConfig.label}
                  </Text>
                  <Text variant="h1" style={{ marginTop: spacing.xs, textAlign: "center" }}>
                    {form.title || "Etkinlik"}
                  </Text>
                </View>
                <DetailRow icon={<IconCalendar size={17} color={colors.textSecondary} />} label={formatDate(form.eventDate)} />
                <DetailRow icon={<IconClock size={17} color={colors.textSecondary} />} label={formatTime(form.eventTime)} />
                <DetailRow icon={<IconMapPin size={17} color={colors.textSecondary} />} label={form.location || "-"} />
                <DetailRow
                  icon={<IconRoute size={17} color={colors.textSecondary} />}
                  label={selectedTransport?.label || "-"}
                />
              </Card>
            ) : null}
            </Animated.View>
          </ScrollView>

          <View
            style={{
              flexShrink: 0,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.lg,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              backgroundColor: colors.background,
            }}
          >
            {step === 3 ? (
              <Button
                onPress={handleCreateEvent}
                loading={isSubmitting}
                disabled={isBottomButtonDisabled}
                size="lg"
                style={{ borderRadius: radii.xl, minHeight: 56 }}
              >
                Etkinliği Oluştur
              </Button>
            ) : (
              <Button
                onPress={() => {
                  if (validateStep()) animateStepChange(step + 1);
                }}
                disabled={isBottomButtonDisabled}
                size="lg"
                style={{ borderRadius: radii.xl, minHeight: 56 }}
              >
                {t("common.next")}
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label }: { icon: ReactNode; label: string }) {
  const { spacing, colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      {icon}
      <Text variant="body" color={colors.textSecondary} style={{ marginLeft: spacing.sm, flex: 1 }}>
        {label}
      </Text>
    </View>
  );
}

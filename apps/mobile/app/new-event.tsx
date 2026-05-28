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
import { Text } from "../components/ui/Text";
import { GOOGLE_PLACES_API_KEY } from "../constants/config";
import type { ChecklistItem, Event, User } from "../constants/types";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../lib/i18n";
import { apiFetch } from "../lib/api";
import { getTintedSurface } from "../lib/themeSurfaces";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
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
  titlePlaceholder: string;
  locationPlaceholder: string;
};

const TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  flight: {
    value: "flight",
    emoji: "✈️",
    label: "Uçuş",
    color: "#EEF2FF",
    titlePlaceholder: "Kayseri Uçuşu",
    locationPlaceholder: "Sabiha Gökçen Havalimanı",
  },
  exam: {
    value: "exam",
    emoji: "📝",
    label: "Sınav",
    color: "#F0FDF4",
    titlePlaceholder: "Matematik Sınavı",
    locationPlaceholder: "Sınav Salonu",
  },
  wedding: {
    value: "wedding",
    emoji: "💍",
    label: "Düğün",
    color: "#FDF4FF",
    titlePlaceholder: "Ahmet ve Ayşe'nin Düğünü",
    locationPlaceholder: "Düğün Salonu",
  },
  doctor: {
    value: "doctor",
    emoji: "🏥",
    label: "Doktor",
    color: "#FFF1F2",
    titlePlaceholder: "Diş Hekimi Randevusu",
    locationPlaceholder: "Hastane / Klinik",
  },
  meeting: {
    value: "meeting",
    emoji: "👔",
    label: "Toplantı",
    color: "#FFFBEB",
    titlePlaceholder: "Proje Toplantısı",
    locationPlaceholder: "Toplantı Odası / Ofis",
  },
  concert: {
    value: "concert",
    emoji: "🎵",
    label: "Konser",
    color: "#F0F9FF",
    titlePlaceholder: "Coldplay Konseri",
    locationPlaceholder: "Konser Alanı",
  },
  travel: {
    value: "travel",
    emoji: "🧳",
    label: "Seyahat",
    color: "#FFF7ED",
    titlePlaceholder: "İstanbul Seyahati",
    locationPlaceholder: "Varış Noktası",
  },
  sport: {
    value: "sport",
    emoji: "🏋️",
    label: "Spor",
    color: "#F0FDF4",
    titlePlaceholder: "Spor Antrenmanı",
    locationPlaceholder: "Spor Salonu / Antrenman Alanı",
  },
  birthday: {
    value: "birthday",
    emoji: "🎂",
    label: "Doğum Günü",
    color: "#FDF4FF",
    titlePlaceholder: "Can'ın Doğum Günü",
    locationPlaceholder: "Parti Mekanı",
  },
  ceremony: {
    value: "ceremony",
    emoji: "🎓",
    label: "Tören",
    color: "#FFFBEB",
    titlePlaceholder: "Mezuniyet Töreni",
    locationPlaceholder: "Tören Salonu",
  },
  legal: {
    value: "legal",
    emoji: "⚖️",
    label: "Resmi İşlem",
    color: "#F8FAFC",
    titlePlaceholder: "Noter Randevusu",
    locationPlaceholder: "Kurum Adresi",
  },
  other: {
    value: "other",
    emoji: "📌",
    label: "Diğer",
    color: "#F8F8F8",
    titlePlaceholder: "Etkinlik Başlığı",
    locationPlaceholder: "Konum (isteğe bağlı)",
  },
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
  const { colors, spacing, radii, shadows, isDark } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1 / 3)).current;
  const stepDirection = useRef<"forward" | "back">("forward");

  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
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
  const placeholderConfig = selectedTypeConfig ?? TYPE_CONFIG.other;

  useEffect(() => {
    async function loadDefaultTransport() {
      const stored = await getUser();
      if (isUser(stored) && stored.transportMode) {
        setForm((prev) => ({ ...prev, travelMode: stored.transportMode as TransportMode }));
      }
    }
    void loadDefaultTransport();
  }, []);

  useEffect(() => {
    setLocationQuery(form.location);
  }, [form.location]);

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / 3,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  function animateStepChange(nextStep: number) {
    stepDirection.current = nextStep > step ? "forward" : "back";
    const out = stepDirection.current === "forward" ? -40 : 40;
    const enterFrom = stepDirection.current === "forward" ? 40 : -40;
    Animated.timing(slideAnim, { toValue: out, duration: 140, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(enterFrom);
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start();
    });
  }

  function selectEventType(type: EventType) {
    setSelectedEventType(type);
    updateForm("type", type);
  }

  function openDatePicker() {
    setShowTimePicker(false);
    setShowDatePicker(true);
  }

  function openTimePicker() {
    setShowDatePicker(false);
    setShowTimePicker(true);
  }

  function handleLocationTextChange(text: string) {
    setLocationQuery(text);
    updateForm("location", text);
    updateForm("locationLat", null);
    updateForm("locationLng", null);
  }

  function renderStepContent() {
    if (step === 1) {
      return (
        <>
          <Text variant="h2" style={{ marginBottom: spacing.lg }}>
            {t("newEvent.typeTitle")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {EVENT_TYPES.map((item) => (
              <EventTypeCard
                key={item.value}
                item={item}
                selected={selectedEventType === item.value}
                onPress={() => selectEventType(item.value)}
              />
            ))}
          </View>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text variant="h2" style={{ marginBottom: spacing.lg }}>
            {t("newEvent.detailTitle")}
          </Text>
          <Input
            label={t("newEvent.title")}
            value={form.title}
            onChangeText={(value) => updateForm("title", value)}
            placeholder={placeholderConfig.titlePlaceholder}
          />

          <Card style={{ marginBottom: spacing.md }}>
            <Pressable
              onPress={openDatePicker}
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
              onPress={openTimePicker}
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

          {showDatePicker && (
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
          )}
          {showTimePicker && (
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
          )}

          <View style={{ marginBottom: spacing.md }}>
            <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
              {t("newEvent.location")}
            </Text>
            <GooglePlacesAutocomplete
              placeholder={placeholderConfig.locationPlaceholder}
              fetchDetails
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: "tr",
                components: "country:tr",
              }}
              textInputProps={{
                value: locationQuery,
                onChangeText: handleLocationTextChange,
                onBlur: () => {
                  const trimmed = locationQuery.trim();
                  setLocationQuery(trimmed);
                  updateForm("location", trimmed);
                },
                placeholderTextColor: colors.textTertiary,
                selectionColor: colors.primary,
                cursorColor: colors.primary,
                underlineColorAndroid: "transparent",
              }}
              onPress={(data, details) => {
                const address = data.description ?? "";
                const lat = details?.geometry?.location?.lat ?? null;
                const lng = details?.geometry?.location?.lng ?? null;
                setLocationQuery(address);
                updateForm("location", address);
                updateForm("locationLat", lat);
                updateForm("locationLng", lng);
              }}
              enablePoweredByContainer={false}
              styles={{
                container: { flex: 0 },
                textInputContainer: {
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radii.xl,
                  backgroundColor: colors.surface,
                  paddingHorizontal: spacing.sm,
                },
                textInput: {
                  height: 52,
                  color: colors.text,
                  fontSize: 15,
                  fontFamily: "Inter_400Regular",
                  backgroundColor: colors.surface,
                },
                listView: {
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  borderRadius: radii.lg,
                  marginTop: 6,
                  backgroundColor: colors.surfaceElevated,
                },
                row: {
                  backgroundColor: colors.surfaceElevated,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                },
                separator: {
                  height: 1,
                  backgroundColor: colors.borderLight,
                },
                description: {
                  color: colors.text,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                },
              }}
            />
          </View>

          <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
            {t("newEvent.transport")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: "row",
              alignItems: "center",
              paddingRight: spacing.lg,
              gap: spacing.sm,
            }}
          >
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
                    flexShrink: 0,
                  }}
                >
                  <Text>{mode.icon}</Text>
                  <Text variant="bodySmall" style={{ marginLeft: spacing.xs }}>
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      );
    }

    if (step === 3 && selectedTypeConfig) {
      return (
        <Card
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...shadows.sm,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: radii.full,
                backgroundColor: getTintedSurface(selectedTypeConfig.color, isDark, colors),
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
      );
    }

    return null;
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
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
              <Animated.View
                style={{
                  width: progressWidth,
                  height: "100%",
                  backgroundColor: colors.primary,
                  borderRadius: radii.full,
                }}
              />
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
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>{renderStepContent()}</Animated.View>
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
                variant="gradient"
                fullWidth
                onPress={handleCreateEvent}
                loading={isSubmitting}
                disabled={isBottomButtonDisabled}
                size="lg"
              >
                Etkinliği Oluştur
              </Button>
            ) : (
              <Button
                variant="gradient"
                fullWidth
                onPress={() => {
                  if (validateStep()) animateStepChange(step + 1);
                }}
                disabled={isBottomButtonDisabled}
                size="lg"
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

function EventTypeCard({
  item,
  selected,
  onPress,
}: {
  item: EventTypeConfig;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radii, shadows, isDark } = useTheme();
  const scale = useRef(new Animated.Value(selected ? 1 : 0.95)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1 : 0.95,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [selected, scale]);

  return (
    <Pressable onPress={onPress} style={{ width: "31%" }}>
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
          borderLeftWidth: selected ? 4 : 1,
          borderLeftColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
          alignItems: "center",
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xs,
          ...shadows.sm,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radii.lg,
            backgroundColor: getTintedSurface(item.color, isDark, colors),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
        </View>
        <Text variant="caption" color={colors.text} style={{ marginTop: spacing.sm, textAlign: "center" }}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
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

import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocationInput } from "../components/ui/LocationInput";
import type { ChecklistItem, Event, User } from "../constants/types";
import { apiFetch } from "../lib/api";
import {
  requestPermissions,
  scheduleChecklistNotifications,
  scheduleLeaveHomeNotification,
} from "../lib/notifications";
import { getToken, getUser } from "../lib/storage";

const PRIMARY = "#AFA9EC";
const SELECTED_BG = "#F5F3FF";

const EVENT_TYPES = [
  { value: "flight", emoji: "✈️", label: "Uçuş" },
  { value: "exam", emoji: "📝", label: "Sınav" },
  { value: "wedding", emoji: "💍", label: "Düğün/Nikah" },
  { value: "doctor", emoji: "🏥", label: "Doktor" },
  { value: "meeting", emoji: "👔", label: "Toplantı" },
  { value: "concert", emoji: "🎵", label: "Konser" },
  { value: "travel", emoji: "🧳", label: "Seyahat" },
  { value: "sport", emoji: "🏋️", label: "Spor" },
  { value: "birthday", emoji: "🎂", label: "Doğum Günü" },
  { value: "ceremony", emoji: "🎓", label: "Tören" },
  { value: "legal", emoji: "⚖️", label: "Resmi İşlem" },
  { value: "other", emoji: "📌", label: "Diğer" },
] as const;

const TRANSPORT_MODES = [
  { icon: "🚶", label: "Yürüyüş", value: "walking" },
  { icon: "🚌", label: "Toplu Taşıma", value: "transit" },
  { icon: "🚗", label: "Araç", value: "driving" },
  { icon: "🚲", label: "Bisiklet", value: "cycling" },
] as const;

const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
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

type CreateEventResponse = {
  event: Event;
  checklistItems: ChecklistItem[];
};

type TravelTimeResponse = {
  departureTime: string;
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object";
}

function getEventTypeMeta(type: string) {
  return EVENT_TYPES.find((item) => item.value === type);
}

function getTransportLabel(value: string): string {
  return TRANSPORT_MODES.find((mode) => mode.value === value)?.label ?? value;
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
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base text-gray-900"
      />
    </View>
  );
}

export default function NewEventScreen() {
  const router = useRouter();
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
        setForm((prev) => ({
          ...prev,
          travelMode: stored.transportMode as TransportMode,
        }));
      }
    }

    loadDefaultTransport();
  }, []);

  const progress = step / 3;

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function animateStepChange(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(nextStep);
  }

  function handleTopBack() {
    if (step === 1) {
      router.replace("/(tabs)/home");
      return;
    }
    animateStepChange(step - 1);
  }

  function validateStep(): boolean {
    if (step === 1 && !form.type) {
      Alert.alert("Eksik bilgi", "Lütfen bir etkinlik türü seçin.");
      return false;
    }

    if (step === 2 && !form.title.trim()) {
      Alert.alert("Eksik bilgi", "Lütfen etkinlik başlığını girin.");
      return false;
    }

    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < 3) animateStepChange(step + 1);
  }

  function handleBack() {
    if (step > 1) animateStepChange(step - 1);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) updateForm("eventDate", selectedDate);
  }

  function handleTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed") return;
    if (selectedTime) updateForm("eventTime", selectedTime);
  }

  async function handleCreateEvent() {
    if (!form.type || !form.title.trim()) {
      Alert.alert("Eksik bilgi", "Lütfen gerekli alanları doldurun.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      }

      const combinedDate = combineDateAndTime(form.eventDate, form.eventTime);
      const payload = {
        title: form.title.trim(),
        type: form.type,
        date: combinedDate.toISOString(),
        location: form.location.trim() || undefined,
        locationLat: form.locationLat ?? undefined,
        locationLng: form.locationLng ?? undefined,
        travelMode: form.travelMode || undefined,
      };

      const response = await apiFetch<CreateEventResponse>(
        "/events",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );

      const granted = await requestPermissions();
      if (granted) {
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
              mode:
                response.event.travelMode ??
                user?.transportMode ??
                "driving",
              eventTime: response.event.date,
            });

            const travel = await apiFetch<TravelTimeResponse>(
              `/travel-time?${params.toString()}`,
              {},
              token
            );

            await scheduleLeaveHomeNotification(
              response.event.id,
              travel.departureTime,
              response.event.title
            );
          } catch {
            // Travel notification is optional if the API call fails.
          }
        }
      }

      router.replace(`/event/${response.event.id}`);
    } catch (err) {
      Alert.alert(
        "Hata",
        err instanceof Error ? err.message : "Etkinlik oluşturulamadı."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Ne planlamak istiyorsun?
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {EVENT_TYPES.map((item) => {
                const selected = form.type === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => updateForm("type", item.value)}
                    className="w-[47%] rounded-2xl border px-3 py-4"
                    style={{
                      borderColor: selected ? PRIMARY : "#E5E7EB",
                      backgroundColor: selected ? SELECTED_BG : "#FFFFFF",
                    }}
                  >
                    <Text className="mb-1 text-2xl">{item.emoji}</Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: selected ? PRIMARY : "#374151" }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );

      case 2:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Etkinlik detayları
            </Text>
            <InputField
              label="Başlık"
              value={form.title}
              onChangeText={(text) => updateForm("title", text)}
              placeholder="Kayseri Uçuşu"
            />

            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Tarih
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
              >
                <Text className="text-base text-gray-900">
                  {formatDate(form.eventDate)}
                </Text>
              </Pressable>
              {showDatePicker ? (
                <DateTimePicker
                  value={form.eventDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              ) : null}
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Saat
              </Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5"
              >
                <Text className="text-base text-gray-900">
                  {formatTime(form.eventTime)}
                </Text>
              </Pressable>
              {showTimePicker ? (
                <DateTimePicker
                  value={form.eventTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  is24Hour
                  onChange={handleTimeChange}
                />
              ) : null}
            </View>

            <LocationInput
              label="Konum"
              value={form.location}
              placeholder="Sabiha Gökçen Havalimanı"
              onLocationSelect={({ address, lat, lng }) => {
                updateForm("location", address);
                updateForm("locationLat", address ? lat : null);
                updateForm("locationLng", address ? lng : null);
              }}
            />

            <Text className="mb-3 text-sm font-medium text-gray-700">
              Bu etkinlik için ulaşım şekli
            </Text>
            <View className="gap-3">
              {TRANSPORT_MODES.map((mode) => {
                const selected = form.travelMode === mode.value;
                return (
                  <Pressable
                    key={mode.value}
                    onPress={() => updateForm("travelMode", mode.value)}
                    className="flex-row items-center rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: selected ? PRIMARY : "#E5E7EB",
                      backgroundColor: selected ? SELECTED_BG : "#FFFFFF",
                    }}
                  >
                    <Text className="mr-3 text-xl">{mode.icon}</Text>
                    <Text
                      className="text-base font-medium"
                      style={{ color: selected ? PRIMARY : "#374151" }}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        );

      case 3: {
        const typeMeta = getEventTypeMeta(form.type);
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Etkinliğin hazır! 🎉
            </Text>
            <View className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <View className="mb-4 flex-row items-center">
                <Text className="mr-3 text-3xl">{typeMeta?.emoji ?? "📌"}</Text>
                <View className="flex-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {typeMeta?.label ?? form.type}
                  </Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {form.title}
                  </Text>
                </View>
              </View>
              <SummaryRow
                label="Tarih"
                value={formatDate(form.eventDate)}
              />
              <SummaryRow label="Saat" value={formatTime(form.eventTime)} />
              <SummaryRow
                label="Konum"
                value={form.location.trim() || "Belirtilmedi"}
              />
              <SummaryRow
                label="Ulaşım"
                value={
                  form.travelMode
                    ? getTransportLabel(form.travelMode)
                    : "Belirtilmedi"
                }
              />
            </View>
          </>
        );
      }

      default:
        return null;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-6 pt-2">
          <Pressable onPress={handleTopBack} className="py-2 pr-4">
            <Text className="text-base font-medium" style={{ color: PRIMARY }}>
              Geri
            </Text>
          </Pressable>
        </View>

        <View className="px-6 pb-2">
          <View className="h-2 overflow-hidden rounded-full bg-gray-100">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, backgroundColor: PRIMARY }}
            />
          </View>
          <Text className="mt-2 text-right text-xs text-gray-400">
            {step} / 3
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        <View className="gap-3 px-6 pb-6">
          {step === 3 ? (
            <Pressable
              onPress={handleCreateEvent}
              disabled={isSubmitting}
              className="items-center rounded-full py-4"
              style={{
                backgroundColor: PRIMARY,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Etkinliği Oluştur
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleNext}
              className="items-center rounded-full py-4"
              style={{ backgroundColor: PRIMARY }}
            >
              <Text className="text-base font-semibold text-white">İleri</Text>
            </Pressable>
          )}

          {step > 1 ? (
            <Pressable onPress={handleBack} className="items-center py-2">
              <Text className="text-base font-medium" style={{ color: PRIMARY }}>
                Geri
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 border-b border-gray-200 pb-3 last:mb-0 last:border-b-0 last:pb-0">
      <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </Text>
      <Text className="text-base text-gray-900">{value}</Text>
    </View>
  );
}

import { IconSparkles } from "@tabler/icons-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ChecklistItem, Event, User } from "../../constants/types";
import { apiFetch } from "../../lib/api";
import { getToken, getUser } from "../../lib/storage";

const PRIMARY = "#AFA9EC";

const EVENT_TYPES: Record<string, { emoji: string; label: string }> = {
  flight: { emoji: "✈️", label: "Uçuş" },
  exam: { emoji: "📝", label: "Sınav" },
  wedding: { emoji: "💍", label: "Düğün/Nikah" },
  doctor: { emoji: "🏥", label: "Doktor" },
  meeting: { emoji: "👔", label: "Toplantı" },
  concert: { emoji: "🎵", label: "Konser" },
  travel: { emoji: "🧳", label: "Seyahat" },
  sport: { emoji: "🏋️", label: "Spor" },
  birthday: { emoji: "🎂", label: "Doğum Günü" },
  ceremony: { emoji: "🎓", label: "Tören" },
  legal: { emoji: "⚖️", label: "Resmi İşlem" },
  other: { emoji: "📌", label: "Diğer" },
};

const TRANSPORT_LABELS: Record<string, string> = {
  walking: "Yürüyüş",
  transit: "Toplu taşıma",
  driving: "Araç",
  cycling: "Bisiklet",
};

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

type EventDetailResponse = { event: Event };

type TravelStep = {
  type: "transit" | "walking";
  instruction: string;
  duration: string;
  line?: string;
};

type TravelTimeResponse = {
  durationSeconds: number;
  durationText: string;
  distanceText: string;
  departureTime: string;
  transitDetails?: {
    firstDeparture: string;
    steps: TravelStep[];
  };
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

function getEventTypeMeta(type: string) {
  return EVENT_TYPES[type.toLowerCase()] ?? EVENT_TYPES.other;
}

function formatEventDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = TURKISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${month} ${year}, ${time}`;
}

function formatScheduledAt(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDate();
  const month = TURKISH_MONTHS[date.getMonth()];
  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${month}, ${time}`;
}

function formatDepartureTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function transportIcon(mode: string): string {
  if (mode === "transit") return "🚌";
  if (mode === "walking") return "🚶";
  if (mode === "cycling") return "🚲";
  return "🚗";
}

function coordinatePair(lat?: number, lng?: number): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return `${lat},${lng}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const eventId = typeof id === "string" ? id : id?.[0];

  const [event, setEvent] = useState<Event | null>(null);
  const [storedUser, setStoredUser] = useState<User | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isLoadingTravel, setIsLoadingTravel] = useState(true);
  const [travelInfo, setTravelInfo] = useState<TravelTimeResponse | null>(null);
  const [travelError, setTravelError] = useState<string | null>(null);

  const sortedChecklist = useMemo(() => {
    const items = event?.checklistItems ?? [];
    const incomplete = items.filter((item) => !item.isCompleted);
    const completed = items.filter((item) => item.isCompleted);
    return [...incomplete, ...completed];
  }, [event?.checklistItems]);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoadingEvent(true);
      const token = await getToken();
      if (!token) return;
      const response = await apiFetch<EventDetailResponse>(`/events/${eventId}`, {}, token);
      setEvent(response.event);
    } catch {
      setEvent(null);
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventId]);

  const loadTravelTime = useCallback(async (eventData: Event, user: User | null) => {
    const origin =
      coordinatePair(user?.homeLocationLat, user?.homeLocationLng) ??
      user?.homeLocation?.trim();
    const destination =
      coordinatePair(eventData.locationLat, eventData.locationLng) ??
      eventData.location?.trim();
    const mode = eventData.travelMode ?? user?.transportMode ?? "driving";

    if (!origin || !destination) {
      setIsLoadingTravel(false);
      setTravelError("Konum bilgisi eksik");
      return;
    }

    try {
      setIsLoadingTravel(true);
      setTravelError(null);
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams({
        origin,
        destination,
        mode,
        eventTime: eventData.date,
      });
      const response = await apiFetch<TravelTimeResponse>(
        `/travel-time?${params.toString()}`,
        {},
        token
      );
      setTravelInfo(response);
    } catch {
      setTravelError("Yol süresi alınamadı");
      setTravelInfo(null);
    } finally {
      setIsLoadingTravel(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      setStoredUser(isUser(user) ? user : null);
      await loadEvent();
    }
    init();
  }, [loadEvent]);

  useEffect(() => {
    if (event) loadTravelTime(event, storedUser);
  }, [event, storedUser, loadTravelTime]);

  async function handleToggleChecklistItem(item: ChecklistItem) {
    if (!event) return;
    const token = await getToken();
    if (!token) return;

    const nextCompleted = !item.isCompleted;
    setEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems?.map((entry) =>
          entry.id === item.id ? { ...entry, isCompleted: nextCompleted } : entry
        ),
      };
    });

    try {
      await apiFetch(
        `/checklist/${item.id}`,
        { method: "PUT", body: JSON.stringify({ isCompleted: nextCompleted }) },
        token
      );
    } catch {
      setEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: prev.checklistItems?.map((entry) =>
            entry.id === item.id ? { ...entry, isCompleted: item.isCompleted } : entry
          ),
        };
      });
    }
  }

  async function openDirections(mode: string) {
    if (!event) return;
    const originCoords = coordinatePair(storedUser?.homeLocationLat, storedUser?.homeLocationLng);
    const destinationCoords = coordinatePair(event.locationLat, event.locationLng);
    if (!originCoords || !destinationCoords) {
      Alert.alert("Eksik konum", "Navigasyon için koordinat bilgisi gerekiyor.");
      return;
    }

    const [toLat, toLng] = destinationCoords.split(",");
    const urls: Record<string, string> = {
      google: `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destinationCoords}&travelmode=${mode}`,
      yandex: `yandexnavi://build_route_on_map?lat_to=${toLat}&lon_to=${toLng}`,
      apple: `http://maps.apple.com/?saddr=${originCoords}&daddr=${destinationCoords}`,
    };

    const openUrl = async (url: string) => {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Açılamadı", "Bu uygulama cihazda bulunamadı.");
        return;
      }
      await Linking.openURL(url);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Vazgeç", "Google Maps", "Yandex Navigasyon", "Apple Haritalar"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void openUrl(urls.google);
          if (index === 2) void openUrl(urls.yandex);
          if (index === 3) void openUrl(urls.apple);
        }
      );
      return;
    }

    Alert.alert("Yol Tarifi Al", "Navigasyon uygulamasını seç", [
      { text: "Google Maps", onPress: () => void openUrl(urls.google) },
      { text: "Yandex Navigasyon", onPress: () => void openUrl(urls.yandex) },
      { text: "İptal", style: "cancel" },
    ]);
  }

  const typeMeta = event ? getEventTypeMeta(event.type) : EVENT_TYPES.other;
  const travelMode = event?.travelMode ?? storedUser?.transportMode ?? "driving";
  const travelModeLabel = TRANSPORT_LABELS[travelMode] ?? travelMode;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace("/(tabs)/home")} className="mb-4 pt-2">
          <Text className="text-2xl" style={{ color: PRIMARY }}>
            ←
          </Text>
        </Pressable>

        {isLoadingEvent || !event ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <>
            <View className="mb-6 flex-row items-start">
              <Text className="mr-3 text-4xl">{typeMeta.emoji}</Text>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">{event.title}</Text>
                <Text className="mt-2 text-base text-gray-500">{formatEventDateTime(event.date)}</Text>
              </View>
            </View>

            <View className="mb-6 rounded-2xl border border-gray-100 bg-white p-4">
              {isLoadingTravel ? (
                <TravelSkeleton />
              ) : travelInfo ? (
                <>
                  <Text className="text-lg font-bold text-gray-900">
                    Evden çık: {formatDepartureTime(travelInfo.departureTime)}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500">
                    {transportIcon(travelMode)} {travelInfo.durationText} · {travelInfo.distanceText} ·{" "}
                    {travelModeLabel}
                  </Text>
                  {travelInfo.transitDetails?.steps?.length ? (
                    <View className="mt-3 rounded-xl bg-gray-50 p-3">
                      {travelInfo.transitDetails.steps.map((step, index) => (
                        <Text key={`${step.type}-${index}`} className="mb-1 text-xs text-gray-600">
                          {step.type === "transit" ? "🚌" : "🚶"} {step.line ? `${step.line} · ` : ""}
                          {step.instruction} ({step.duration})
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => void openDirections(travelMode)}
                    className="mt-4 items-center rounded-full py-3"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <Text className="text-sm font-semibold text-white">Yol Tarifi Al</Text>
                  </Pressable>
                </>
              ) : (
                <Text className="text-sm text-gray-400">{travelError ?? "Yol bilgisi gösterilemiyor"}</Text>
              )}
            </View>

            <View className="mb-3 flex-row items-center">
              <Text className="text-lg font-bold text-gray-900">Yapılacaklar</Text>
              <IconSparkles
                size={18}
                color={PRIMARY}
                strokeWidth={2}
                style={{ marginLeft: 6 }}
              />
            </View>

            <View className="rounded-2xl border border-gray-100 bg-white p-4">
              {sortedChecklist.length === 0 ? (
                <Text className="text-sm text-gray-400">Checklist yükleniyor...</Text>
              ) : (
                sortedChecklist.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onToggle={() => handleToggleChecklistItem(item)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TravelSkeleton() {
  return (
    <View>
      <View className="mb-2 h-5 w-40 rounded-lg bg-gray-100" />
      <View className="h-4 w-56 rounded-lg bg-gray-100" />
    </View>
  );
}

function ChecklistRow({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: () => void;
}) {
  const scheduledLabel = formatScheduledAt(item.scheduledAt);
  return (
    <Pressable onPress={onToggle} className="mb-4 flex-row items-start last:mb-0">
      <View
        className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2"
        style={{
          borderColor: item.isCompleted ? PRIMARY : "#D1D5DB",
          backgroundColor: item.isCompleted ? PRIMARY : "#FFFFFF",
        }}
      >
        {item.isCompleted ? <Text className="text-xs font-bold text-white">✓</Text> : null}
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${
            item.isCompleted ? "text-gray-400 line-through" : "text-gray-900"
          }`}
        >
          {item.title}
        </Text>
        {scheduledLabel ? (
          <Text className={`mt-1 text-xs ${item.isCompleted ? "text-gray-300" : "text-gray-400"}`}>
            {scheduledLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

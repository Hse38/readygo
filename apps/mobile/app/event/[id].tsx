import { IconSparkles } from "@tabler/icons-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type EventDetailResponse = {
  event: Event;
};

type TravelTimeResponse = {
  durationSeconds: number;
  durationText: string;
  departureTime: string;
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

function formatDurationTurkish(seconds: number, durationText: string): string {
  const match = durationText.match(/(\d+)/);
  const minutes = match
    ? Number.parseInt(match[1], 10)
    : Math.max(1, Math.round(seconds / 60));
  return `~${minutes} dakika`;
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

      const response = await apiFetch<EventDetailResponse>(
        `/events/${eventId}`,
        {},
        token
      );
      setEvent(response.event);
    } catch {
      setEvent(null);
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventId]);

  const loadTravelTime = useCallback(
    async (eventData: Event, user: User | null) => {
      const origin = user?.homeLocation?.trim();
      const destination = eventData.location?.trim();
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
    },
    []
  );

  useEffect(() => {
    async function init() {
      const user = await getUser();
      setStoredUser(isUser(user) ? user : null);
      await loadEvent();
    }

    init();
  }, [loadEvent]);

  useEffect(() => {
    if (event) {
      loadTravelTime(event, storedUser);
    }
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
          entry.id === item.id
            ? { ...entry, isCompleted: nextCompleted }
            : entry
        ),
      };
    });

    try {
      await apiFetch(
        `/checklist/${item.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ isCompleted: nextCompleted }),
        },
        token
      );
    } catch {
      setEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: prev.checklistItems?.map((entry) =>
            entry.id === item.id
              ? { ...entry, isCompleted: item.isCompleted }
              : entry
          ),
        };
      });
    }
  }

  const typeMeta = event ? getEventTypeMeta(event.type) : EVENT_TYPES.other;
  const travelMode =
    event?.travelMode ?? storedUser?.transportMode ?? "driving";
  const travelModeLabel =
    TRANSPORT_LABELS[travelMode] ?? travelMode;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="mb-4 pt-2">
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
                <Text className="text-2xl font-bold text-gray-900">
                  {event.title}
                </Text>
                <Text className="mt-2 text-base text-gray-500">
                  {formatEventDateTime(event.date)}
                </Text>
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
                    {formatDurationTurkish(
                      travelInfo.durationSeconds,
                      travelInfo.durationText
                    )}{" "}
                    · {travelModeLabel}
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-gray-400">
                  {travelError ?? "Yol bilgisi gösterilemiyor"}
                </Text>
              )}
            </View>

            <View className="mb-3 flex-row items-center">
              <Text className="text-lg font-bold text-gray-900">
                Yapılacaklar
              </Text>
              <IconSparkles
                size={18}
                color={PRIMARY}
                strokeWidth={2}
                style={{ marginLeft: 6 }}
              />
            </View>

            <View className="rounded-2xl border border-gray-100 bg-white p-4">
              {sortedChecklist.length === 0 ? (
                <Text className="text-sm text-gray-400">
                  Checklist yükleniyor...
                </Text>
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
    <Pressable
      onPress={onToggle}
      className="mb-4 flex-row items-start last:mb-0"
    >
      <View
        className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2"
        style={{
          borderColor: item.isCompleted ? PRIMARY : "#D1D5DB",
          backgroundColor: item.isCompleted ? PRIMARY : "#FFFFFF",
        }}
      >
        {item.isCompleted ? (
          <Text className="text-xs font-bold text-white">✓</Text>
        ) : null}
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${
            item.isCompleted
              ? "text-gray-400 line-through"
              : "text-gray-900"
          }`}
        >
          {item.title}
        </Text>
        {scheduledLabel ? (
          <Text
            className={`mt-1 text-xs ${
              item.isCompleted ? "text-gray-300" : "text-gray-400"
            }`}
          >
            {scheduledLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

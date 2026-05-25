import {
  IconActivity,
  IconCalendar,
  IconHeart,
  IconPencil,
  IconPlane,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ChecklistItem, Event, User } from "../../constants/types";
import { apiFetch } from "../../lib/api";
import { getToken, getUser } from "../../lib/storage";

const PRIMARY = "#AFA9EC";

const TURKISH_DAYS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

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

type EventsResponse = {
  events: Event[];
};

type EventTypeStyle = {
  backgroundColor: string;
  Icon: typeof IconCalendar;
};

const EVENT_TYPE_STYLES: Record<string, EventTypeStyle> = {
  flight: { backgroundColor: "#EEEDFE", Icon: IconPlane },
  exam: { backgroundColor: "#E1F5EE", Icon: IconPencil },
  wedding: { backgroundColor: "#FAECE7", Icon: IconHeart },
  doctor: { backgroundColor: "#E1F5EE", Icon: IconActivity },
  meeting: { backgroundColor: "#EEF2FF", Icon: IconUsers },
};

const DEFAULT_EVENT_STYLE: EventTypeStyle = {
  backgroundColor: "#F1EFE8",
  Icon: IconCalendar,
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatTurkishDate(date: Date): string {
  return `${TURKISH_DAYS[date.getDay()]}, ${date.getDate()} ${TURKISH_MONTHS[date.getMonth()]}`;
}

function formatEventMeta(dateStr: string, location?: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = TURKISH_MONTHS[date.getMonth()];
  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const datePart = `${day} ${month}, ${time}`;
  return location ? `${datePart} · ${location}` : datePart;
}

function getDaysRemainingLabel(dateStr: string): string {
  const today = startOfDay(new Date());
  const eventDate = startOfDay(new Date(dateStr));
  const diffMs = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Bugün";
  if (diffDays < 0) return "Geçti";
  return `${diffDays} gün`;
}

function getEventTypeStyle(type: string): EventTypeStyle {
  return EVENT_TYPE_STYLES[type.toLowerCase()] ?? DEFAULT_EVENT_STYLE;
}

function getInitials(user: User | null): string {
  if (!user) return "?";
  const first = user.name?.trim()?.[0] ?? "";
  const last = user.surname?.trim()?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

function getNearestEventWithChecklist(events: Event[]): Event | null {
  const today = startOfDay(new Date());
  const upcoming = [...events]
    .filter((event) => startOfDay(new Date(event.date)) >= today)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  for (const event of upcoming) {
    if (event.checklistItems?.some((item) => !item.isCompleted)) {
      return event;
    }
  }

  return null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayLabel = useMemo(() => formatTurkishDate(new Date()), []);
  const nearestEvent = useMemo(
    () => getNearestEventWithChecklist(events),
    [events]
  );

  const fetchEvents = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const token = await getToken();
      if (!token) {
        setEvents([]);
        return;
      }

      const response = await apiFetch<EventsResponse>("/events", {}, token);
      setEvents(response.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etkinlikler yüklenemedi.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      const storedUser = await getUser();
      setUser(isUser(storedUser) ? storedUser : null);
      await fetchEvents();
    }

    loadInitialData();
  }, [fetchEvents]);

  async function handleToggleChecklistItem(
    itemId: string,
    eventId: string
  ) {
    const token = await getToken();
    if (!token) return;

    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          checklistItems: event.checklistItems?.map((item) =>
            item.id === itemId ? { ...item, isCompleted: true } : item
          ),
        };
      })
    );

    try {
      await apiFetch(
        `/checklist/${itemId}`,
        {
          method: "PUT",
          body: JSON.stringify({ isCompleted: true }),
        },
        token
      );
    } catch {
      setEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event;
          return {
            ...event,
            checklistItems: event.checklistItems?.map((item) =>
              item.id === itemId ? { ...item, isCompleted: false } : item
            ),
          };
        })
      );
    }
  }

  function renderChecklistPreview(event: Event) {
    const incompleteItems =
      event.checklistItems?.filter((item) => !item.isCompleted).slice(0, 3) ??
      [];

    if (incompleteItems.length === 0) return null;

    return (
      <View className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
        <View className="mb-2 flex-row items-center">
          <IconSparkles size={14} color={PRIMARY} strokeWidth={2} />
          <Text className="ml-1.5 text-xs font-semibold" style={{ color: PRIMARY }}>
            AI checklist
          </Text>
        </View>
        {incompleteItems.map((item) => (
          <ChecklistPreviewItem
            key={item.id}
            item={item}
            onToggle={() => handleToggleChecklistItem(item.id, event.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <Text className="text-3xl font-light tracking-tight text-gray-900">
          r
          <Text className="font-bold" style={{ color: PRIMARY }}>
            GO
          </Text>
        </Text>
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: PRIMARY }}
        >
          <Text className="text-sm font-bold text-white">
            {getInitials(user)}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerClassName="pb-28"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchEvents(true)}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-sm text-gray-400">Bugün</Text>
        <Text className="mb-6 text-xl font-semibold text-gray-900">
          {todayLabel}
        </Text>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : error ? (
          <View className="items-center py-16">
            <Text className="text-center text-base text-gray-500">{error}</Text>
          </View>
        ) : events.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-center text-base leading-6 text-gray-400">
              Henüz etkinlik yok{"\n"}İlk etkinliğini eklemek için + butonuna bas
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const { backgroundColor, Icon } = getEventTypeStyle(event.type);
            const showChecklist = nearestEvent?.id === event.id;

            return (
              <View key={event.id} className="mb-4">
                <Pressable
                  onPress={() => router.push(`/event/${event.id}`)}
                  className="flex-row items-center rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <View
                    className="mr-3 h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor }}
                  >
                    <Icon size={22} color="#4B5563" strokeWidth={1.75} />
                  </View>

                  <View className="flex-1 pr-3">
                    <Text className="text-base font-bold text-gray-900">
                      {event.title}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-400">
                      {formatEventMeta(event.date, event.location)}
                    </Text>
                  </View>

                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-gray-600">
                      {getDaysRemainingLabel(event.date)}
                    </Text>
                  </View>
                </Pressable>

                {showChecklist ? renderChecklistPreview(event) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/new-event")}
        className="absolute bottom-6 left-6 h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ backgroundColor: PRIMARY }}
      >
        <IconPlus size={28} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </SafeAreaView>
  );
}

function ChecklistPreviewItem({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="mb-2 flex-row items-center last:mb-0"
    >
      <View className="mr-3 h-5 w-5 rounded-full border-2 border-gray-300" />
      <Text className="flex-1 text-sm text-gray-700">{item.title}</Text>
    </Pressable>
  );
}

import {
  IconActivity,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconHeart,
  IconMapPin,
  IconPencil,
  IconPlane,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import type { ChecklistItem, Event, User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../lib/i18n";
import { apiFetch } from "../../lib/api";
import { clearAll, getToken, getUser } from "../../lib/storage";

type EventsResponse = { events: Event[] };
type EventTypeStyle = { backgroundColor: string; dotColor: string; Icon: typeof IconCalendar };

const EVENT_TYPE_STYLES: Record<string, EventTypeStyle> = {
  flight: { backgroundColor: "#EEEDFE", dotColor: "#7C6FF7", Icon: IconPlane },
  exam: { backgroundColor: "#E1F5EE", dotColor: "#10B981", Icon: IconPencil },
  wedding: { backgroundColor: "#FAECE7", dotColor: "#F97316", Icon: IconHeart },
  doctor: { backgroundColor: "#E1F5EE", dotColor: "#14B8A6", Icon: IconActivity },
  meeting: { backgroundColor: "#EEF2FF", dotColor: "#6366F1", Icon: IconUsers },
};

const DEFAULT_EVENT_STYLE: EventTypeStyle = {
  backgroundColor: "#F1EFE8",
  dotColor: "#9CA3AF",
  Icon: IconCalendar,
};

const WEEKDAY_SHORT_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAY_LONG_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const MONTHS_TR = [
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

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getMonday(date: Date): Date {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatSelectedDayTr(date: Date): string {
  const jsDay = date.getDay();
  const mondayFirstIndex = jsDay === 0 ? 6 : jsDay - 1;
  return `${date.getDate()} ${MONTHS_TR[date.getMonth()]} ${WEEKDAY_LONG_TR[mondayFirstIndex]}`;
}

function formatEventMeta(dateStr: string, location?: string): string {
  const date = new Date(dateStr);
  const time = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return location ? `${time} · ${location}` : time;
}

function getDaysRemainingLabel(dateStr: string, t: (key: string) => string): string {
  const today = startOfDay(new Date());
  const eventDate = startOfDay(new Date(dateStr));
  const diffMs = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("home.today");
  if (diffDays < 0) return t("home.passed");
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
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const event of upcoming) {
    if (event.checklistItems?.some((item) => !item.isCompleted)) return event;
  }
  return null;
}

function isSessionInvalidError(error: unknown): boolean {
  return error instanceof Error && error.message === "AUTH_SESSION_INVALID";
}

export default function HomeScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { colors, spacing, radii, shadows } = useTheme();
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));

  useEffect(() => {
    if (!date) return;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return;
    const normalized = startOfDay(parsed);
    setSelectedDate(normalized);
    setWeekStart(getMonday(normalized));
  }, [date]);

  const nearestEvent = useMemo(() => getNearestEventWithChecklist(events), [events]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + index);
      return d;
    });
  }, [weekStart]);

  const selectedDayEvents = useMemo(() => {
    return [...events]
      .filter((event) => sameDay(new Date(event.date), selectedDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, selectedDate]);

  const fetchEvents = useCallback(async (refreshing = false) => {
    try {
      if (refreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        setEvents([]);
        return;
      }
      const response = await apiFetch<EventsResponse>("/events", {}, token);
      setEvents(response.events ?? []);
    } catch (err) {
      if (isSessionInvalidError(err)) {
        await clearAll();
        router.replace("/onboarding");
        return;
      }
      setError(err instanceof Error ? err.message : t("home.eventsLoadError"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    async function loadInitialData() {
      const storedUser = await getUser();
      setUser(isUser(storedUser) ? storedUser : null);
      await fetchEvents();
    }
    void loadInitialData();
  }, [fetchEvents]);

  async function handleToggleChecklistItem(itemId: string, eventId: string) {
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
        { method: "PUT", body: JSON.stringify({ isCompleted: true }) },
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
      event.checklistItems?.filter((item) => !item.isCompleted).slice(0, 3) ?? [];
    if (incompleteItems.length === 0) return null;
    return (
      <View
        style={{
          marginTop: spacing.sm,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          backgroundColor: colors.backgroundSecondary,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <View style={{ marginBottom: spacing.sm, flexDirection: "row", alignItems: "center" }}>
          <IconSparkles size={14} color={colors.primary} strokeWidth={2} />
          <Text variant="label" color={colors.primary} style={{ marginLeft: 6 }}>
            {t("home.checklist")}
          </Text>
        </View>
        {incompleteItems.map((item) => (
          <ChecklistPreviewItem
            key={item.id}
            item={item}
            onToggle={() => void handleToggleChecklistItem(item.id, event.id)}
          />
        ))}
      </View>
    );
  }

  function moveWeek(direction: "prev" | "next") {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + (direction === "next" ? 7 : -7));
    setWeekStart(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
        }}
      >
        <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.textSecondary }}>
          r
          <Text style={{ color: colors.primary, fontSize: 26, fontFamily: "Inter_700Bold" }}>
            GO
          </Text>
        </Text>
        <View
          style={{
            height: 40,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.full,
            backgroundColor: colors.primary,
          }}
        >
          <Text variant="label" color={colors.white}>
            {getInitials(user)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void fetchEvents(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginBottom: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable onPress={() => moveWeek("prev")} hitSlop={10}>
            <IconChevronLeft color={colors.textSecondary} size={20} />
          </Pressable>
          <Text variant="label" color={colors.textSecondary}>
            {`${weekDays[0].getDate()} ${MONTHS_TR[weekDays[0].getMonth()]} - ${weekDays[6].getDate()} ${MONTHS_TR[weekDays[6].getMonth()]}`}
          </Text>
          <Pressable onPress={() => moveWeek("next")} hitSlop={10}>
            <IconChevronRight color={colors.textSecondary} size={20} />
          </Pressable>
        </View>

        <FlatList
          data={weekDays}
          horizontal
          keyExtractor={(item) => item.toISOString()}
          contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.xl }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const dayEvents = events.filter((event) => sameDay(new Date(event.date), item));
            const isToday = sameDay(item, new Date());
            const isSelected = sameDay(item, selectedDate);
            const bgColor = isToday
              ? colors.primary
              : isSelected
                ? colors.primaryLight
                : colors.backgroundSecondary;
            const txtColor = isToday || isSelected ? colors.white : colors.text;
            const dayIndex = item.getDay() === 0 ? 6 : item.getDay() - 1;
            return (
              <Pressable
                onPress={() => setSelectedDate(item)}
                style={{
                  width: 56,
                  borderRadius: radii.full,
                  backgroundColor: bgColor,
                  paddingVertical: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Text variant="caption" color={txtColor}>
                  {WEEKDAY_SHORT_TR[dayIndex]}
                </Text>
                <Text variant="label" color={txtColor} style={{ marginTop: 2 }}>
                  {item.getDate()}
                </Text>
                <View style={{ marginTop: 4, minHeight: 6, flexDirection: "row", gap: 2 }}>
                  {dayEvents.slice(0, 4).map((event, dotIndex) => (
                    <View
                      key={`${event.id}-${dotIndex}`}
                      style={{
                        height: 5,
                        width: 5,
                        borderRadius: radii.full,
                        backgroundColor: getEventTypeStyle(event.type).dotColor,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          }}
        />

        <Text variant="h3" style={{ marginBottom: spacing.lg }}>
          {formatSelectedDayTr(selectedDate)}
        </Text>

        {isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: "center" }}>
              {error}
            </Text>
          </View>
        ) : selectedDayEvents.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
            <View
              style={{
                width: 108,
                height: 108,
                borderRadius: 24,
                backgroundColor: "#F3F0FF",
                borderWidth: 2,
                borderColor: "#D7CEFF",
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#7C6FF7" }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#7C6FF7" }} />
              </View>
              <View style={{ flex: 1, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#7C6FF7", fontSize: 28, fontFamily: "Inter_700Bold" }}>+</Text>
              </View>
            </View>
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
              {t("home.noEvent")}
            </Text>
          </View>
        ) : (
          selectedDayEvents.map((event) => {
            const { backgroundColor, Icon } = getEventTypeStyle(event.type);
            const showChecklist = nearestEvent?.id === event.id;
            return (
              <View key={event.id} style={{ marginBottom: spacing.md }}>
                <Card
                  onPress={() => router.push(`/event/${event.id}`)}
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      padding: spacing.lg,
                    },
                    shadows.sm,
                  ]}
                >
                  <View
                    style={{
                      marginRight: spacing.md,
                      height: 44,
                      width: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: radii.full,
                      backgroundColor,
                    }}
                  >
                    <Icon size={22} color="#4B5563" strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text variant="h3" style={{ fontSize: 17 }}>
                      {event.title}
                    </Text>
                    <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center" }}>
                      <IconMapPin size={13} color={colors.textTertiary} />
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: 4 }}>
                        {formatEventMeta(event.date, event.location)}
                      </Text>
                    </View>
                  </View>
                  <Badge variant="primary" size="sm" label={getDaysRemainingLabel(event.date, t)} />
                </Card>
                {showChecklist ? renderChecklistPreview(event) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/new-event")}
        style={{
          position: "absolute",
          right: spacing.lg,
          bottom: spacing.xxl,
          height: 56,
          width: 56,
          borderRadius: radii.full,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          ...shadows.lg,
        }}
      >
        <IconPlus size={28} color={colors.white} strokeWidth={2} />
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
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{ marginBottom: spacing.sm, flexDirection: "row", alignItems: "center" }}
    >
      <View
        style={{
          marginRight: spacing.sm,
          height: 18,
          width: 18,
          borderRadius: radii.full,
          borderWidth: 1.5,
          borderColor: colors.border,
        }}
      />
      <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
        {item.title}
      </Text>
    </Pressable>
  );
}

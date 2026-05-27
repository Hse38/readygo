import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import type { Event } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/storage";

type EventsResponse = { events: Event[] };

const WEEKDAY_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
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

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthDays(target: Date): Date[] {
  const year = target.getFullYear();
  const month = target.getMonth();
  const first = new Date(year, month, 1);
  const mondayIndex = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const start = new Date(year, month, 1 - mondayIndex);

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useTheme();
  const [monthDate, setMonthDate] = useState(startOfDay(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const monthSlide = useRef(new Animated.Value(0)).current;

  const monthDays = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const today = startOfDay(new Date());

  const fetchEvents = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setEvents([]);
      return;
    }
    try {
      const response = await apiFetch<EventsResponse>("/events", {}, token);
      setEvents(response.events ?? []);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  function moveMonth(direction: "prev" | "next") {
    const offset = direction === "next" ? -30 : 30;
    Animated.timing(monthSlide, { toValue: offset, duration: 160, useNativeDriver: true }).start(() => {
      setMonthDate((prev) => {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
        return next;
      });
      monthSlide.setValue(direction === "next" ? 30 : -30);
      Animated.spring(monthSlide, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => moveMonth("prev")} hitSlop={10}>
            <IconChevronLeft size={20} color={colors.textSecondary} />
          </Pressable>
          <Text variant="h3" color={colors.text}>
            {MONTHS_TR[monthDate.getMonth()]} {monthDate.getFullYear()}
          </Text>
          <Pressable onPress={() => moveMonth("next")} hitSlop={10}>
            <IconChevronRight size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Card style={{ marginTop: spacing.md, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
            {WEEKDAY_TR.map((day) => (
              <View key={day} style={{ flex: 1, alignItems: "center" }}>
                <Text variant="caption" color={colors.textSecondary}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          <Animated.View style={{ transform: [{ translateX: monthSlide }] }}>
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <View key={`week-${weekIndex}`} style={{ flexDirection: "row", marginBottom: spacing.sm }}>
                {monthDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => (
                  <CalendarDayCell
                    key={day.toISOString()}
                    day={day}
                    inCurrentMonth={day.getMonth() === monthDate.getMonth()}
                    isToday={sameDay(day, today)}
                    hasEvents={events.some((event) => sameDay(new Date(event.date), day))}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/home",
                        params: { date: day.toISOString() },
                      })
                    }
                  />
                ))}
              </View>
            ))}
          </Animated.View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

function CalendarDayCell({
  day,
  inCurrentMonth,
  isToday,
  hasEvents,
  onPress,
}: {
  day: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radii, shadows } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.92, friction: 6, useNativeDriver: true }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }

  const textColor = isToday ? colors.white : inCurrentMonth ? colors.text : colors.textTertiary;

  return (
    <Pressable
      style={{ flex: 1, alignItems: "center" }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          alignItems: "center",
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
          borderRadius: radii.md,
          minWidth: 36,
          transform: [{ scale }],
          backgroundColor: isToday ? colors.primary : "transparent",
          ...(isToday ? { ...shadows.md, shadowColor: colors.primary } : {}),
        }}
      >
        <Text variant="bodySmall" color={textColor}>
          {day.getDate()}
        </Text>
        <View style={{ marginTop: 4, height: 6 }}>
          {hasEvents ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: radii.full,
                backgroundColor: isToday ? colors.white : colors.primary,
              }}
            />
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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
  const { colors, spacing, radii } = useTheme();
  const [monthDate, setMonthDate] = useState(startOfDay(new Date()));
  const [events, setEvents] = useState<Event[]>([]);

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
    setMonthDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => moveMonth("prev")} hitSlop={10}>
            <IconChevronLeft size={20} color={colors.textSecondary} />
          </Pressable>
          <Text variant="h3">
            {MONTHS_TR[monthDate.getMonth()]} {monthDate.getFullYear()}
          </Text>
          <Pressable onPress={() => moveMonth("next")} hitSlop={10}>
            <IconChevronRight size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
            {WEEKDAY_TR.map((day) => (
              <View key={day} style={{ flex: 1, alignItems: "center" }}>
                <Text variant="caption" color={colors.textSecondary}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {Array.from({ length: 6 }).map((_, weekIndex) => (
            <View key={`week-${weekIndex}`} style={{ flexDirection: "row", marginBottom: spacing.sm }}>
              {monthDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                const inCurrentMonth = day.getMonth() === monthDate.getMonth();
                const dayEvents = events.filter((event) => sameDay(new Date(event.date), day));
                const isToday = sameDay(day, today);
                return (
                  <Pressable
                    key={day.toISOString()}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: spacing.sm,
                      borderRadius: radii.md,
                      backgroundColor: isToday ? colors.primaryLight : "transparent",
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/home",
                        params: { date: day.toISOString() },
                      })
                    }
                  >
                    <Text
                      variant="bodySmall"
                      color={isToday ? colors.white : inCurrentMonth ? colors.text : colors.textTertiary}
                    >
                      {day.getDate()}
                    </Text>
                    <View style={{ marginTop: 4, height: 6 }}>
                      {dayEvents.length > 0 ? (
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
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
      </View>
    </SafeAreaView>
  );
}

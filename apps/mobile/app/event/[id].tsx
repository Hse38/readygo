import {
  IconClock,
  IconMapPin,
  IconSparkles,
  IconUserPlus,
} from "@tabler/icons-react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Text } from "../../components/ui/Text";
import type { ChecklistItem, Event, Participant, User } from "../../constants/types";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../lib/i18n";
import { apiFetch } from "../../lib/api";
import { getToken, getUser } from "../../lib/storage";

const EVENT_TYPES: Record<string, { emoji: string; label: string }> = {
  flight: { emoji: "✈️", label: "Ucus" },
  exam: { emoji: "📝", label: "Sinav" },
  wedding: { emoji: "💍", label: "Dugun" },
  doctor: { emoji: "🏥", label: "Doktor" },
  meeting: { emoji: "👔", label: "Toplanti" },
  concert: { emoji: "🎵", label: "Konser" },
  travel: { emoji: "🧳", label: "Seyahat" },
  sport: { emoji: "🏋️", label: "Spor" },
  birthday: { emoji: "🎂", label: "Dogum" },
  ceremony: { emoji: "🎓", label: "Toren" },
  legal: { emoji: "⚖️", label: "Resmi Islem" },
  other: { emoji: "📌", label: "Diger" },
};

const TRANSPORT_LABELS: Record<string, string> = {
  walking: "Yürüyüş",
  transit: "Toplu Taşıma",
  driving: "Araç",
  cycling: "Bisiklet",
};

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
  transitDetails?: { firstDeparture: string; steps: TravelStep[] };
};
type EventParticipantsResponse = {
  participants: Participant[];
};
type AddParticipantResponse = {
  participant: Participant;
  inviteLink: string;
};

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

function formatEventDateTime(dateStr: string, locale: "tr" | "en"): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScheduledAt(dateStr: string | undefined, locale: "tr" | "en"): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function coordinatePair(lat?: number, lng?: number): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return `${lat},${lng}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { t, locale } = useTranslation();
  const eventId = typeof id === "string" ? id : id?.[0];

  const [event, setEvent] = useState<Event | null>(null);
  const [storedUser, setStoredUser] = useState<User | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isLoadingTravel, setIsLoadingTravel] = useState(true);
  const [travelInfo, setTravelInfo] = useState<TravelTimeResponse | null>(null);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParticipantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const sortedChecklist = useMemo(() => {
    const items = event?.checklistItems ?? [];
    return [...items.filter((i) => !i.isCompleted), ...items.filter((i) => i.isCompleted)];
  }, [event?.checklistItems]);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoadingEvent(true);
      const token = await getToken();
      if (!token) return;
      const response = await apiFetch<EventDetailResponse>(`/events/${eventId}`, {}, token);
      setEvent(response.event);
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventId]);

  const loadTravelTime = useCallback(async (eventData: Event, user: User | null) => {
    const origin = coordinatePair(user?.homeLocationLat, user?.homeLocationLng) ?? user?.homeLocation?.trim();
    const destination = coordinatePair(eventData.locationLat, eventData.locationLng) ?? eventData.location?.trim();
    const mode = eventData.travelMode ?? user?.transportMode ?? "driving";
    if (!origin || !destination) {
      setTravelError(t("eventDetail.missingLocation"));
      setIsLoadingTravel(false);
      return;
    }

    try {
      setIsLoadingTravel(true);
      setTravelError(null);
      const token = await getToken();
      if (!token) return;
      const params = new URLSearchParams({ origin, destination, mode, eventTime: eventData.date });
      const response = await apiFetch<TravelTimeResponse>(`/travel-time?${params.toString()}`, {}, token);
      setTravelInfo(response);
    } catch {
      setTravelInfo(null);
      setTravelError(t("eventDetail.travelFailed"));
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
    if (event) void loadTravelTime(event, storedUser);
  }, [event, storedUser, loadTravelTime]);

  const loadParticipants = useCallback(async () => {
    if (!eventId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiFetch<EventParticipantsResponse>(`/events/${eventId}/participants`, {}, token);
      setParticipants(response.participants);
    } catch {
      // ignore participant load errors in detail page
    }
  }, [eventId]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

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
      // ignore
    }
  }

  async function openDirections(mode: string) {
    if (!event) return;
    const originCoords = coordinatePair(storedUser?.homeLocationLat, storedUser?.homeLocationLng);
    const destinationCoords = coordinatePair(event.locationLat, event.locationLng);
    if (!originCoords || !destinationCoords) {
      Alert.alert(t("common.error"), t("eventDetail.routeError"));
      return;
    }
    const [toLat, toLng] = destinationCoords.split(",");
    const urls = {
      google: `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${destinationCoords}&travelmode=${mode}`,
      yandex: `yandexnavi://build_route_on_map?lat_to=${toLat}&lon_to=${toLng}`,
      apple: `http://maps.apple.com/?saddr=${originCoords}&daddr=${destinationCoords}`,
    };

    const openUrl = async (url: string) => {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
      Alert.alert(t("common.error"), t("eventDetail.appMissing"));
        return;
      }
      await Linking.openURL(url);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel"), t("eventDetail.googleMaps"), t("eventDetail.yandex"), t("eventDetail.appleMaps")],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void openUrl(urls.google);
          if (index === 2) void openUrl(urls.yandex);
          if (index === 3) void openUrl(urls.apple);
        }
      );
    } else {
      Alert.alert(t("eventDetail.route"), t("eventDetail.routeSelect"), [
        { text: t("eventDetail.googleMaps"), onPress: () => void openUrl(urls.google) },
        { text: t("eventDetail.yandex"), onPress: () => void openUrl(urls.yandex) },
        { text: t("common.cancel"), style: "cancel" },
      ]);
    }
  }

  async function handleAddParticipant() {
    if (!eventId || !participantEmail.trim()) {
      Alert.alert(t("common.error"), "Email gerekli.");
      return;
    }

    try {
      setIsAddingParticipant(true);
      const token = await getToken();
      if (!token) return;
      const response = await apiFetch<AddParticipantResponse>(
        `/events/${eventId}/participants`,
        {
          method: "POST",
          body: JSON.stringify({
            email: participantEmail.trim(),
            name: participantName.trim() || undefined,
          }),
        },
        token
      );
      setGeneratedInviteLink(response.inviteLink);
      setParticipantEmail("");
      setParticipantName("");
      await loadParticipants();
    } catch (error) {
      Alert.alert(t("common.error"), error instanceof Error ? error.message : "Davet gonderilemedi.");
    } finally {
      setIsAddingParticipant(false);
    }
  }

  function getStatusColor(status: Participant["status"]): string {
    if (status === "accepted") return colors.success;
    if (status === "declined") return colors.danger;
    return colors.warning;
  }

  function getInitials(participant: Participant): string {
    const text =
      participant.name ||
      participant.user?.name ||
      participant.user?.email ||
      participant.email;
    return text
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("");
  }

  const typeMeta = event ? EVENT_TYPES[event.type.toLowerCase()] ?? EVENT_TYPES.other : EVENT_TYPES.other;
  const travelMode = event?.travelMode ?? storedUser?.transportMode ?? "driving";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: spacing.xl }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg }}>
          <Pressable onPress={() => router.replace("/(tabs)/home")} style={{ marginRight: spacing.md }}>
            <Text variant="h3" color={colors.primary}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 30, marginRight: spacing.sm }}>{typeMeta.emoji}</Text>
            <Text variant="h2" style={{ flex: 1 }}>
            {event?.title ?? t("profile.events")}
          </Text>
        </View>

        {isLoadingEvent || !event ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.lg }}>
              <IconClock size={16} color={colors.textSecondary} />
              <Text variant="body" color={colors.textSecondary} style={{ marginLeft: spacing.xs }}>
                {formatEventDateTime(event.date, locale)}
              </Text>
            </View>

            <Card style={{ marginBottom: spacing.lg }}>
              {isLoadingTravel ? (
                <ActivityIndicator color={colors.primary} />
              ) : travelInfo ? (
                <>
                  <Text variant="label" color={colors.textSecondary}>{t("eventDetail.leaveHome")}</Text>
                  <Text variant="h1" style={{ marginTop: spacing.xs }}>
                    {new Date(travelInfo.departureTime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <View style={{ flexDirection: "row", marginTop: spacing.sm, gap: spacing.sm }}>
                    <Badge label={travelInfo.durationText} variant="primary" />
                    <Badge label={travelInfo.distanceText} variant="neutral" />
                    <Badge label={TRANSPORT_LABELS[travelMode] ?? travelMode} variant="warning" />
                  </View>

                  {travelInfo.transitDetails?.steps?.length ? (
                    <View style={{ marginTop: spacing.md }}>
                      {travelInfo.transitDetails.steps.map((step, idx) => (
                        <View key={`${step.type}-${idx}`} style={{ flexDirection: "row", marginBottom: spacing.sm }}>
                          <View style={{ alignItems: "center", marginRight: spacing.sm }}>
                            <View style={{ width: 8, height: 8, borderRadius: radii.full, backgroundColor: step.type === "transit" ? colors.primary : colors.textTertiary }} />
                            {idx < travelInfo.transitDetails!.steps.length - 1 ? (
                              <View style={{ width: 1, flex: 1, backgroundColor: colors.border, marginTop: 2 }} />
                            ) : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text variant="bodySmall">{step.instruction}</Text>
                            <Text variant="caption" color={colors.textSecondary}>
                              {step.line ? `${step.line} · ` : ""}{step.duration}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <Button onPress={() => void openDirections(travelMode)} variant="secondary" style={{ marginTop: spacing.md }}>
                    {t("eventDetail.route")}
                  </Button>
                </>
              ) : (
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {travelError ?? t("eventDetail.travelUnavailable")}
                </Text>
              )}
            </Card>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Text variant="h3">{t("eventDetail.checklist")}</Text>
              <IconSparkles size={18} color={colors.primary} style={{ marginLeft: spacing.xs }} />
            </View>
            <Card>
              {sortedChecklist.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => void handleToggleChecklistItem(item)}
                  style={{ flexDirection: "row", marginBottom: spacing.md }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radii.full,
                      borderWidth: 1.5,
                      borderColor: item.isCompleted ? colors.primary : colors.border,
                      backgroundColor: item.isCompleted ? colors.primary : colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: spacing.sm,
                    }}
                  >
                    {item.isCompleted ? <Text variant="caption" color={colors.white}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="body"
                      color={item.isCompleted ? colors.textTertiary : colors.text}
                      style={{ textDecorationLine: item.isCompleted ? "line-through" : "none" }}
                    >
                      {item.title}
                    </Text>
                    {formatScheduledAt(item.scheduledAt, locale) ? (
                      <Text variant="caption" color={colors.textTertiary}>
                        {formatScheduledAt(item.scheduledAt, locale)}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </Card>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.sm }}>
              <Text variant="h3">Katilimcilar</Text>
              <IconUserPlus size={18} color={colors.primary} style={{ marginLeft: spacing.xs }} />
            </View>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
                {participants.slice(0, 5).map((participant) => (
                  <View
                    key={participant.id}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radii.full,
                      backgroundColor: colors.backgroundTertiary,
                      borderWidth: 2,
                      borderColor: getStatusColor(participant.status),
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: spacing.xs,
                    }}
                  >
                    <Text variant="caption">{getInitials(participant)}</Text>
                  </View>
                ))}
                {participants.length > 5 ? (
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    +{participants.length - 5} more
                  </Text>
                ) : null}
              </View>

              <Button variant="secondary" onPress={() => setParticipantsModalVisible(true)}>
                Kisi Ekle +
              </Button>
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={isParticipantsModalVisible} transparent animationType="slide" onRequestClose={() => setParticipantsModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              padding: spacing.xl,
            }}
          >
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              Davet Gonder
            </Text>
            <Input
              label="Email"
              value={participantEmail}
              onChangeText={setParticipantEmail}
              placeholder="ornek@email.com"
            />
            <Input
              label="Isim (opsiyonel)"
              value={participantName}
              onChangeText={setParticipantName}
              placeholder="Ahmet"
            />
            <Button onPress={handleAddParticipant} loading={isAddingParticipant}>
              Davet Gonder
            </Button>
            {generatedInviteLink ? (
              <Card style={{ marginTop: spacing.md }}>
                <Text variant="caption" color={colors.textSecondary}>
                  Davet Linki
                </Text>
                <Text variant="bodySmall" style={{ marginVertical: spacing.xs }}>
                  {generatedInviteLink}
                </Text>
                <Button
                  variant="ghost"
                  onPress={async () => {
                    await Clipboard.setStringAsync(generatedInviteLink);
                    Alert.alert("Kopyalandi", "Davet linki panoya kopyalandi.");
                  }}
                >
                  Kopyala
                </Button>
              </Card>
            ) : null}
            <Button
              variant="ghost"
              onPress={() => {
                setParticipantsModalVisible(false);
                setGeneratedInviteLink(null);
              }}
              style={{ marginTop: spacing.sm }}
            >
              {t("common.cancel")}
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

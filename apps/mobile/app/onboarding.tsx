import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { LocationInput } from "../components/ui/LocationInput";
import { Text } from "../components/ui/Text";
import type { User } from "../constants/types";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../lib/i18n";
import { apiFetch } from "../lib/api";
import { getToken, saveUser } from "../lib/storage";

const TOTAL_STEPS = 5;
const STEP_EMOJIS = ["👋", "💼", "🗓️", "🏠", "🎉"];

const WEEKDAYS = [
  { value: "monday" },
  { value: "tuesday" },
  { value: "wednesday" },
  { value: "thursday" },
  { value: "friday" },
  { value: "saturday" },
  { value: "sunday" },
] as const;

const TRANSPORT_MODES = [
  { icon: "🚶", value: "walking" },
  { icon: "🚌", value: "transit" },
  { icon: "🚗", value: "driving" },
  { icon: "🚲", value: "cycling" },
] as const;

type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];

type OnboardingData = {
  name: string;
  surname: string;
  occupation: string;
  workLocation: string;
  workLocationLat: number | null;
  workLocationLng: number | null;
  workDays: string[];
  transportMode: TransportMode | "";
  homeLocation: string;
  homeLocationLat: number | null;
  homeLocationLng: number | null;
  morningAlarm: boolean;
};

type ProfileResponse = { user: User };

const INITIAL_DATA: OnboardingData = {
  name: "",
  surname: "",
  occupation: "",
  workLocation: "",
  workLocationLat: null,
  workLocationLng: null,
  workDays: [],
  transportMode: "",
  homeLocation: "",
  homeLocationLat: null,
  homeLocationLng: null,
  morningAlarm: false,
};

const inputFieldStyle = {
  minHeight: 52,
  borderRadius: 24,
} as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  function updateField<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function animateStepChange(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  function validateStep(): boolean {
    if (step === 1 && (!data.name.trim() || !data.surname.trim())) {
      Alert.alert(t("common.missingInfo"), t("onboarding.fillName"));
      return false;
    }
    if (step === 2 && (!data.occupation.trim() || !data.workLocation.trim())) {
      Alert.alert(t("common.missingInfo"), t("onboarding.fillWork"));
      return false;
    }
    if (step === 3 && (data.workDays.length === 0 || !data.transportMode)) {
      Alert.alert(t("common.missingInfo"), t("onboarding.fillSchedule"));
      return false;
    }
    if (step === 4 && !data.homeLocation.trim()) {
      Alert.alert(t("common.missingInfo"), t("onboarding.fillHome"));
      return false;
    }
    return true;
  }

  async function handleFinish() {
    setIsSubmitting(true);
    const profilePayload = {
      name: data.name.trim(),
      surname: data.surname.trim(),
      occupation: data.occupation.trim(),
      workLocation: data.workLocation.trim(),
      workLocationLat: data.workLocationLat ?? undefined,
      workLocationLng: data.workLocationLng ?? undefined,
      homeLocation: data.homeLocation.trim(),
      homeLocationLat: data.homeLocationLat ?? undefined,
      homeLocationLng: data.homeLocationLng ?? undefined,
      workDays: data.workDays,
      transportMode: data.transportMode,
      morningAlarm: data.morningAlarm,
    };

    try {
      const token = await getToken();
      if (!token) {
        router.replace("/auth");
        return;
      }
      const response = await apiFetch<ProfileResponse>(
        "/profile",
        { method: "POST", body: JSON.stringify(profilePayload) },
        token
      );
      await saveUser(response.user);
      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err instanceof Error ? err.message : t("onboarding.saveProfileFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (step === TOTAL_STEPS) {
      void handleFinish();
      return;
    }
    if (validateStep()) animateStepChange(step + 1);
  }

  const stepTitles = [
    t("onboarding.step1Title"),
    t("onboarding.step2Title"),
    t("onboarding.step3Title"),
    t("onboarding.step4Title"),
    t("onboarding.step5Title"),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1 }}>
          {/* TOP: progress */}
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ marginBottom: spacing.xs, textAlign: "right" }}
            >
              {step} / {TOTAL_STEPS}
            </Text>
            <View
              style={{
                height: 4,
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
          </View>

          {/* MIDDLE: scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
              <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: radii.full,
                    backgroundColor: colors.backgroundTertiary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 56, lineHeight: 64 }}>{STEP_EMOJIS[step - 1]}</Text>
                </View>
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Inter_700Bold",
                  color: colors.text,
                  marginBottom: spacing.xl,
                  textAlign: "center",
                }}
              >
                {stepTitles[step - 1]}
              </Text>

              {step === 1 ? (
                <View>
                  <Input
                    label={t("onboarding.name")}
                    value={data.name}
                    onChangeText={(txt) => updateField("name", txt)}
                    inputStyle={inputFieldStyle}
                  />
                  <Input
                    label={t("onboarding.surname")}
                    value={data.surname}
                    onChangeText={(txt) => updateField("surname", txt)}
                    inputStyle={inputFieldStyle}
                  />
                </View>
              ) : null}

              {step === 2 ? (
                <View>
                  <Input
                    label={t("onboarding.occupation")}
                    value={data.occupation}
                    onChangeText={(txt) => updateField("occupation", txt)}
                    inputStyle={inputFieldStyle}
                  />
                  <LocationInput
                    label={t("onboarding.workLocation")}
                    value={data.workLocation}
                    placeholder={t("onboarding.workPlaceholder")}
                    onLocationSelect={({ address, lat, lng }) => {
                      updateField("workLocation", address);
                      updateField("workLocationLat", address ? lat : null);
                      updateField("workLocationLng", address ? lng : null);
                    }}
                  />
                </View>
              ) : null}

              {step === 3 ? (
                <View>
                  <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                    {t("onboarding.weekdays")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: spacing.sm,
                      marginBottom: spacing.xl,
                    }}
                  >
                    {WEEKDAYS.map((day) => {
                      const selected = data.workDays.includes(day.value);
                      return (
                        <Pressable
                          key={day.value}
                          onPress={() =>
                            updateField(
                              "workDays",
                              selected
                                ? data.workDays.filter((d) => d !== day.value)
                                : [...data.workDays, day.value]
                            )
                          }
                          style={{
                            borderRadius: radii.full,
                            paddingHorizontal: spacing.lg,
                            paddingVertical: spacing.md,
                            backgroundColor: selected ? colors.primary : colors.backgroundSecondary,
                          }}
                        >
                          <Text variant="label" color={selected ? colors.white : colors.textSecondary}>
                            {t(`onboarding.weekdaysShort.${day.value}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
                    {t("onboarding.transport")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
                    {TRANSPORT_MODES.map((mode) => {
                      const selected = data.transportMode === mode.value;
                      return (
                        <Pressable
                          key={mode.value}
                          onPress={() => updateField("transportMode", mode.value)}
                          style={{
                            width: "47%",
                            borderRadius: radii.xl,
                            borderWidth: 1.5,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
                            paddingVertical: spacing.lg,
                            paddingHorizontal: spacing.md,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ fontSize: 28 }}>{mode.icon}</Text>
                          <Text
                            variant="bodySmall"
                            color={selected ? colors.text : colors.textSecondary}
                            style={{ marginTop: spacing.sm, textAlign: "center" }}
                          >
                            {t(`onboarding.transportModes.${mode.value}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {step === 4 ? (
                <View>
                  <LocationInput
                    label={t("onboarding.homeAddress")}
                    value={data.homeLocation}
                    placeholder={t("onboarding.homePlaceholder")}
                    onLocationSelect={({ address, lat, lng }) => {
                      updateField("homeLocation", address);
                      updateField("homeLocationLat", address ? lat : null);
                      updateField("homeLocationLng", address ? lng : null);
                    }}
                  />
                  <View
                    style={{
                      marginTop: spacing.lg,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: radii.xl,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text variant="body">{t("onboarding.morningAlarm")}</Text>
                    <Switch
                      value={data.morningAlarm}
                      onValueChange={(v) => updateField("morningAlarm", v)}
                      trackColor={{ false: colors.border, true: colors.primaryLight }}
                      thumbColor={data.morningAlarm ? colors.primary : colors.surface}
                    />
                  </View>
                </View>
              ) : null}

              {step === 5 ? (
                <Card style={{ marginTop: spacing.sm }}>
                  <SummaryRow label={t("onboarding.summary.fullName")} value={`${data.name} ${data.surname}`} />
                  <SummaryRow label={t("onboarding.occupation")} value={data.occupation} />
                  <SummaryRow label={t("onboarding.workLocation")} value={data.workLocation} />
                  <SummaryRow label={t("onboarding.summary.workDays")} value={data.workDays.join(", ")} />
                  <SummaryRow label={t("onboarding.summary.transport")} value={data.transportMode || "-"} />
                  <SummaryRow label={t("onboarding.summary.homeAddress")} value={data.homeLocation} />
                </Card>
              ) : null}
            </Animated.View>
          </ScrollView>

          {/* BOTTOM: fixed horizontal button row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.xl,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              backgroundColor: colors.background,
            }}
          >
            {step > 1 ? (
              <Button
                variant="ghost"
                size="lg"
                onPress={() => animateStepChange(step - 1)}
                style={{ minHeight: 48, minWidth: 100 }}
              >
                {t("common.back")}
              </Button>
            ) : (
              <View style={{ minWidth: 100 }} />
            )}

            {step < TOTAL_STEPS ? (
              <Button
                size="lg"
                onPress={handleNext}
                style={{ minHeight: 48, minWidth: 120 }}
              >
                {t("common.next")}
              </Button>
            ) : (
              <Button
                size="lg"
                onPress={() => void handleFinish()}
                loading={isSubmitting}
                style={{ minHeight: 48, minWidth: 120 }}
              >
                {t("onboarding.start")}
              </Button>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="body" color={colors.text} style={{ marginTop: spacing.xs }}>
        {value || "-"}
      </Text>
    </View>
  );
}

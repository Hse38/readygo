import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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
        await saveUser({ ...profilePayload, email: "", id: "" });
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

  const progress = step / 5;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
          <View
            style={{
              height: 3,
              borderRadius: radii.full,
              overflow: "hidden",
              backgroundColor: colors.borderLight,
            }}
          >
            <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.primary }} />
          </View>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.xs, textAlign: "right" }}>
            {step} / 5
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: spacing.xl }}
          contentContainerStyle={{ paddingBottom: spacing.xl, paddingTop: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 44 }}>{["👋", "💼", "🗓️", "🏠", "🎉"][step - 1]}</Text>
            </View>

            {step === 1 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("onboarding.step1Title")}
                </Text>
                <Input label={t("onboarding.name")} value={data.name} onChangeText={(txt) => updateField("name", txt)} />
                <Input label={t("onboarding.surname")} value={data.surname} onChangeText={(txt) => updateField("surname", txt)} />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("onboarding.step2Title")}
                </Text>
                <Input
                  label={t("onboarding.occupation")}
                  value={data.occupation}
                  onChangeText={(t) => updateField("occupation", t)}
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
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("onboarding.step3Title")}
                </Text>
                <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                  {t("onboarding.weekdays")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
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
                          paddingVertical: spacing.sm,
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

                <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
                  {t("onboarding.transport")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {TRANSPORT_MODES.map((mode) => {
                    const selected = data.transportMode === mode.value;
                    return (
                      <Pressable
                        key={mode.value}
                        onPress={() => updateField("transportMode", mode.value)}
                        style={{
                          width: "48%",
                          borderRadius: radii.lg,
                          borderWidth: 1.5,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.backgroundTertiary : colors.surface,
                          padding: spacing.md,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 24 }}>{mode.icon}</Text>
                        <Text variant="bodySmall" style={{ marginTop: spacing.xs }}>
                          {t(`onboarding.transportModes.${mode.value}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("onboarding.step4Title")}
                </Text>
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
                    marginTop: spacing.sm,
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
              </>
            ) : null}

            {step === 5 ? (
              <>
                <Text variant="h2" style={{ marginBottom: spacing.lg }}>
                  {t("onboarding.step5Title")}
                </Text>
                <Card>
                  <SummaryRow label={t("onboarding.summary.fullName")} value={`${data.name} ${data.surname}`} />
                  <SummaryRow label={t("onboarding.occupation")} value={data.occupation} />
                  <SummaryRow label={t("onboarding.workLocation")} value={data.workLocation} />
                  <SummaryRow label={t("onboarding.summary.workDays")} value={data.workDays.join(", ")} />
                  <SummaryRow label={t("onboarding.summary.transport")} value={data.transportMode || "-"} />
                  <SummaryRow label={t("onboarding.summary.homeAddress")} value={data.homeLocation} />
                </Card>
              </>
            ) : null}
          </Animated.View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
          {step === 5 ? (
            <Button onPress={handleFinish} loading={isSubmitting} size="lg" style={{ borderRadius: radii.xl }}>
              {t("onboarding.start")}
            </Button>
          ) : (
            <Button
              onPress={() => {
                if (validateStep()) animateStepChange(step + 1);
              }}
              size="lg"
              style={{ borderRadius: radii.xl }}
            >
              {t("common.next")}
            </Button>
          )}
          {step > 1 ? (
            <Button
              onPress={() => animateStepChange(step - 1)}
              variant="ghost"
              size="md"
              style={{ marginTop: spacing.sm }}
            >
              {t("common.back")}
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text variant="caption" color={colors.textTertiary}>
        {label}
      </Text>
      <Text variant="body">{value || "-"}</Text>
    </View>
  );
}

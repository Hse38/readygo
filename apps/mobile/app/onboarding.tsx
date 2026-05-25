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
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../lib/api";
import { getToken, saveUser } from "../lib/storage";
import type { User } from "../constants/types";

const PRIMARY = "#AFA9EC";

const WEEKDAYS = [
  { label: "Pzt", value: "monday" },
  { label: "Sal", value: "tuesday" },
  { label: "Çar", value: "wednesday" },
  { label: "Per", value: "thursday" },
  { label: "Cum", value: "friday" },
  { label: "Cmt", value: "saturday" },
  { label: "Paz", value: "sunday" },
] as const;

const TRANSPORT_MODES = [
  { icon: "🚶", label: "Yürüyüş", value: "walking" },
  { icon: "🚌", label: "Toplu Taşıma", value: "transit" },
  { icon: "🚗", label: "Araç", value: "driving" },
  { icon: "🚲", label: "Bisiklet", value: "cycling" },
] as const;

type TransportMode = (typeof TRANSPORT_MODES)[number]["value"];

type OnboardingData = {
  name: string;
  surname: string;
  occupation: string;
  workLocation: string;
  workDays: string[];
  transportMode: TransportMode | "";
  homeLocation: string;
  morningAlarm: boolean;
};

type ProfileResponse = {
  user: User;
};

const INITIAL_DATA: OnboardingData = {
  name: "",
  surname: "",
  occupation: "",
  workLocation: "",
  workDays: [],
  transportMode: "",
  homeLocation: "",
  morningAlarm: false,
};

function getTransportLabel(value: string): string {
  return TRANSPORT_MODES.find((mode) => mode.value === value)?.label ?? value;
}

function getWeekdayLabels(values: string[]): string {
  return values
    .map((value) => WEEKDAYS.find((day) => day.value === value)?.label ?? value)
    .join(", ");
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

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const progress = step / 5;

  function updateField<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
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

  function toggleWorkDay(value: string) {
    setData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(value)
        ? prev.workDays.filter((day) => day !== value)
        : [...prev.workDays, value],
    }));
  }

  function validateStep(): boolean {
    switch (step) {
      case 1:
        if (!data.name.trim() || !data.surname.trim()) {
          Alert.alert("Eksik bilgi", "Lütfen ad ve soyad alanlarını doldurun.");
          return false;
        }
        return true;
      case 2:
        if (!data.occupation.trim() || !data.workLocation.trim()) {
          Alert.alert(
            "Eksik bilgi",
            "Lütfen meslek ve iş konumu alanlarını doldurun."
          );
          return false;
        }
        return true;
      case 3:
        if (data.workDays.length === 0 || !data.transportMode) {
          Alert.alert(
            "Eksik bilgi",
            "Lütfen en az bir çalışma günü ve ulaşım tercihi seçin."
          );
          return false;
        }
        return true;
      case 4:
        if (!data.homeLocation.trim()) {
          Alert.alert("Eksik bilgi", "Lütfen ev adresinizi girin.");
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  function handleNext() {
    if (!validateStep()) return;
    if (step < 5) animateStepChange(step + 1);
  }

  function handleBack() {
    if (step > 1) animateStepChange(step - 1);
  }

  async function handleFinish() {
    setIsSubmitting(true);

    const profilePayload = {
      name: data.name.trim(),
      surname: data.surname.trim(),
      occupation: data.occupation.trim(),
      workLocation: data.workLocation.trim(),
      homeLocation: data.homeLocation.trim(),
      workDays: data.workDays,
      transportMode: data.transportMode,
      morningAlarm: data.morningAlarm,
    };

    const localUser: Partial<User> = {
      ...profilePayload,
      email: "",
      id: "",
    };

    try {
      const token = await getToken();

      if (!token) {
        await saveUser(localUser);
        router.replace("/auth");
        return;
      }

      const response = await apiFetch<ProfileResponse>(
        "/profile",
        {
          method: "POST",
          body: JSON.stringify(profilePayload),
        },
        token
      );

      await saveUser(response.user);
      router.replace("/(tabs)/home");
    } catch (err) {
      Alert.alert(
        "Hata",
        err instanceof Error ? err.message : "Profil kaydedilemedi."
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
              Merhaba! Seni tanıyalım 👋
            </Text>
            <InputField
              label="Ad"
              value={data.name}
              onChangeText={(text) => updateField("name", text)}
            />
            <InputField
              label="Soyad"
              value={data.surname}
              onChangeText={(text) => updateField("surname", text)}
            />
          </>
        );

      case 2:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              İş bilgilerin
            </Text>
            <InputField
              label="Meslek"
              value={data.occupation}
              onChangeText={(text) => updateField("occupation", text)}
            />
            <InputField
              label="İş Konumu"
              value={data.workLocation}
              onChangeText={(text) => updateField("workLocation", text)}
              placeholder="Şişli, İstanbul"
            />
          </>
        );

      case 3:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Çalışma düzenin
            </Text>
            <Text className="mb-3 text-sm font-medium text-gray-700">
              Çalışma günleri
            </Text>
            <View className="mb-6 flex-row flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const selected = data.workDays.includes(day.value);
                return (
                  <Pressable
                    key={day.value}
                    onPress={() => toggleWorkDay(day.value)}
                    className="rounded-full px-4 py-2.5"
                    style={{
                      backgroundColor: selected ? PRIMARY : "#F3F4F6",
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: selected ? "#FFFFFF" : "#374151" }}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mb-3 text-sm font-medium text-gray-700">
              Ulaşım tercihi
            </Text>
            <View className="gap-3">
              {TRANSPORT_MODES.map((mode) => {
                const selected = data.transportMode === mode.value;
                return (
                  <Pressable
                    key={mode.value}
                    onPress={() => updateField("transportMode", mode.value)}
                    className="flex-row items-center rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: selected ? PRIMARY : "#E5E7EB",
                      backgroundColor: selected ? "#F5F3FF" : "#FFFFFF",
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

      case 4:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Ev konumun
            </Text>
            <InputField
              label="Ev adresi"
              value={data.homeLocation}
              onChangeText={(text) => updateField("homeLocation", text)}
              placeholder="Kadıköy, İstanbul"
            />
            <Pressable
              onPress={() => updateField("morningAlarm", !data.morningAlarm)}
              className="mt-2 flex-row items-center"
            >
              <View
                className="mr-3 h-6 w-6 items-center justify-center rounded-md border"
                style={{
                  borderColor: data.morningAlarm ? PRIMARY : "#D1D5DB",
                  backgroundColor: data.morningAlarm ? PRIMARY : "#FFFFFF",
                }}
              >
                {data.morningAlarm ? (
                  <Text className="text-xs font-bold text-white">✓</Text>
                ) : null}
              </View>
              <Text className="text-base text-gray-800">
                Sabah alarmı istiyorum
              </Text>
            </Pressable>
          </>
        );

      case 5:
        return (
          <>
            <Text className="mb-6 text-2xl font-bold text-gray-900">
              Hazırsın! 🎉
            </Text>
            <View className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <SummaryRow label="Ad Soyad" value={`${data.name} ${data.surname}`} />
              <SummaryRow label="Meslek" value={data.occupation} />
              <SummaryRow label="İş Konumu" value={data.workLocation} />
              <SummaryRow
                label="Çalışma Günleri"
                value={getWeekdayLabels(data.workDays)}
              />
              <SummaryRow
                label="Ulaşım"
                value={getTransportLabel(data.transportMode)}
              />
              <SummaryRow label="Ev Adresi" value={data.homeLocation} />
              <SummaryRow
                label="Sabah Alarmı"
                value={data.morningAlarm ? "Evet" : "Hayır"}
              />
            </View>
          </>
        );

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
        <View className="px-6 pt-4">
          <View className="h-2 overflow-hidden rounded-full bg-gray-100">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress * 100}%`, backgroundColor: PRIMARY }}
            />
          </View>
          <Text className="mt-2 text-right text-xs text-gray-400">
            {step} / 5
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
          {step === 5 ? (
            <Pressable
              onPress={handleFinish}
              disabled={isSubmitting}
              className="items-center rounded-full py-4"
              style={{ backgroundColor: PRIMARY, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  Başlayalım
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

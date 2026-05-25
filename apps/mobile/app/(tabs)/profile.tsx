import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { User } from "../../constants/types";
import { clearAll, getUser } from "../../lib/storage";

const PRIMARY = "#AFA9EC";

function isUser(value: object | null): value is User {
  return !!value && typeof value === "object" && "name" in value;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const stored = await getUser();
    setUser(isUser(stored) ? stored : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function handleLogout() {
    await clearAll();
    router.replace("/onboarding");
  }

  function handleEditProfile() {
    Alert.alert("Yakında", "Profil düzenleme yakında eklenecek.");
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-8 pt-6">
        <Text className="mb-8 text-3xl font-bold text-gray-900">Profil</Text>

        <View className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <InfoRow label="Ad" value={user?.name ?? "-"} />
          <InfoRow label="Soyad" value={user?.surname ?? "-"} />
          <InfoRow label="Meslek" value={user?.occupation ?? "-"} />
          <InfoRow label="İş Konumu" value={user?.workLocation ?? "-"} />
        </View>

        <Pressable
          onPress={handleEditProfile}
          className="mb-3 items-center rounded-full py-4"
          style={{ backgroundColor: PRIMARY }}
        >
          <Text className="text-base font-semibold text-white">
            Profili Düzenle
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          className="items-center rounded-full border border-gray-200 py-4"
        >
          <Text className="text-base font-semibold text-gray-700">Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4 last:mb-0">
      <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </Text>
      <Text className="text-base text-gray-900">{value}</Text>
    </View>
  );
}

import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_WEB_CLIENT_ID,
} from "../constants/config";
import type { User } from "../constants/types";
import { apiFetch } from "../lib/api";
import { getToken, getUser, saveToken, saveUser } from "../lib/storage";

const PRIMARY = "#AFA9EC";

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    surname: string | null;
  };
};

type ProfileResponse = {
  user: User;
};

type LocalProfile = Partial<User> & {
  occupation?: string;
  workLocation?: string;
  homeLocation?: string;
  workDays?: string[];
  transportMode?: string;
  morningAlarm?: boolean;
};

function isLocalProfile(user: object | null): user is LocalProfile {
  return (
    !!user &&
    typeof user === "object" &&
    "occupation" in user &&
    typeof user.occupation === "string" &&
    user.occupation.length > 0
  );
}

function isGoogleAuthConfigured(): boolean {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  if (Platform.OS === "android") return Boolean(GOOGLE_CLIENT_ID_ANDROID);
  if (Platform.OS === "ios") return Boolean(GOOGLE_CLIENT_ID_IOS);
  return false;
}

export default function AuthScreen() {
  const router = useRouter();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    async function checkExistingToken() {
      const token = await getToken();
      if (token) {
        router.replace("/(tabs)/home");
      } else {
        setIsCheckingToken(false);
      }
    }

    checkExistingToken();
  }, [router]);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
  }, []);

  useEffect(() => {
    if (!isGoogleAuthConfigured()) return;

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_CLIENT_ID_IOS ? { iosClientId: GOOGLE_CLIENT_ID_IOS } : {}),
    });
  }, []);

  async function completeAuth(authResponse: AuthResponse) {
    await saveToken(authResponse.token);

    const localProfile = await getUser();
    if (isLocalProfile(localProfile)) {
      try {
        const profileResponse = await apiFetch<ProfileResponse>(
          "/profile",
          {
            method: "POST",
            body: JSON.stringify({
              name: localProfile.name ?? authResponse.user.name ?? "",
              surname: localProfile.surname ?? authResponse.user.surname ?? "",
              occupation: localProfile.occupation,
              workLocation: localProfile.workLocation,
              homeLocation: localProfile.homeLocation,
              workDays: localProfile.workDays ?? [],
              transportMode: localProfile.transportMode,
              morningAlarm: localProfile.morningAlarm ?? false,
            }),
          },
          authResponse.token
        );
        await saveUser(profileResponse.user);
      } catch {
        await saveUser({
          ...authResponse.user,
          ...localProfile,
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name ?? localProfile.name ?? "",
          surname: authResponse.user.surname ?? localProfile.surname ?? "",
        });
      }
    } else {
      await saveUser({
        id: authResponse.user.id,
        email: authResponse.user.email,
        name: authResponse.user.name ?? "",
        surname: authResponse.user.surname ?? "",
      });
    }

    router.replace("/(tabs)/home");
  }

  async function handleAppleSignIn() {
    try {
      setIsLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple kimlik doğrulama başarısız.");
      }

      const authResponse = await apiFetch<AuthResponse>("/auth/apple", {
        method: "POST",
        body: JSON.stringify({
          identityToken: credential.identityToken,
          fullName: {
            givenName: credential.fullName?.givenName ?? undefined,
            familyName: credential.fullName?.familyName ?? undefined,
          },
        }),
      });

      await completeAuth(authResponse);
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(
        "Giriş başarısız",
        err instanceof Error ? err.message : "Apple ile giriş yapılamadı."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === "cancelled") return;

      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens.idToken;
      if (!idToken) {
        throw new Error("Google idToken alınamadı.");
      }

      const authResponse = await apiFetch<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });

      await completeAuth(authResponse);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;

      Alert.alert("Hata", "Google ile giriş yapılamadı");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingToken) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-5xl font-light tracking-tight text-gray-900">
            r
            <Text className="font-bold" style={{ color: PRIMARY }}>
              GO
            </Text>
          </Text>
          <Text className="mt-3 text-base text-gray-500">
            Hesabına giriş yap
          </Text>
        </View>

        <View className="gap-3 pb-4">
          {isAppleAvailable && Platform.OS === "ios" ? (
            <Pressable
              onPress={handleAppleSignIn}
              disabled={isLoading}
              className="flex-row items-center justify-center rounded-2xl py-4"
              style={{
                backgroundColor: "#000000",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              <Text className="mr-2 text-xl text-white">
                {Platform.OS === "ios" ? "\uF8FF" : ""}
              </Text>
              <Text className="text-base font-semibold text-white">
                Apple ile devam et
              </Text>
            </Pressable>
          ) : null}

          {isGoogleAuthConfigured() ? (
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              className="flex-row items-center justify-center rounded-2xl border border-gray-200 bg-white py-4"
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              <Text className="mr-2 text-base font-bold">
                <Text style={{ color: "#4285F4" }}>G</Text>
                <Text style={{ color: "#EA4335" }}>o</Text>
                <Text style={{ color: "#FBBC05" }}>o</Text>
                <Text style={{ color: "#4285F4" }}>g</Text>
                <Text style={{ color: "#34A853" }}>l</Text>
                <Text style={{ color: "#EA4335" }}>e</Text>
              </Text>
              <Text className="text-base font-semibold text-gray-800">
                Google ile devam et
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled
              className="flex-row items-center justify-center rounded-2xl border border-gray-200 bg-white py-4"
              style={{ opacity: 0.5 }}
            >
              <Text className="mr-2 text-base font-bold">
                <Text style={{ color: "#4285F4" }}>G</Text>
                <Text style={{ color: "#EA4335" }}>o</Text>
                <Text style={{ color: "#FBBC05" }}>o</Text>
                <Text style={{ color: "#4285F4" }}>g</Text>
                <Text style={{ color: "#34A853" }}>l</Text>
                <Text style={{ color: "#EA4335" }}>e</Text>
              </Text>
              <Text className="text-base font-semibold text-gray-400">
                Google ile devam et · Yakında
              </Text>
            </Pressable>
          )}

          {isLoading ? (
            <ActivityIndicator color={PRIMARY} className="mt-2" />
          ) : null}

          <View className="mt-4 flex-row items-center justify-center gap-1">
            <Pressable>
              <Text className="text-xs text-gray-400 underline">
                Gizlilik Politikası
              </Text>
            </Pressable>
            <Text className="text-xs text-gray-300">·</Text>
            <Pressable>
              <Text className="text-xs text-gray-400 underline">
                Kullanım Koşulları
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

import * as AppleAuthentication from "expo-apple-authentication";
import { exchangeCodeAsync, makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
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
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
} from "../constants/config";
import type { User } from "../constants/types";
import { apiFetch } from "../lib/api";
import { getToken, getUser, saveToken, saveUser } from "../lib/storage";

WebBrowser.maybeCompleteAuthSession();

const PRIMARY = "#AFA9EC";
const redirectUri = makeRedirectUri({ scheme: "readygo" });

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
  if (Platform.OS === "android") return Boolean(GOOGLE_CLIENT_ID_ANDROID);
  if (Platform.OS === "ios") return Boolean(GOOGLE_CLIENT_ID_IOS);
  return Boolean(GOOGLE_CLIENT_ID);
}

function getGoogleClientId(): string {
  if (Platform.OS === "android") return GOOGLE_CLIENT_ID_ANDROID;
  if (Platform.OS === "ios") return GOOGLE_CLIENT_ID_IOS;
  return GOOGLE_CLIENT_ID;
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
            <GoogleSignInButton
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onCompleteAuth={completeAuth}
            />
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

type GoogleSignInButtonProps = {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onCompleteAuth: (authResponse: AuthResponse) => Promise<void>;
};

function GoogleSignInButton({
  isLoading,
  setIsLoading,
  onCompleteAuth,
}: GoogleSignInButtonProps) {
  const googleHandledRef = useRef<string | null>(null);
  const clientId = getGoogleClientId();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID || undefined,
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID || undefined,
    redirectUri,
  });

  useEffect(() => {
    if (response?.type !== "success") return;
    const code = response.params.code;
    if (!code || googleHandledRef.current === code) return;
    googleHandledRef.current = code;
    handleGoogleResponse();
  }, [response]);

  async function handleGoogleResponse() {
    if (response?.type !== "success") return;

    try {
      setIsLoading(true);

      if (!clientId) {
        throw new Error("Google Client ID yapılandırılmamış.");
      }

      const { code } = response.params;
      if (!code || !request?.codeVerifier) {
        throw new Error("Google yetkilendirme kodu alınamadı.");
      }

      const tokenResponse = await exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        {
          tokenEndpoint: "https://oauth2.googleapis.com/token",
        }
      );

      if (!tokenResponse.idToken) {
        throw new Error("Google idToken alınamadı.");
      }

      const authResponse = await apiFetch<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: tokenResponse.idToken }),
      });

      await onCompleteAuth(authResponse);
    } catch (err) {
      Alert.alert(
        "Giriş başarısız",
        err instanceof Error ? err.message : "Google ile giriş yapılamadı."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      if (!clientId) return;
      const result = await promptAsync();
      if (result.type === "cancel" || result.type === "dismiss") return;
    } catch (err) {
      Alert.alert(
        "Giriş başarısız",
        err instanceof Error ? err.message : "Google ile giriş yapılamadı."
      );
    }
  }

  return (
    <Pressable
      onPress={handleGoogleSignIn}
      disabled={isLoading || !request}
      className="flex-row items-center justify-center rounded-2xl border border-gray-200 bg-white py-4"
      style={{ opacity: isLoading || !request ? 0.7 : 1 }}
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
  );
}

import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Text } from "../components/ui/Text";
import {
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_WEB_CLIENT_ID,
} from "../constants/config";
import type { User } from "../constants/types";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../lib/i18n";
import { apiFetch } from "../lib/api";
import { getToken, getUser, saveToken, saveUser } from "../lib/storage";

type AuthResponse = {
  token: string;
  user: { id: string; email: string; name: string | null; surname: string | null };
};

type ProfileResponse = { user: User };
type LocalProfile = Partial<User> & {
  occupation?: string;
  workLocation?: string;
  homeLocation?: string;
  workDays?: string[];
  transportMode?: string;
  morningAlarm?: boolean;
};

function isLocalProfile(user: object | null): user is LocalProfile {
  return !!user && typeof user === "object" && "occupation" in user;
}

function isGoogleAuthConfigured(): boolean {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  if (Platform.OS === "android") return Boolean(GOOGLE_CLIENT_ID_ANDROID);
  if (Platform.OS === "ios") return Boolean(GOOGLE_CLIENT_ID_IOS);
  return false;
}

export default function AuthScreen() {
  const router = useRouter();
  const { colors, spacing, radii, shadows } = useTheme();
  const { t } = useTranslation();
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    async function checkExistingToken() {
      const token = await getToken();
      if (token) router.replace("/(tabs)/home");
      else setIsCheckingToken(false);
    }
    checkExistingToken();
  }, [router]);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    if (isGoogleAuthConfigured()) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        ...(GOOGLE_CLIENT_ID_IOS ? { iosClientId: GOOGLE_CLIENT_ID_IOS } : {}),
      });
    }
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
              workLocationLat: localProfile.workLocationLat,
              workLocationLng: localProfile.workLocationLng,
              homeLocation: localProfile.homeLocation,
              homeLocationLat: localProfile.homeLocationLat,
              homeLocationLng: localProfile.homeLocationLng,
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
      if (!credential.identityToken) throw new Error("Apple girisi basarisiz.");
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
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert(
          t("auth.loginFailed"),
          err instanceof Error ? err.message : t("auth.appleFailed")
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === "cancelled") return;
      const tokens = await GoogleSignin.getTokens();
      if (!tokens.idToken) throw new Error("Google idToken alinamadi.");
      const authResponse = await apiFetch<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken: tokens.idToken }),
      });
      await completeAuth(authResponse);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code !== statusCodes.SIGN_IN_CANCELLED && err.code !== statusCodes.IN_PROGRESS) {
        Alert.alert(t("common.error"), t("auth.googleFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingToken) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <View style={{ height: "40%", alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: 280, height: 280, borderRadius: 999, backgroundColor: colors.primary, opacity: 0.12, top: -80 }} />
          <View style={{ position: "absolute", width: 210, height: 210, borderRadius: 999, backgroundColor: colors.primaryLight, opacity: 0.18, top: 10, right: -30 }} />
          <Text style={{ fontSize: 48, fontFamily: "Inter_700Bold", color: colors.textSecondary }}>
            r
            <Text style={{ color: colors.primary, fontSize: 48, fontFamily: "Inter_700Bold" }}>GO</Text>
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {t("auth.subtitle")}
          </Text>
        </View>

        <Card
          style={{
            flex: 1,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            padding: spacing.xl,
            ...shadows.lg,
          }}
        >
          <Text variant="h3" style={{ marginBottom: spacing.lg }}>
            {t("auth.title")}
          </Text>

          {isAppleAvailable && Platform.OS === "ios" ? (
            <Button onPress={handleAppleSignIn} disabled={isLoading} size="lg" style={{ backgroundColor: "#000000", borderRadius: radii.xl }}>
              {` ${t("auth.apple")}`}
            </Button>
          ) : null}

          <View style={{ alignItems: "center", marginVertical: spacing.md }}>
            <Text variant="caption" color={colors.textTertiary}>
              {t("auth.or")}
            </Text>
          </View>

          {isGoogleAuthConfigured() ? (
            <Button onPress={handleGoogleSignIn} disabled={isLoading} variant="secondary" size="lg" style={{ borderRadius: radii.xl }}>
              {t("auth.google")}
            </Button>
          ) : (
            <Button onPress={() => {}} disabled variant="secondary" size="lg" style={{ borderRadius: radii.xl }}>
              {t("auth.googleSoon")}
            </Button>
          )}

          {isLoading ? <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} /> : null}

          <View style={{ marginTop: "auto", flexDirection: "row", justifyContent: "center" }}>
            <Text variant="caption" color={colors.textTertiary}>
              {`${t("auth.policy")} · ${t("auth.terms")}`}
            </Text>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

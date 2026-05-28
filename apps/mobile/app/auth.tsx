import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { isProfileComplete } from "../lib/profile";
import { getToken, getUser, saveToken, saveUser } from "../lib/storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PARTICLE_COUNT = 20;
const GOOGLE_BUTTON_TEXT = "#1A1A2E";

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

function GoogleGIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a6.52 6.52 0 0 1-2.82 4.28v3.57h4.57c2.7-2.5 4.28-6.18 4.28-10.57z"
      />
      <Path
        fill="#34A853"
        d="M12 23c3.24 0 5.95-1.08 7.93-2.93l-3.57-2.77c-.98.66-2.23 1.05-4.36 1.05-3.34 0-6.17-2.25-7.18-5.29H2.05v3.57A11.99 11.99 0 0 0 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.82 14.06A7.2 7.2 0 0 1 5.47 12c0-.72.13-1.41.35-2.06V6.37H2.05A11.99 11.99 0 0 0 1 12c0 1.94.47 3.77 1.28 5.39l3.54-2.33z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.28 2.69 1.28 6.63l3.54 2.74C5.83 6.53 8.66 4.75 12 4.75z"
      />
    </Svg>
  );
}

function AnimatedGradientBackground({ isDark }: { isDark: boolean }) {
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const layerAOpacity = shift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });
  const layerBOpacity = shift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  const darkA = ["#0F0E1A", "#1A1450", "#0F0E1A"] as const;
  const darkB = ["#0F0E1A", "#221860", "#12102A"] as const;
  const lightA = ["#F8F7FF", "#E4E0FF", "#F8F7FF"] as const;
  const lightB = ["#FFFFFF", "#DDD6FE", "#F0EFF9"] as const;

  const colorsA = isDark ? darkA : lightA;
  const colorsB = isDark ? darkB : lightB;

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[...colorsA]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: layerAOpacity }]}>
        <LinearGradient colors={[...colorsA]} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: layerBOpacity }]}>
        <LinearGradient colors={[...colorsB]} style={StyleSheet.absoluteFill} start={{ x: 0.8, y: 0 }} end={{ x: 0.2, y: 1 }} />
      </Animated.View>
    </View>
  );
}

function FloatingParticles({ isDark }: { isDark: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
        id: index,
        left: Math.random() * SCREEN_WIDTH,
        top: Math.random() * SCREEN_HEIGHT,
        size: 2 + Math.random() * 3.5,
        opacity: 0.15 + Math.random() * 0.35,
        driftX: 8 + Math.random() * 16,
        driftY: 12 + Math.random() * 24,
        duration: 5000 + Math.random() * 5000,
        delay: Math.random() * 2000,
      })),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <Particle key={particle.id} particle={particle} isDark={isDark} />
      ))}
    </View>
  );
}

function Particle({
  particle,
  isDark,
}: {
  particle: {
    left: number;
    top: number;
    size: number;
    opacity: number;
    driftX: number;
    driftY: number;
    duration: number;
    delay: number;
  };
  isDark: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: particle.duration,
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [particle.delay, particle.duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -particle.driftY],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.driftX * (particle.left > SCREEN_WIDTH / 2 ? -1 : 1)],
  });
  const dotOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [particle.opacity, particle.opacity * 1.4, particle.opacity * 0.4],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: particle.left,
        top: particle.top,
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size,
        backgroundColor: isDark ? "#F0EFF9" : "#7C6FF7",
        opacity: dotOpacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    async function checkExistingToken() {
      const token = await getToken();
      if (!token) {
        setIsCheckingToken(false);
        return;
      }
      try {
        const profileResponse = await apiFetch<ProfileResponse>("/profile", {}, token);
        await saveUser(profileResponse.user);
        router.replace(
          isProfileComplete(profileResponse.user) ? "/(tabs)/home" : "/onboarding"
        );
      } catch {
        setIsCheckingToken(false);
      }
    }
    void checkExistingToken();
  }, [router]);

  useEffect(() => {
    if (isGoogleAuthConfigured()) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        ...(GOOGLE_CLIENT_ID_IOS ? { iosClientId: GOOGLE_CLIENT_ID_IOS } : {}),
      });
    }
  }, []);

  async function completeAuth(authResponse: AuthResponse) {
    await saveToken(authResponse.token);
    await saveUser({
      id: authResponse.user.id,
      email: authResponse.user.email,
      name: authResponse.user.name ?? "",
      surname: authResponse.user.surname ?? "",
    });
    const localProfile = await getUser();
    let resolvedUser: User;

    if (isLocalProfile(localProfile) && localProfile.occupation?.trim()) {
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
        resolvedUser = profileResponse.user;
      } catch {
        resolvedUser = {
          ...authResponse.user,
          ...localProfile,
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name ?? localProfile.name ?? "",
          surname: authResponse.user.surname ?? localProfile.surname ?? "",
        };
      }
    } else {
      try {
        const profileResponse = await apiFetch<ProfileResponse>("/profile", {}, authResponse.token);
        resolvedUser = profileResponse.user;
      } catch {
        resolvedUser = {
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name ?? "",
          surname: authResponse.user.surname ?? "",
        };
      }
    }

    await saveUser(resolvedUser);
    router.replace(isProfileComplete(resolvedUser) ? "/(tabs)/home" : "/onboarding");
  }

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut().catch(() => {
        // ignore - used only to force account picker
      });
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
      <View style={styles.root}>
        <AnimatedGradientBackground isDark={isDark} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const logoLight = isDark ? "#F0EFF9" : colors.text;
  const googleConfigured = isGoogleAuthConfigured();

  return (
    <View style={styles.root}>
      <AnimatedGradientBackground isDark={isDark} />
      <FloatingParticles isDark={isDark} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.centerSection}>
          <Text style={[styles.logo, { color: logoLight }]}>
            r
            <Text style={[styles.logo, { color: "#7C6FF7" }]}>GO</Text>
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.tagline}>
            {t("auth.subtitle")}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
            paddingBottom: 48,
            gap: 16,
          }}
        >
          <Text style={{ color: colors.textSecondary, textAlign: "center", fontSize: 14 }}>
            Devam etmek için giriş yap
          </Text>

          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={isLoading || !googleConfigured}
            style={{
              width: "100%",
              height: 54,
              backgroundColor: "#FFFFFF",
              borderRadius: 27,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              opacity: isLoading || !googleConfigured ? 0.55 : 1,
            }}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={GOOGLE_BUTTON_TEXT} />
            ) : (
              <>
                <GoogleGIcon size={20} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#1A1A2E" }}>
                  Google ile devam et
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={{ color: colors.textTertiary, textAlign: "center", fontSize: 11 }}>
            Gizlilik Politikası · Kullanım Koşulları
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F0E1A",
  },
  safeArea: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 16,
  },
});

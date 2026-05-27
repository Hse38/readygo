import { IconCalendar, IconHome, IconUser } from "@tabler/icons-react-native";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../lib/i18n";

function TabIcon({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: string;
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: spacing.xs }}>
      {children}
      {focused ? (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
            marginTop: 4,
          }}
        />
      ) : (
        <View style={{ height: 9 }} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : isDark ? "rgba(26,25,40,0.92)" : "rgba(255,255,255,0.92)",
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === "ios" ? 88 : 72,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 60 : 80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("profile.events"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <IconHome size={26} color={color} strokeWidth={focused ? 2.25 : 1.5} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("home.weekView"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <IconCalendar size={26} color={color} strokeWidth={focused ? 2.25 : 1.5} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile.user"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color}>
              <IconUser size={26} color={color} strokeWidth={focused ? 2.25 : 1.5} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

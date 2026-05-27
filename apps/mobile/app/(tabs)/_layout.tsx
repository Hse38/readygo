import { IconCalendar, IconHome, IconUser } from "@tabler/icons-react-native";
import { Tabs } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../lib/i18n";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("profile.events"),
          tabBarIcon: ({ color, focused }) => (
            <IconHome size={24} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("home.weekView"),
          tabBarIcon: ({ color, focused }) => (
            <IconCalendar size={24} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile.user"),
          tabBarIcon: ({ color, focused }) => (
            <IconUser size={24} color={color} strokeWidth={focused ? 2 : 1.5} />
          ),
        }}
      />
    </Tabs>
  );
}

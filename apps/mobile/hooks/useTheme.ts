import { useColorScheme } from "react-native";

import { Colors, Typography, Spacing, Radii, Shadows } from "../constants/theme";

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const shadows = isDark ? Shadows.dark : Shadows.light;

  return {
    colors,
    typography: Typography,
    spacing: Spacing,
    radii: Radii,
    shadows,
    isDark,
  };
}

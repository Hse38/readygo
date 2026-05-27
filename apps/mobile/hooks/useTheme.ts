import { Colors, Typography, Spacing, Radii, Shadows } from "../constants/theme";
import { useDarkMode } from "../context/ThemeContext";

export function useTheme() {
  const { isDark } = useDarkMode();
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

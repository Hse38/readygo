type ThemeColors = {
  surface: string;
  surfaceElevated: string;
  backgroundTertiary: string;
};

/** Light-mode pastel tile tint; in dark mode uses elevated surface instead. */
export function getTintedSurface(
  lightTint: string,
  isDark: boolean,
  colors: ThemeColors
): string {
  return isDark ? colors.surfaceElevated : lightTint;
}

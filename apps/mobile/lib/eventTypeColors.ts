/** Event accent colors: saturated in light mode, muted in dark mode. */
export function getEventAccentColor(dotColor: string, isDark: boolean): string {
  if (!isDark) return dotColor;
  const muted: Record<string, string> = {
    "#7C6FF7": "#9B94F8",
    "#10B981": "#34D399",
    "#F97316": "#FB923C",
    "#14B8A6": "#2DD4BF",
    "#6366F1": "#818CF8",
    "#9CA3AF": "#A0A0C0",
  };
  return muted[dotColor] ?? dotColor;
}

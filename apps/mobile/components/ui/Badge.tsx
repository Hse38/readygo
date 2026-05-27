import { View } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "neutral";
type BadgeSize = "sm" | "md";

type Props = {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
};

export function Badge({ label, variant = "neutral", size = "md" }: Props) {
  const { colors, radii, spacing } = useTheme();

  const palette: Record<BadgeVariant, { bg: string; text: string }> = {
    primary: { bg: colors.primary, text: colors.white },
    success: { bg: colors.success, text: colors.white },
    warning: { bg: colors.warning, text: colors.white },
    error: { bg: colors.error, text: colors.white },
    neutral: { bg: colors.backgroundTertiary, text: colors.text },
  };

  const sizeStyle = size === "sm"
    ? { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }
    : { paddingHorizontal: spacing.md, paddingVertical: spacing.sm };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: radii.full,
        backgroundColor: palette[variant].bg,
        ...sizeStyle,
      }}
    >
      <Text variant={size === "sm" ? "caption" : "label"} color={palette[variant].text}>
        {label}
      </Text>
    </View>
  );
}

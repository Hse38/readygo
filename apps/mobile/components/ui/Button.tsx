import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  variant = "primary",
  size = "md",
  onPress,
  disabled = false,
  loading = false,
  children,
  style,
}: Props) {
  const { colors, radii, spacing } = useTheme();
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { minHeight: 36, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    md: { minHeight: 44, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    lg: { minHeight: 52, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  };

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary, borderWidth: 0 },
    secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary },
    ghost: { backgroundColor: "transparent", borderWidth: 0 },
    danger: { backgroundColor: colors.error, borderWidth: 0 },
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.white,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          borderRadius: radii.full,
          alignItems: "center",
          justifyContent: "center",
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        sizeStyles[size],
        variantStyles[variant],
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Text variant="label" color={textColor[variant]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

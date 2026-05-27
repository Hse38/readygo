import type { ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { usePressScale } from "../../hooks/usePressScale";
import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gradient";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  variant = "primary",
  size = "md",
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  style,
}: Props) {
  const { colors, radii, spacing } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { minHeight: 36, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    md: { minHeight: 44, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    lg: { minHeight: 48, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.white,
    gradient: colors.white,
  };

  const content = loading ? (
    <ActivityIndicator color={textColor[variant]} />
  ) : (
    <Text variant="label" color={textColor[variant]}>
      {children}
    </Text>
  );

  const innerStyle: ViewStyle = {
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: sizeStyles[size].minHeight,
    paddingHorizontal: sizeStyles[size].paddingHorizontal,
    paddingVertical: sizeStyles[size].paddingVertical,
    width: fullWidth ? "100%" : undefined,
    opacity: isDisabled ? 0.5 : 1,
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale }], width: fullWidth ? "100%" : undefined },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ width: fullWidth ? "100%" : undefined }}
      >
        {variant === "gradient" ? (
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={innerStyle}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              innerStyle,
              variant === "primary" && { backgroundColor: colors.primary },
              variant === "secondary" && {
                backgroundColor: "transparent",
                borderWidth: 1.5,
                borderColor: colors.primary,
              },
              variant === "ghost" && { backgroundColor: "transparent" },
              variant === "danger" && { backgroundColor: colors.error },
            ]}
          >
            {content}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

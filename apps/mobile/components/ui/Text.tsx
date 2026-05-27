import type { ReactNode } from "react";
import { Text as RNText, type StyleProp, type TextStyle } from "react-native";

import { useTheme } from "../../hooks/useTheme";

type TextVariant =
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "caption"
  | "label";

type Props = {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
};

export function Text({ variant = "body", color, style, children }: Props) {
  const { colors, typography } = useTheme();

  const variantStyles: Record<TextVariant, TextStyle> = {
    h1: {
      fontFamily: typography.fonts.bold,
      fontSize: typography.sizes.xxxl,
      lineHeight: typography.sizes.xxxl * typography.lineHeights.tight,
    },
    h2: {
      fontFamily: typography.fonts.semiBold,
      fontSize: typography.sizes.xxl,
      lineHeight: typography.sizes.xxl * typography.lineHeights.tight,
    },
    h3: {
      fontFamily: typography.fonts.semiBold,
      fontSize: typography.sizes.xl,
      lineHeight: typography.sizes.xl * typography.lineHeights.normal,
    },
    body: {
      fontFamily: typography.fonts.regular,
      fontSize: typography.sizes.md,
      lineHeight: typography.sizes.md * typography.lineHeights.normal,
    },
    bodySmall: {
      fontFamily: typography.fonts.regular,
      fontSize: typography.sizes.sm,
      lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    },
    caption: {
      fontFamily: typography.fonts.regular,
      fontSize: typography.sizes.xs,
      lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    },
    label: {
      fontFamily: typography.fonts.medium,
      fontSize: typography.sizes.sm,
      lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    },
  };

  return (
    <RNText style={[{ color: color ?? colors.text }, variantStyles[variant], style]}>
      {children}
    </RNText>
  );
}

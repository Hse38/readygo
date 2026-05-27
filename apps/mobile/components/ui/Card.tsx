import type { ReactNode } from "react";
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { usePressScale } from "../../hooks/usePressScale";
import { useTheme } from "../../hooks/useTheme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function Card({ children, style, onPress }: Props) {
  const { colors, radii, shadows, isDark } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  const baseStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...(isDark ? shadows.sm : shadows.md),
  };

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={({ pressed }) => [
            baseStyle,
            pressed && {
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
}

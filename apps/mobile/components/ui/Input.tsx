import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

type Props = {
  label?: string;
  error?: string;
} & Pick<
  TextInputProps,
  "placeholder" | "value" | "onChangeText" | "secureTextEntry" | "multiline"
>;

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  multiline,
}: Props) {
  const { colors, radii, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? (
        <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          borderWidth: 1,
          borderColor: error ? colors.error : focused ? colors.primary : colors.border,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: multiline ? 100 : 48,
          textAlignVertical: multiline ? "top" : "center",
          fontFamily: typography.fonts.regular,
          fontSize: typography.sizes.md,
        }}
      />
      {error ? (
        <Text variant="caption" color={colors.error} style={{ marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

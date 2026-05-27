import { useState } from "react";
import {
  Platform,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

type Props = {
  label?: string;
  error?: string;
  inputStyle?: StyleProp<TextStyle>;
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
  inputStyle,
}: Props) {
  const { colors, radii, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

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
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        underlineColorAndroid="transparent"
        style={[
          {
            borderWidth: 1,
            borderRadius: radii.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            minHeight: multiline ? 100 : 48,
            textAlignVertical: multiline ? "top" : "center",
            fontFamily: typography.fonts.regular,
            fontSize: typography.sizes.md,
            width: "100%",
            ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
          },
          inputStyle,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor,
          },
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.error} style={{ marginTop: spacing.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

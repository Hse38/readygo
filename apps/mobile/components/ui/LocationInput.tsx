import { IconMapPin, IconX } from "@tabler/icons-react-native";
import { useEffect, useState } from "react";
import { Pressable, View, type StyleProp, type TextStyle } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

import { GOOGLE_PLACES_API_KEY } from "../../constants/config";
import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

export type SelectedLocation = {
  address: string;
  lat: number | null;
  lng: number | null;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  inputStyle?: StyleProp<TextStyle>;
  onAddressChange?: (address: string) => void;
  onLocationSelect: (location: SelectedLocation) => void;
};

export function LocationInput({
  label,
  placeholder,
  value,
  inputStyle,
  onAddressChange,
  onLocationSelect,
}: Props) {
  const { colors, radii, spacing, typography } = useTheme();
  const containerRadius =
    (inputStyle && typeof inputStyle === "object" && "borderRadius" in inputStyle
      ? inputStyle.borderRadius
      : undefined) ?? radii.md;
  const inputHeight =
    (inputStyle && typeof inputStyle === "object" && "minHeight" in inputStyle
      ? inputStyle.minHeight
      : undefined) ?? 48;
  const [queryText, setQueryText] = useState(value);

  useEffect(() => {
    setQueryText(value);
  }, [value]);

  function handleTextChange(text: string) {
    setQueryText(text);
    onAddressChange?.(text);
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text variant="label" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
        {label}
      </Text>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        fetchDetails
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: "tr",
          components: "country:tr",
        }}
        textInputProps={{
          value: queryText,
          onChangeText: handleTextChange,
          onBlur: () => onAddressChange?.(queryText.trim()),
          placeholderTextColor: colors.textTertiary,
          selectionColor: colors.primary,
          cursorColor: colors.primary,
          underlineColorAndroid: "transparent",
        }}
        onPress={(data, details) => {
          const address = data.description ?? "";
          const lat = details?.geometry?.location?.lat ?? null;
          const lng = details?.geometry?.location?.lng ?? null;
          setQueryText(address);
          onLocationSelect({ address, lat, lng });
        }}
        enablePoweredByContainer={false}
        styles={{
          container: { flex: 0 },
          textInputContainer: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: containerRadius,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.sm,
          },
          textInput: {
            height: typeof inputHeight === "number" ? inputHeight : 48,
            color: colors.text,
            fontSize: typography.sizes.md,
            fontFamily: typography.fonts.regular,
            backgroundColor: colors.surface,
            borderWidth: 0,
          },
          predefinedPlacesDescription: {
            color: colors.text,
          },
          listView: {
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: radii.md,
            marginTop: 6,
            backgroundColor: colors.surfaceElevated,
          },
          row: {
            backgroundColor: colors.surfaceElevated,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          },
          separator: {
            height: 1,
            backgroundColor: colors.borderLight,
          },
          description: {
            color: colors.text,
            fontFamily: typography.fonts.regular,
            fontSize: typography.sizes.sm,
          },
        }}
      />
      {value ? (
        <View
          style={{
            marginTop: spacing.xs,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <IconMapPin size={14} color={colors.primary} />
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              style={{ marginLeft: spacing.xs, flex: 1 }}
            >
              {value}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setQueryText("");
              onAddressChange?.("");
              onLocationSelect({ address: "", lat: null, lng: null });
            }}
            hitSlop={8}
          >
            <IconX size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

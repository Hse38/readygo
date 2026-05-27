import { IconMapPin, IconX } from "@tabler/icons-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

import { GOOGLE_PLACES_API_KEY } from "../../constants/config";
import { useTheme } from "../../hooks/useTheme";
import { Text } from "./Text";

export type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onLocationSelect: (location: SelectedLocation) => void;
};

export function LocationInput({
  label,
  placeholder,
  value,
  onLocationSelect,
}: Props) {
  const { colors, radii, spacing, typography } = useTheme();
  const [queryText, setQueryText] = useState(value);

  useEffect(() => {
    setQueryText(value);
  }, [value]);

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
          onChangeText: setQueryText,
          placeholderTextColor: colors.textTertiary,
        }}
        onPress={(data, details) => {
          const lat = details?.geometry?.location?.lat ?? 0;
          const lng = details?.geometry?.location?.lng ?? 0;
          const address = data.description ?? "";
          setQueryText(address);
          onLocationSelect({ address, lat, lng });
        }}
        enablePoweredByContainer={false}
        styles={{
          container: { flex: 0 },
          textInputContainer: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.sm,
          },
          textInput: {
            height: 48,
            color: colors.text,
            fontSize: typography.sizes.md,
            fontFamily: typography.fonts.regular,
            backgroundColor: colors.surface,
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
              onLocationSelect({ address: "", lat: 0, lng: 0 });
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

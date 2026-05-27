import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../hooks/useTheme";

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl }}>
        <Text variant="h2">Takvim</Text>
        <Card style={{ marginTop: spacing.lg }}>
          <Text variant="body" color={colors.textSecondary}>
            Gelişmiş aylık takvim görünümü yakında burada olacak.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

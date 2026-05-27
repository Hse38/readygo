import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";

import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../lib/i18n";

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl }}>
        <Text variant="h2">{t("calendar.title")}</Text>
        <Card style={{ marginTop: spacing.lg }}>
          <Text variant="body" color={colors.textSecondary}>
            {t("calendar.comingSoon")}
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

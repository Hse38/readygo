import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../hooks/useTheme";
import { apiFetch } from "../../lib/api";
import { getToken } from "../../lib/storage";

type InvitePreviewResponse = {
  event: {
    id: string;
    title: string;
    type: string;
    date: string;
    location?: string | null;
  };
  participant: {
    id: string;
    name?: string | null;
    email: string;
    status: "pending" | "accepted" | "declined";
  };
};

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [invite, setInvite] = useState<InvitePreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) return;
      try {
        setIsLoading(true);
        const response = await apiFetch<InvitePreviewResponse>(`/invite/${token}`);
        setInvite(response);
      } catch (error) {
        Alert.alert("Hata", error instanceof Error ? error.message : "Davet bulunamadi.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadInvite();
  }, [token]);

  async function handleAccept() {
    if (!invite) return;
    const authToken = await getToken();
    if (!authToken) {
      router.replace("/auth");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(
        `/participants/${invite.participant.id}/status`,
        { method: "PUT", body: JSON.stringify({ status: "accepted" }) },
        authToken
      );
      Alert.alert("Basarili", "Etkinlige katildiniz.");
      router.replace(`/event/${invite.event.id}`);
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Katilim guncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!invite) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }}>
          <Text>Davet bulunamadi.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.xl }}>
      <Text variant="h2" style={{ marginBottom: spacing.lg }}>
        Etkinlik Daveti
      </Text>
      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" color={colors.textSecondary}>
          Etkinlik
        </Text>
        <Text variant="h3" style={{ marginTop: spacing.xs }}>
          {invite.event.title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {new Date(invite.event.date).toLocaleString("tr-TR")}
        </Text>
        {invite.event.location ? <Text variant="bodySmall">{invite.event.location}</Text> : null}
      </Card>

      <Card style={{ marginBottom: spacing.xl }}>
        <Text variant="label" color={colors.textSecondary}>
          Katilimci
        </Text>
        <Text variant="body" style={{ marginTop: spacing.xs }}>
          {invite.participant.name || "-"}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary}>
          {invite.participant.email}
        </Text>
      </Card>

      <Button onPress={handleAccept} loading={isSubmitting}>
        Etkinlige Katil
      </Button>
    </SafeAreaView>
  );
}

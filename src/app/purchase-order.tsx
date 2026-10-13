import { Redirect, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Appbar, Surface, Text, useTheme } from "react-native-paper";

import { ResponsiveContainer } from "../components/responsive-container";
import { useAuth } from "../context/auth";

export default function PurchaseOrderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isReady } = useAuth();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  if (!isReady) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={handleBack} />
        <Appbar.Content title="Purchase Orders" titleStyle={{ color: theme.colors.onPrimary }} />
      </Appbar.Header>

      <View style={styles.content}>
        <ResponsiveContainer>
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              Purchase order workflow
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              This screen is ready for the purchase-order flow and is now routed correctly.
            </Text>
          </Surface>
        </ResponsiveContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { elevation: 0 },
  content: { flex: 1, padding: 16, paddingBottom: 88 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  subtitle: {
    marginTop: 10,
    lineHeight: 22,
  },
});

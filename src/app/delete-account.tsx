import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Text, useTheme } from "react-native-paper";

import { useStore } from "../context/store";
import { translate } from "../lib/i18n";

const deletionEmail = "inventorymonitorapp@gmail.com";
const emailSubject = "StockTrack account deletion request";
const emailBody = "Please delete my StockTrack account and associated personal data. I am sending this request from the email address associated with my account.";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useStore();
  const language = state.user.preferences?.language ?? "English";

  const openDeletionEmail = () => {
    const mailto = `mailto:${deletionEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    void Linking.openURL(mailto).catch(() => undefined);
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Head>
        <title>{`StockTrack | ${translate(language, "accountDeletionTitle")}`}</title>
        <meta name="description" content="Request deletion of a StockTrack account and associated personal data." />
      </Head>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={translate(language, "backToLogin")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
        />
        <Text variant="titleMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          {translate(language, "accountDeletionTitle")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {translate(language, "accountDeletionTitle")}
          </Text>
          <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            {translate(language, "accountDeletionIntro")}
          </Text>
          <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            {translate(language, "accountDeletionInApp")}
          </Text>
          <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            {translate(language, "accountDeletionEmail")}
          </Text>
          <Button mode="contained" icon="email-outline" onPress={openDeletionEmail} style={styles.emailButton}>
            {translate(language, "accountDeletionEmailButton")}
          </Button>
          <Text style={[styles.paragraph, styles.notice, { color: theme.colors.onSurfaceVariant }]}>
            {translate(language, "accountDeletionNoPassword")}
          </Text>
          <Text style={[styles.paragraph, styles.notice, { color: theme.colors.onSurfaceVariant }]}>
            {translate(language, "accountDeletionRetention")}
          </Text>
          <Text accessibilityRole="link" style={[styles.email, { color: theme.colors.primary }]} onPress={openDeletionEmail}>
            {deletionEmail}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  headerTitle: { flex: 1, textAlign: "center", fontWeight: "700" },
  headerSpacer: { width: 48 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 24 },
  content: { width: "100%", maxWidth: 820, alignSelf: "center" },
  title: { fontWeight: "800", marginBottom: 12 },
  paragraph: { fontSize: 15, lineHeight: 23, marginBottom: 14 },
  emailButton: { alignSelf: "flex-start", marginBottom: 18 },
  notice: { fontSize: 14 },
  email: { fontSize: 15, textDecorationLine: "underline", marginBottom: 24 },
});
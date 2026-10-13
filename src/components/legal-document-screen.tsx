import { useRouter } from "expo-router";
import Head from "expo-router/head";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

import { useStore } from "../context/store";
import { translate } from "../lib/i18n";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type Props = {
  titleKey: string;
  effectiveDate: string;
  sections: LegalSection[];
};

const PRIVACY_EMAIL = "inventorymonitorapp@gmail.com";

export function LegalDocumentScreen({ titleKey, effectiveDate, sections }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useStore();
  const language = state.user.preferences?.language ?? "English";
  const title = translate(language, titleKey);

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Head>
        <title>{`StockTrack | ${title}`}</title>
        <meta name="robots" content="index,follow" />
      </Head>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={translate(language, "backToLogin")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
        />
        <Text variant="titleMedium" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text style={[styles.effectiveDate, { color: theme.colors.onSurfaceVariant }]}>Effective date: {effectiveDate}</Text>
          <View style={[styles.draftNotice, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <Text style={{ color: theme.colors.onSurface }}>{translate(language, "legalDraftNotice")}</Text>
          </View>
          {language === "Filipino" ? (
            <Text style={[styles.languageNotice, { color: theme.colors.onSurfaceVariant }]}>
              {translate(language, "legalEnglishOnlyNotice")}
            </Text>
          ) : null}
          {sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>{section.heading}</Text>
              {section.paragraphs.map((paragraph, index) => (
                <Text key={`${section.heading}-${index}`} style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>{paragraph}</Text>
              ))}
            </View>
          ))}
          <Text style={[styles.contact, { color: theme.colors.onSurfaceVariant }]}>
            Questions? Contact{" "}
            <Text
              accessibilityRole="link"
              style={{ color: theme.colors.primary, textDecorationLine: "underline" }}
              onPress={() => { void Linking.openURL(`mailto:${PRIVACY_EMAIL}`).catch(() => undefined); }}
            >
              {PRIVACY_EMAIL}
            </Text>
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
  title: { fontWeight: "800", marginBottom: 6 },
  effectiveDate: { fontSize: 13, marginBottom: 16 },
  draftNotice: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  languageNotice: { fontSize: 13, marginBottom: 16 },
  section: { marginBottom: 22 },
  sectionHeading: { fontWeight: "700", marginBottom: 8 },
  paragraph: { fontSize: 15, lineHeight: 23, marginBottom: 9 },
  contact: { fontSize: 14, lineHeight: 22, marginTop: 2, marginBottom: 28 },
});

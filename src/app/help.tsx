import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Divider, IconButton, Searchbar, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";

import { ResponsiveContainer } from "../components/responsive-container";
import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { HELP_CATEGORIES, HELP_TOPICS, type HelpTopic } from "../data/help-topics";
import { translate } from "../lib/i18n";

export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isReady } = useAuth();
  const { state } = useStore();
  const language = state.user.preferences?.language ?? "English";
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>("getting-started-overview");
  const [replaying, setReplaying] = useState(false);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return HELP_TOPICS;
    return HELP_TOPICS.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        topic.summary.toLowerCase().includes(q) ||
        topic.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const groupedTopics = useMemo(() => {
    const map = new Map<string, HelpTopic[]>();
    HELP_CATEGORIES.forEach((cat) => map.set(cat, []));
    filteredTopics.forEach((topic) => {
      const list = map.get(topic.category) ?? [];
      list.push(topic);
      map.set(topic.category, list);
    });
    return map;
  }, [filteredTopics]);

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

  const toggleTopic = (id: string) => {
    setExpandedTopicId((current) => (current === id ? null : id));
  };

  const handleReplayWalkthrough = async () => {
    try {
      setReplaying(true);
      await AsyncStorage.removeItem("hasSeenOnboarding");
      router.replace("/(tabs)");
    } catch {
      // Ignore storage error
    } finally {
      setReplaying(false);
    }
  };

  const categoryIcons: Record<string, string> = {
    "Getting Started": "rocket-launch-outline",
    "Selling & Credit": "cash-register",
    Inventory: "package-variant-closed",
    Reports: "chart-box-outline",
    "Account & Settings": "cog-outline",
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      {/* App Bar Header */}
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={handleBack} />
        <Appbar.Content
          title={translate(language, "helpAndTutorials")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton
          icon="close"
          iconColor={theme.colors.onPrimary}
          onPress={handleBack}
          accessibilityLabel="Close help"
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer>
          {/* Search bar */}
          <Searchbar
            placeholder={translate(language, "searchGuidesPlaceholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
            inputStyle={styles.searchInput}
          />

          {/* Quick Action: Replay Interactive Tutorial */}
          <Surface style={[styles.tourBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={styles.tourBannerLeft}>
              <View style={[styles.tourIconBubble, { backgroundColor: `${theme.colors.primary}18` }]}>
                <MaterialCommunityIcons name="compass-outline" size={26} color={theme.colors.primary} />
              </View>
              <View style={styles.tourBannerText}>
                <Text style={[styles.tourTitle, { color: theme.colors.onSurface }]}>{translate(language, "interactiveAppTour")}</Text>
                <Text style={[styles.tourSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {translate(language, "revisitGuide")}
                </Text>
              </View>
            </View>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              loading={replaying}
              disabled={replaying}
              onPress={handleReplayWalkthrough}
              style={styles.tourButton}
              labelStyle={styles.tourButtonLabel}
            >
              {translate(language, "replayTour")}
            </Button>
          </Surface>

          {/* Topics by Group */}
          {HELP_CATEGORIES.map((category) => {
            const topics = groupedTopics.get(category) ?? [];
            if (topics.length === 0) return null;

            return (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeaderRow}>
                  <MaterialCommunityIcons
                    name={(categoryIcons[category] || "book-open-outline") as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.categoryHeaderTitle, { color: theme.colors.onSurface }]}>
                    {category}
                  </Text>
                  <Text style={[styles.categoryCount, { color: theme.colors.onSurfaceVariant }]}>
                    ({topics.length})
                  </Text>
                </View>

                <Surface style={[styles.groupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  {topics.map((topic, index) => {
                    const isExpanded = expandedTopicId === topic.id;
                    const isLast = index === topics.length - 1;

                    return (
                      <View key={topic.id}>
                        <TouchableRipple
                          onPress={() => toggleTopic(topic.id)}
                          style={styles.topicRow}
                          borderless
                          accessibilityRole="button"
                          accessibilityLabel={topic.title}
                        >
                          <View style={styles.topicRowContent}>
                            <View style={styles.topicTextWrap}>
                              <Text style={[styles.topicTitle, { color: theme.colors.onSurface }]}>
                                {topic.title}
                              </Text>
                              <Text style={[styles.topicSummary, { color: theme.colors.onSurfaceVariant }]}>
                                {topic.summary}
                              </Text>
                            </View>
                            <IconButton
                              icon={isExpanded ? "chevron-up" : "chevron-down"}
                              size={22}
                              iconColor={theme.colors.onSurfaceVariant}
                              style={styles.chevron}
                            />
                          </View>
                        </TouchableRipple>

                        {/* Expanded Step-by-Step Instructions */}
                        {isExpanded ? (
                          <View style={[styles.stepsContainer, { backgroundColor: theme.dark ? `${theme.colors.primary}12` : "#F8FAFC" }]}>
                            {topic.steps.map((step) => (
                              <View key={step.stepNumber} style={styles.stepItem}>
                                <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
                                  <Text style={[styles.stepBadgeNumber, { color: theme.colors.onPrimary }]}>
                                    {step.stepNumber}
                                  </Text>
                                </View>
                                <Text style={[styles.stepInstruction, { color: theme.colors.onSurface }]}>
                                  {step.instruction}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        {!isLast ? <Divider style={{ backgroundColor: theme.colors.outline }} /> : null}
                      </View>
                    );
                  })}
                </Surface>
              </View>
            );
          })}

          {filteredTopics.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="magnify-remove-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>No matching guides found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Try searching for simple words like &quot;sale&quot;, &quot;barcode&quot;, or &quot;stock&quot;.
              </Text>
              <Button mode="outlined" onPress={() => setSearchQuery("")} style={{ marginTop: 12 }}>
                Clear Search
              </Button>
            </View>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {},
  headerTitle: { fontWeight: "800" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 64 },

  searchBar: {
    marginBottom: 16,
    borderRadius: 14,
    elevation: 0,
    borderWidth: 1,
    borderColor: "rgba(203,213,225,0.6)",
  },
  searchInput: { fontSize: 14, minHeight: 0 },

  tourBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 0,
  },
  tourBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0, marginRight: 8 },
  tourIconBubble: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tourBannerText: { flex: 1, minWidth: 0 },
  tourTitle: { fontSize: 15, fontWeight: "700" },
  tourSubtitle: { fontSize: 12, marginTop: 2 },
  tourButton: { borderRadius: 10, minWidth: 78, minHeight: 44, justifyContent: "center" },
  tourButtonLabel: { fontSize: 13, fontWeight: "700" },

  categorySection: { marginBottom: 20 },
  categoryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  categoryHeaderTitle: { fontSize: 16, fontWeight: "800" },
  categoryCount: { fontSize: 13, fontWeight: "600" },

  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 0,
  },
  topicRow: { minHeight: 56, paddingVertical: 12, paddingHorizontal: 16, justifyContent: "center" },
  topicRowContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  topicTextWrap: { flex: 1, minWidth: 0 },
  topicTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  topicSummary: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  chevron: { margin: 0, padding: 0 },

  stepsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(203,213,225,0.4)",
  },
  stepItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  stepBadgeNumber: { fontSize: 12, fontWeight: "800" },
  stepInstruction: { fontSize: 14, lineHeight: 20, flex: 1 },

  emptyWrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: "center", marginTop: 4, maxWidth: 300 },
});


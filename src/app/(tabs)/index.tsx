import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { Avatar, Button, Card, Chip, IconButton, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import Svg, { Circle } from "react-native-svg";

import { ScreenContainer } from "../../components/screen-container";
import { TrendLegend, TrendLineChart } from "../../components/trend-line-chart";
import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { formatRelativeTime, getLowStockProducts, getSafetyStockStatus } from "../../data/freshmart";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { translate } from "../../lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const { summary, recentActivity, categoryBreakdown, weeklyActivity, state, sales, debts, debtPayments, customers } = useStore();
  const language = state.user.preferences.language;
  const { width } = useWindowDimensions();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";

  const lowStockProducts = useMemo(() => getLowStockProducts(state.products), [state.products]);
  const expiringProducts = useMemo(() => state.products.filter((product) => product.expiryDate).slice(0, 4), [state.products]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return translate(language, "homeGreetingMorning");
    if (hour < 18) return translate(language, "homeGreetingAfternoon");
    return translate(language, "homeGreetingEvening");
  }, [language]);

  const lastUpdated = useMemo(() => {
    const latestUpdate = state.products.reduce((latest, product) => product.updatedAt > latest ? product.updatedAt : latest, state.products[0]?.updatedAt ?? new Date().toISOString());
    return new Date(latestUpdate).toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }, [state.products]);

  const attentionCount = summary.lowStock + summary.outOfStock;

  const categoryChartColors = useMemo(() => [
    theme.colors.primary,
    theme.colors.tertiary,
    theme.colors.secondary,
    theme.colors.error,
    theme.colors.outline,
  ], [theme.colors]);

  const categoryChartData = useMemo(() => {
    const sorted = [...categoryBreakdown].sort((a, b) => b.value - a.value);
    const top4 = sorted.slice(0, 4);
    const othersValue = sorted.slice(4).reduce((sum, item) => sum + item.value, 0);
    const result = top4.map((item, idx) => ({
      name: item.name,
      population: item.value,
      color: categoryChartColors[idx % categoryChartColors.length],
    }));
    if (othersValue > 0 || sorted.length === 0) {
      result.push({ name: "Others", population: othersValue, color: categoryChartColors[4] });
    }
    return result;
  }, [categoryBreakdown, categoryChartColors]);

  const combinedRecentEvents = useMemo(() => {
    type ActivityEvent = {
      id: string;
      title: string;
      subtitle: string;
      timestamp: string;
      icon: "arrow-top-right" | "arrow-bottom-right" | "cart-outline" | "alert-circle-outline" | "book-account" | "cash-check";
      color: string;
      badgeText: string;
    };

    const movementEvents: ActivityEvent[] = recentActivity.slice(0, 5).map((m) => ({
      id: `mov-${m.id}`,
      title: m.productName,
      subtitle: `${m.reason ? m.reason.toUpperCase() : (m.type === "in" ? "Stock In" : "Stock Out")} · ${formatRelativeTime(m.timestamp)}`,
      timestamp: m.timestamp,
      icon: m.type === "in" ? "arrow-top-right" : "arrow-bottom-right",
      color: m.type === "in" ? theme.colors.primary : theme.colors.tertiary,
      badgeText: `${m.type === "in" ? "+" : "-"}${m.quantity}`,
    }));

    const saleEvents: ActivityEvent[] = (sales || []).slice(0, 3).map((s) => ({
      id: `sale-${s.id}`,
      title: `Sale #${s.receiptNumber}`,
      subtitle: `${s.paymentMethod.toUpperCase().replace("_", " ")} · ${s.totalItems} items · ${formatRelativeTime(s.timestamp)}`,
      timestamp: s.timestamp,
      icon: "cart-outline",
      color: theme.colors.secondary,
      badgeText: `₱${s.totalAmount.toFixed(0)}`,
    }));

    const creditEvents: ActivityEvent[] = debts.filter((debt) => !debt.saleId).map((debt) => ({
      id: `credit-${debt.id}`,
      title: `${translate(language, "ledgerCreditLabel")} · ${debt.customerName}`,
      subtitle: `${debt.itemsSummary || translate(language, "utangTitle")} · ${formatRelativeTime(debt.createdAt)}`,
      timestamp: debt.createdAt,
      icon: "book-account",
      color: theme.colors.error,
      badgeText: `+₱${debt.amount.toFixed(0)}`,
    }));

    const paymentEvents: ActivityEvent[] = debtPayments.map((payment) => {
      const debt = debts.find((item) => item.id === payment.debtId);
      const customer = customers.find((item) => item.id === payment.customerId);
      return {
        id: `debt-payment-${payment.id}`,
        title: `${translate(language, "ledgerPaymentLabel")} · ${debt?.customerName ?? customer?.name ?? translate(language, "unknownCustomer")}`,
        subtitle: `${payment.paymentMethod.toUpperCase()} · ${formatRelativeTime(payment.createdAt)}`,
        timestamp: payment.createdAt,
        icon: "cash-check",
        color: theme.colors.primary,
        badgeText: `-₱${payment.amount.toFixed(0)}`,
      };
    });

    return [...movementEvents, ...saleEvents, ...creditEvents, ...paymentEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [recentActivity, sales, debts, debtPayments, customers, theme.colors, language]);

  return (
    <View style={styles.page}>
      <ScreenContainer style={styles.page} contentContainerStyle={styles.content}>
        {/* Hero banner with store name & help entry point */}
        <Surface style={[styles.hero, { backgroundColor: theme.colors.primary, borderColor: theme.colors.outline }]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: theme.colors.onPrimary }]}>{greeting}</Text>
              <Text numberOfLines={1} style={[styles.storeName, { color: theme.colors.onPrimary }]}>
                {state.user.storeName || translate(language, "storeNameNotSet")}
              </Text>
              {/* Phase 2: Contextual attention line */}
              <Text style={[styles.attentionLine, { color: attentionCount > 0 ? "#FDE68A" : "#BBF7D0" }]}>
                {attentionCount > 0
                  ? `⚠ ${attentionCount} item${attentionCount > 1 ? "s" : ""} need${attentionCount === 1 ? "s" : ""} your attention today`
                  : "✓ All inventory is healthy today"}
              </Text>
              <Text style={[styles.lastUpdated, { color: `${theme.colors.onPrimary}cc` }]}>
                ◷ {translate(language, "lastUpdated")}: {lastUpdated}
              </Text>
            </View>
            <View style={styles.heroActions}>
              <IconButton
                icon="help-circle-outline"
                iconColor={theme.colors.onPrimary}
                containerColor="rgba(255,255,255,0.16)"
                size={22}
                onPress={() => router.push("/help" as Href)}
                accessibilityLabel="Open help and tutorials"
              />
              <Avatar.Text
                size={48}
                label={session?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "FM"}
                style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}
              />
            </View>
          </View>
        </Surface>

        {/* Banners */}
        {lowStockProducts.length > 0 ? (
          <TouchableRipple
            borderless
            onPress={() => router.push({ pathname: "/alerts", params: { filter: "Low Stock" } } as Href)}
            style={[styles.restockBanner, { backgroundColor: theme.dark ? `${theme.colors.tertiary}18` : "#fffbeb", borderColor: theme.dark ? theme.colors.tertiary : "#f8cc52" }]}
          >
            <View style={styles.restockContent}>
              <IconButton icon="alert-outline" iconColor={theme.dark ? theme.colors.tertiary : "#d97706"} containerColor={theme.dark ? `${theme.colors.tertiary}26` : "#fff1c2"} size={24} />
              <View style={styles.restockText}>
                <Text style={[styles.restockTitle, { color: theme.dark ? theme.colors.onSurface : "#92400e" }]}>{lowStockProducts.length} {translate(language, "restockBannerTitle")}</Text>
                <Text style={[styles.restockSubtitle, { color: theme.dark ? theme.colors.onSurfaceVariant : "#b45309" }]}>{translate(language, "restockBannerSubtitle")}</Text>
              </View>
              <IconButton icon="chevron-right" iconColor={theme.dark ? theme.colors.tertiary : "#d97706"} size={24} />
            </View>
          </TouchableRipple>
        ) : null}

        {expiringProducts.length > 0 ? (
          <TouchableRipple
            borderless
            onPress={() => router.push({ pathname: "/alerts", params: { filter: "Expiry" } } as Href)}
            style={[styles.expiryBanner, { backgroundColor: theme.dark ? `${theme.colors.tertiary}18` : "#fff7ed", borderColor: theme.dark ? theme.colors.tertiary : "#fdba74" }]}
          >
            <View style={styles.restockContent}>
              <IconButton icon="calendar-alert-outline" iconColor={theme.dark ? theme.colors.tertiary : "#c2410c"} containerColor={theme.dark ? `${theme.colors.tertiary}26` : "#ffedd5"} size={24} />
              <View style={styles.restockText}>
                <Text style={[styles.restockTitle, { color: theme.dark ? theme.colors.onSurface : "#9a3412" }]}>{expiringProducts.length} {translate(language, "expiryBannerTitle")}</Text>
                <Text style={[styles.restockSubtitle, { color: theme.dark ? theme.colors.onSurfaceVariant : "#c2410c" }]}>{translate(language, "expiryBannerSubtitle")}</Text>
              </View>
              <IconButton icon="chevron-right" iconColor={theme.dark ? theme.colors.tertiary : "#c2410c"} size={24} />
            </View>
          </TouchableRipple>
        ) : null}

        {/* Phase 2: Single inline row of typography */}
        <Surface style={[styles.flatStatRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.statCell}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{summary.totalProducts}</Text>
            <Text style={[styles.statCaption, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "statProducts")}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statNumber, { color: theme.colors.secondary }]}>{summary.inStock}</Text>
            <Text style={[styles.statCaption, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "statInStock")}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statNumber, { color: theme.colors.tertiary }]}>{summary.lowStock}</Text>
            <Text style={[styles.statCaption, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "statLowStock")}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>{summary.outOfStock}</Text>
            <Text style={[styles.statCaption, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "statOutOfStock")}</Text>
          </View>
        </Surface>

        {/* Phase 3: 2-column layout on desktop, stacked on mobile/tablet */}
        <View style={isDesktop ? styles.desktopRow : undefined}>
          {/* Column 1: Recent Activity + Safety Stock Overview */}
          <View style={isDesktop ? styles.desktopCol : undefined}>
            {/* Phase 2: Recent Activity placed directly below stats */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    {translate(language, "recentActivityTitle")}
                  </Text>
                  {session?.role !== "Staff" ? (
                    <Button compact onPress={() => router.push("/reports")}>
                      {translate(language, "viewReports")}
                    </Button>
                  ) : null}
                </View>
                <FlatList
                  data={combinedRecentEvents}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={[styles.activityRow, { borderBottomColor: theme.colors.outline }]}>
                      <View style={[styles.activityIcon, { backgroundColor: `${item.color}18` }]}>
                        <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.activityMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Text style={[styles.activityQty, { color: item.color }]}>
                        {item.badgeText}
                      </Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={[styles.emptyListText, { color: theme.colors.onSurfaceVariant }]}>
                      No recent activity recorded yet.
                    </Text>
                  }
                />
              </Card.Content>
            </Card>

            {/* Safety Stock Overview */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    {translate(language, "safetyStockOverview")}
                  </Text>
                  <Button compact onPress={() => router.push({ pathname: "/alerts", params: { filter: "Low Stock" } } as Href)}>
                    View All
                  </Button>
                </View>
                {lowStockProducts.length === 0 ? (
                  <Text style={[styles.emptyListText, { color: theme.colors.secondary }]}>
                    ✓ All products are above safety stock threshold.
                  </Text>
                ) : (
                  lowStockProducts.slice(0, 4).map((product) => {
                    const status = getSafetyStockStatus(product);
                    return (
                      <View key={product.id} style={[styles.healthRow, { borderBottomColor: theme.colors.outline }]}>
                        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                          <Text style={[styles.healthTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                            {product.name}
                          </Text>
                          <Text style={[styles.healthMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                            {product.currentStock} / {product.lowStockThreshold} {product.unitType}
                          </Text>
                        </View>
                        <Chip
                          compact
                          style={[
                            styles.statusChip,
                            { backgroundColor: status.tone === "critical" ? `${theme.colors.error}22` : `${theme.colors.tertiary}22` },
                          ]}
                          textStyle={{
                            color: status.tone === "critical" ? theme.colors.error : theme.colors.tertiary,
                            fontWeight: "700",
                          }}
                        >
                          {status.label}
                        </Chip>
                      </View>
                    );
                  })
                )}
              </Card.Content>
            </Card>
          </View>

          {/* Column 2: Analytical charts */}
          <View style={isDesktop ? styles.desktopCol : undefined}>
            {/* Weekly Activity Line Chart */}
            <TouchableRipple borderless onPress={() => router.push({ pathname: "/reports", params: { tab: "Weekly" } } as Href)}>
              <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Card.Content style={styles.chartContent}>
                  <View style={styles.weeklyHeader}>
                    <Text style={[styles.weeklyTitle, { color: theme.colors.onSurface }]}>
                      {translate(language, "weeklyActivity")}
                    </Text>
                    <Text style={[styles.weeklyDate, { color: theme.colors.onSurfaceVariant }]}>
                      {weeklyActivity.selectedRange}
                    </Text>
                  </View>
                  <TrendLineChart
                    labels={weeklyActivity.labels}
                    first={weeklyActivity.stockIn}
                    second={weeklyActivity.stockOut}
                    firstColor={theme.colors.primary}
                    secondColor={theme.colors.tertiary}
                  />
                  <View style={styles.weeklyLegend}>
                    <TrendLegend
                      firstColor={theme.colors.primary}
                      secondColor={theme.colors.tertiary}
                      firstLabel={translate(language, "stockInLabel")}
                      secondLabel={translate(language, "stockOutLabel")}
                    />
                  </View>
                </Card.Content>
              </Card>
            </TouchableRipple>

            {/* Stock by Category Donut Chart */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content style={styles.categoryContent}>
                <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                  {translate(language, "stockByCategory")}
                </Text>
                <View style={[styles.categoryChartLayout, width < 700 && styles.categoryChartLayoutFabSafe]}>
                  <View style={styles.pieWrap}>
                    <CategoryDonut data={categoryChartData} />
                  </View>
                  <View style={styles.categoryLegend}>
                    {categoryChartData.map((category) => (
                      <View key={category.name} style={styles.categoryLegendRow}>
                        <View style={styles.categoryLegendLabel}>
                          <View style={[styles.categoryLegendDot, { backgroundColor: category.color }]} />
                          <Text style={[styles.categoryName, { color: theme.colors.onSurface }]}>
                            {category.name}
                          </Text>
                        </View>
                        <Text style={[styles.categoryValue, { color: theme.colors.onSurfaceVariant }]}>
                          {category.population}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>
      </ScreenContainer>

    </View>
  );
}

function CategoryDonut({ data }: { data: { population: number; color: string }[] }) {
  const size = 110;
  const center = size / 2;
  const radius = 39;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.population, 0);

  const segments = data.reduce<{ item: { population: number; color: string }; offset: number }[]>(
    (acc, item) => {
      const prevOffset =
        acc.length > 0
          ? acc[acc.length - 1].offset + (total ? (acc[acc.length - 1].item.population / total) * circumference : 0)
          : 0;
      return [...acc, { item, offset: prevOffset }];
    },
    []
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map(({ item, offset }) => {
        const segment = total ? (item.population / total) * circumference : 0;
        const visibleSegment = Math.max(segment - 3, 0);
        return (
          <Circle
            key={item.color}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={item.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${visibleSegment} ${circumference - visibleSegment}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 88 },
  hero: { borderRadius: 0, padding: 16, paddingTop: 24, marginTop: -16, marginHorizontal: -16, marginBottom: 14, borderWidth: 1, elevation: 2 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  greeting: { fontSize: 14, marginBottom: 4 },
  storeName: { fontSize: 24, lineHeight: 28, fontWeight: "800", marginBottom: 3 },
  attentionLine: { fontSize: 13, fontWeight: "700", marginTop: 2, marginBottom: 4 },
  lastUpdated: { fontSize: 11, marginTop: 2 },
  avatar: {},
  restockBanner: { borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  expiryBanner: { borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  restockContent: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8 },
  restockText: { flex: 1 },
  restockTitle: { fontSize: 15, fontWeight: "800" },
  restockSubtitle: { fontSize: 13, marginTop: 2 },

  flatStatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 0,
  },
  statCell: { flex: 1, alignItems: "center", minWidth: 0 },
  statNumber: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  statCaption: { fontSize: 11, fontWeight: "600", marginTop: 2, textAlign: "center" },
  statDivider: { width: 1, height: 28 },

  desktopRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  desktopCol: { flex: 1, minWidth: 0 },

  card: { borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 0 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },

  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, minWidth: 0 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontWeight: "700", fontSize: 14, flexShrink: 1 },
  activityMeta: { fontSize: 12, marginTop: 2 },
  activityQty: { fontWeight: "800", fontSize: 14, flexShrink: 0 },
  emptyListText: { fontSize: 13, paddingVertical: 12, textAlign: "center" },

  healthRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, minWidth: 0 },
  healthTitle: { fontWeight: "600", fontSize: 14, flexShrink: 1 },
  healthMeta: { fontSize: 12, marginTop: 2 },
  statusChip: { borderRadius: 8, flexShrink: 0 },

  chartContent: { paddingTop: 12, paddingBottom: 16 },
  weeklyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  weeklyTitle: { fontSize: 16, fontWeight: "700" },
  weeklyDate: { fontSize: 11 },
  weeklyLegend: { alignItems: "center", marginTop: 4 },

  categoryContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20 },
  categoryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  categoryChartLayout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  categoryChartLayoutFabSafe: { paddingRight: 80 },
  pieWrap: { width: 110, height: 110, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  categoryLegend: { flex: 1, minWidth: 0, justifyContent: "center", gap: 6 },
  categoryLegendRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, minWidth: 0 },
  categoryLegendLabel: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 0, marginRight: 6 },
  categoryLegendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  categoryName: { fontSize: 12, fontWeight: "600", flexShrink: 1, minWidth: 0 },
  categoryValue: { fontSize: 12, fontWeight: "700", flexShrink: 0, marginLeft: 4 },

  fabGroup: { position: "absolute", left: "50%", right: "auto", bottom: 86, zIndex: 20, elevation: 20, transform: [{ translateX: -32 }] },
  webFabGroup: { position: "absolute", left: "50%", right: "auto", bottom: 86, zIndex: 20, elevation: 20, alignItems: "center", gap: 10, transform: [{ translateX: -125 }] },
  webActionFab: { marginBottom: 0 },
  webMainFab: { marginTop: 2 },
});

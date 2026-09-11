import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Chip, IconButton, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import Svg, { Circle } from "react-native-svg";

import { ScreenContainer } from "../../components/screen-container";
import { TrendLegend, TrendLineChart } from "../../components/trend-line-chart";
import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { formatRelativeTime, getLowStockProducts, getSafetyStockStatus } from "../../data/freshmart";
import { translate } from "../../lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const { summary, recentActivity, categoryBreakdown, weeklyActivity, state } = useStore();
  const language = state.user.preferences.language;

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

  const quickActions = [
    { label: translate(language, "stockInLabel"), icon: "arrow-up-right", route: { pathname: "/stock-movement", params: { type: "in" } }, accent: theme.colors.primary },
    { label: translate(language, "stockOutLabel"), icon: "arrow-down-right", route: { pathname: "/stock-movement", params: { type: "out" } }, accent: theme.colors.secondary },
    { label: translate(language, "productAddButton"), icon: "plus", route: "/add-product", accent: theme.colors.tertiary },
    { label: translate(language, "utangTitle"), icon: "book-open-variant", route: "/utang", accent: "#d97706" },
  ] as const;

  const chipBackground = theme.dark ? theme.colors.surfaceVariant : theme.colors.surfaceVariant;
  const statusBackground = (tone: string) =>
    tone === "healthy"
      ? `${theme.colors.secondary}22`
      : tone === "warning"
      ? `${theme.colors.tertiary}22`
      : `${theme.colors.error}22`;
  const statusColor = (tone: string) =>
    tone === "healthy" ? theme.colors.secondary : tone === "warning" ? theme.colors.tertiary : theme.colors.error;
  const categoryChartData = [
    { name: "Grains", population: categoryBreakdown.find((item) => item.name === "Grains & Rice")?.value ?? 0, color: "#2856d7" },
    { name: "Oils", population: categoryBreakdown.find((item) => item.name === "Oil & Condiments")?.value ?? 0, color: "#159a72" },
    { name: "Dairy", population: categoryBreakdown.find((item) => item.name === "Dairy")?.value ?? 0, color: "#ed9200" },
    { name: "Instant", population: categoryBreakdown.find((item) => item.name === "Instant Foods")?.value ?? 0, color: "#7138e8" },
    { name: "Others", population: categoryBreakdown.filter((item) => !["Grains & Rice", "Oil & Condiments", "Dairy", "Instant Foods"].includes(item.name)).reduce((total, item) => total + item.value, 0), color: "#0ea5d9" },
  ];

  return (
    <ScreenContainer style={styles.page} contentContainerStyle={styles.content}>
      <Surface style={[styles.hero, { backgroundColor: theme.colors.primary, borderColor: theme.colors.outline }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: theme.colors.onPrimary }]}>{greeting}</Text>
            <Text numberOfLines={1} style={[styles.storeName, { color: theme.colors.onPrimary }]}>{state.user.storeName || translate(language, "storeNameNotSet")}</Text>
            <Text style={[styles.lastUpdated, { color: `${theme.colors.onPrimary}cc` }]}>◷ {translate(language, "lastUpdated")}: {lastUpdated}</Text>
          </View>
          <Avatar.Text size={52} label={session?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "FM"} style={[styles.avatar, { backgroundColor: theme.colors.secondary }]} />
        </View>
      </Surface>

      <TouchableRipple
        borderless
        onPress={() => router.push("/pos" as any)}
        style={[styles.posBanner, { backgroundColor: theme.dark ? `${theme.colors.primary}18` : "#f5f3ff", borderColor: "#8b5cf6" }]}
      >
        <View style={styles.posContent}>
          <IconButton icon="cash-register" iconColor="#7c3aed" containerColor="#ede9fe" size={24} />
          <View style={styles.posText}>
            <Text style={[styles.posTitle, { color: theme.dark ? theme.colors.onSurface : "#5b21b6" }]}>
              {translate(language, "posTitle")}
            </Text>
            <Text style={[styles.posSubtitle, { color: theme.dark ? theme.colors.onSurfaceVariant : "#6d28d9" }]}>
              {translate(language, "posSubtitle")}
            </Text>
          </View>
          <IconButton icon="chevron-right" iconColor="#7c3aed" size={24} />
        </View>
      </TouchableRipple>

      <TouchableRipple
        borderless
        onPress={() => router.push("/utang" as any)}
        style={[styles.posBanner, { backgroundColor: theme.dark ? `${theme.colors.tertiary}18` : "#fffbeb", borderColor: "#f59e0b", marginTop: -2 }]}
      >
        <View style={styles.posContent}>
          <IconButton icon="book-open-page-variant" iconColor="#d97706" containerColor="#fef3c7" size={24} />
          <View style={styles.posText}>
            <Text style={[styles.posTitle, { color: theme.dark ? theme.colors.onSurface : "#92400e" }]}>
              {translate(language, "utangTitle")}
            </Text>
            <Text style={[styles.posSubtitle, { color: theme.dark ? theme.colors.onSurfaceVariant : "#b45309" }]}>
              {translate(language, "utangSubtitle")}
            </Text>
          </View>
          <IconButton icon="chevron-right" iconColor="#d97706" size={24} />
        </View>
      </TouchableRipple>

      {lowStockProducts.length > 0 ? (
        <TouchableRipple
          borderless
          onPress={() => router.push({ pathname: "/alerts", params: { filter: "Low Stock" } } as any)}
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
          onPress={() => router.push({ pathname: "/alerts", params: { filter: "Expiry" } } as any)}
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

      <View style={styles.statsGrid}>
        <MiniStat title={translate(language, "statProducts")} value={summary.totalProducts} accent={theme.colors.primary} theme={theme} />
        <MiniStat title={translate(language, "statInStock")} value={summary.inStock} accent={theme.colors.secondary} theme={theme} />
        <MiniStat title={translate(language, "statLowStock")} value={summary.lowStock} accent={theme.colors.tertiary} theme={theme} />
        <MiniStat title={translate(language, "statOutOfStock")} value={summary.outOfStock} accent={theme.colors.error} theme={theme} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{translate(language, "quickActionsLabel")}</Text>
        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <TouchableRipple key={action.label} style={[styles.quickCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, borderTopColor: action.accent, borderBottomColor: action.accent }]} onPress={() => router.push(action.route as any)}>
              <View style={styles.quickContent}>
                <View style={[styles.quickIcon, { backgroundColor: theme.colors.secondaryContainer }]}><MaterialCommunityIcons name={action.icon} size={20} color={action.accent} /></View>
                <Text style={[styles.quickLabel, { color: theme.colors.onSurface }]}>{action.label}</Text>
              </View>
            </TouchableRipple>
          ))}
        </View>
      </View>

      <TouchableRipple borderless onPress={() => router.push({ pathname: "/reports", params: { tab: "Weekly" } } as any)}>
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Card.Content style={styles.chartContent}>
          <View style={styles.weeklyHeader}>
            <Text style={[styles.weeklyTitle, { color: theme.colors.onSurface }]}>{translate(language, "weeklyActivity")}</Text>
            <Text style={[styles.weeklyDate, { color: theme.colors.onSurfaceVariant }]}>{weeklyActivity.selectedRange}</Text>
          </View>
          <TrendLineChart labels={weeklyActivity.labels} first={weeklyActivity.stockIn} second={weeklyActivity.stockOut} firstColor={theme.colors.primary} secondColor={theme.colors.secondary} />
          <View style={styles.weeklyLegend}><TrendLegend firstColor={theme.colors.primary} secondColor={theme.colors.secondary} firstLabel={translate(language, "stockInLabel")} secondLabel={translate(language, "stockOutLabel")} /></View>
          </Card.Content>
        </Card>
      </TouchableRipple>

      <Card style={[styles.categoryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
        <Card.Content style={styles.categoryContent}>
          <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>{translate(language, "stockByCategory")}</Text>
          <View style={styles.categoryChartLayout}>
            <View style={styles.pieWrap}><CategoryDonut data={categoryChartData} /></View>
            <View style={styles.categoryLegend}>
              {categoryChartData.map((category) => <View key={category.name} style={styles.categoryLegendRow}><View style={styles.categoryLegendLabel}><View style={[styles.categoryLegendDot, { backgroundColor: category.color }]} /><Text style={[styles.categoryName, { color: theme.colors.onSurface }]} numberOfLines={1}>{category.name}</Text></View><Text style={[styles.categoryValue, { color: theme.colors.onSurfaceVariant }]}>{category.population}</Text></View>)}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.alertCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{translate(language, "safetyStockOverview")}</Text>
          <View style={styles.alertRow}>
            <View style={[styles.pill, { backgroundColor: `${theme.colors.error}16` }]}><Text style={[styles.pillText, { color: theme.colors.error }]}>{lowStockProducts.length} {translate(language, "lowStockSummary")}</Text></View>
            <View style={[styles.pill, { backgroundColor: `${theme.colors.tertiary}16` }]}><Text style={[styles.pillText, { color: theme.colors.tertiary }]}>{expiringProducts.length} {translate(language, "expiringSummary")}</Text></View>
          </View>
          {lowStockProducts.slice(0, 3).map((product) => {
            const status = getSafetyStockStatus(product);
            return (
              <View key={product.id} style={[styles.healthRow, { borderBottomColor: theme.colors.outline }]}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[styles.healthTitle, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
                  <Text style={[styles.healthMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">{product.currentStock}/{product.lowStockThreshold} {product.unitType}</Text>
                </View>
                <Chip compact style={[status.tone === "critical" ? [styles.statusChip, { backgroundColor: `${theme.colors.error}22` }] : [styles.statusChip, { backgroundColor: `${theme.colors.tertiary}22` }], { flexShrink: 0, alignSelf: "flex-start" }]} textStyle={{ color: status.tone === "critical" ? theme.colors.error : theme.colors.tertiary }}>{status.label}</Chip>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      <Card style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
        <Card.Content>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{translate(language, "recentActivityTitle")}</Text>
            <Button compact onPress={() => router.push("/reports")}>{translate(language, "viewReports")}</Button>
          </View>
          <FlatList
            data={recentActivity}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.activityRow, { borderBottomColor: theme.colors.outline }]}>
                <View style={[styles.activityIcon, { backgroundColor: item.type === "in" ? `${theme.colors.primary}16` : `${theme.colors.secondary}16` }]}>
                  <MaterialCommunityIcons name={item.type === "in" ? "arrow-top-right" : "arrow-bottom-right"} size={18} color={item.type === "in" ? theme.colors.primary : theme.colors.secondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text style={[styles.activityTitle, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{item.productName}</Text>
                  <Text style={[styles.activityMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">{formatRelativeTime(item.timestamp)}</Text>
                </View>
                <Text style={[styles.activityQty, { color: item.type === "in" ? theme.colors.primary : theme.colors.secondary, flexShrink: 0 }]}>{item.quantity}</Text>
              </View>
            )}
          />
        </Card.Content>
      </Card>

    </ScreenContainer>
  );
}

function MiniStat({ title, value, accent, theme }: { title: string; value: number; accent: string; theme: any }) {
  return (
    <Card style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, borderTopColor: accent, borderBottomColor: accent }]}> 
      <Card.Content style={styles.statContent}>
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{title}</Text>
      </Card.Content>
    </Card>
  );
}

function CategoryDonut({ data }: { data: { population: number; color: string }[] }) {
  const size = 110;
  const center = size / 2;
  const radius = 39;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + item.population, 0);
  let offset = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item) => {
        const segment = total ? (item.population / total) * circumference : 0;
        const visibleSegment = Math.max(segment - 3, 0);
        const currentOffset = offset;
        offset += segment;
        return <Circle key={item.color} cx={center} cy={center} r={radius} fill="transparent" stroke={item.color} strokeWidth={strokeWidth} strokeDasharray={`${visibleSegment} ${circumference - visibleSegment}`} strokeDashoffset={-currentOffset} transform={`rotate(-90 ${center} ${center})`} />;
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  hero: { borderRadius: 0, padding: 16, paddingTop: 24, marginTop: -16, marginHorizontal: -16, marginBottom: 14, borderWidth: 1, elevation: 2 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 14, marginBottom: 6 },
  storeName: { fontSize: 26, lineHeight: 31, fontWeight: "800", marginBottom: 3 },
  lastUpdated: { fontSize: 11, marginTop: 2 },
  avatar: {},
  posBanner: { borderRadius: 18, borderWidth: 1.5, marginBottom: 14 },
  posContent: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10 },
  posText: { flex: 1, marginLeft: 6 },
  posTitle: { fontSize: 16, fontWeight: "800" },
  posSubtitle: { fontSize: 12, marginTop: 2 },
  restockBanner: { borderRadius: 18, borderWidth: 1, marginBottom: 14 },
  expiryBanner: { borderRadius: 18, borderWidth: 1, marginBottom: 14 },
  restockContent: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8 },
  restockText: { flex: 1 },
  restockTitle: { fontSize: 15, fontWeight: "800" },
  restockSubtitle: { fontSize: 13, marginTop: 3 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  statCard: { width: "48%", borderRadius: 16, borderWidth: 1, borderTopWidth: 3, borderBottomWidth: 3, elevation: 3 },
  statContent: { alignItems: "center", paddingBottom: 6 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, textAlign: "center", fontWeight: "600" },
  chartCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 3 },
  categoryCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 3 },
  categoryContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20 },
  categoryTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  chartContent: { paddingTop: 12, paddingBottom: 18 },
  chartSubtitle: { fontSize: 12, marginTop: -6 },
  weeklyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  weeklyTitle: { fontSize: 15, fontWeight: "700" },
  weeklyDate: { fontSize: 11 },
  weeklyLegend: { alignItems: "center", marginTop: -3 },
  legendRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10 },
  chartWrap: { alignSelf: "center", marginTop: 8 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 },
  dayLabel: { fontSize: 10 },
  categoryChartLayout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  pieWrap: { width: 110, height: 110, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  categoryLegend: { width: 178, height: 110, flexShrink: 0, justifyContent: "center", gap: 8 },
  categoryLegendRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 7 },
  categoryLegendLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  categoryLegendDot: { width: 9, height: 9, borderRadius: 5 },
  categoryName: { fontSize: 12, fontWeight: "600" },
  categoryValue: { fontSize: 12 },
  categoryProgress: { height: 7, borderRadius: 4 },
  alertCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 10 },
  alertRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontWeight: "700", fontSize: 12 },
  healthRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, minWidth: 0 },
  healthTitle: { fontWeight: "700", flexShrink: 1 },
  healthMeta: { fontSize: 12, marginTop: 2 },
  statusChip: { borderRadius: 12 },
  section: { marginBottom: 12 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickCard: { flex: 1, minWidth: 0, alignItems: "center", borderRadius: 16, padding: 14, paddingBottom: 18, borderWidth: 1, borderTopWidth: 3, borderBottomWidth: 3, elevation: 3 },
  quickContent: { width: "100%", alignItems: "center" },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickLabel: { fontSize: 12, lineHeight: 16, fontWeight: "700", flexShrink: 1, textAlign: "center" },
  listCard: { borderRadius: 16, marginBottom: 12, borderWidth: 1, elevation: 3 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, minWidth: 0 },
  activityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  activityTitle: { fontWeight: "700", flexShrink: 1 },
  activityMeta: { fontSize: 12, marginTop: 2 },
  activityQty: { fontWeight: "800", flexShrink: 0 },
});

import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Appbar, Button, Card, Icon, ProgressBar, Text, TouchableRipple, useTheme } from "react-native-paper";

import { ExportFormatDialog } from "../../components/export-format-dialog";
import { TrendLegend, TrendLineChart } from "../../components/trend-line-chart";

import { ScreenContainer } from "../../components/screen-container";
import { useStore } from "../../context/store";
import { getCurrency } from "../../data/freshmart";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { translate } from "../../lib/i18n";
import { downloadInventoryExcel, downloadInventoryWord, printInventoryData } from "../../lib/inventory-export";

const tabs = ["Stock", "Profit"] as const;
const stockPeriods = ["Weekly", "Monthly", "Annual"] as const;
const profitPeriods = ["Weekly", "Monthly", "Annual"] as const;
export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const { tab, period } = useLocalSearchParams<{ tab?: string; period?: string }>();
  const { state, summary, sales } = useStore();
  const activeTab = tab === "Profit" ? "Profit" : "Stock";
  const routeStockPeriod = period ?? (stockPeriods.includes(tab as (typeof stockPeriods)[number]) ? tab : undefined);
  const stockPeriod = stockPeriods.includes(routeStockPeriod as (typeof stockPeriods)[number])
    ? routeStockPeriod as (typeof stockPeriods)[number]
    : "Weekly";
  const [profitPeriod, setProfitPeriod] = useState<(typeof profitPeriods)[number]>("Weekly");
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const language = state.user.preferences?.language ?? "English";
  const stockData = useMemo(() => {
    const now = new Date();
    const bucketCount = stockPeriod === "Weekly" ? 7 : stockPeriod === "Monthly" ? 6 : 12;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = stockPeriod === "Weekly"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (bucketCount - 1 - index))
        : new Date(now.getFullYear(), now.getMonth() - (bucketCount - 1 - index), 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return {
        date,
        key: stockPeriod === "Weekly" ? `${year}-${month}-${day}` : `${year}-${month}`,
        label: stockPeriod === "Weekly"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short" }),
        stockIn: 0,
        stockOut: 0,
        wastage: 0,
      };
    });

    state.movements.forEach((movement) => {
      const date = new Date(movement.timestamp);
      if (Number.isNaN(date.getTime())) return;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const key = stockPeriod === "Weekly" ? `${year}-${month}-${day}` : `${year}-${month}`;
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) return;
      if (movement.type === "in") bucket.stockIn += movement.quantity;
      if (movement.type === "out") {
        bucket.stockOut += movement.quantity;
        if (movement.reason === "expired" || movement.reason === "damaged") bucket.wastage += movement.quantity;
      }
    });

    const first = buckets[0].date;
    const last = buckets[buckets.length - 1].date;
    const dateOptions = stockPeriod === "Weekly"
      ? { month: "short" as const, day: "numeric" as const }
      : { month: "short" as const, year: "numeric" as const };
    return {
      labels: buckets.map((item) => item.label),
      stockIn: buckets.map((item) => item.stockIn),
      stockOut: buckets.map((item) => item.stockOut),
      wastage: buckets.map((item) => item.wastage),
      range: `${first.toLocaleDateString("en-US", dateOptions)} - ${last.toLocaleDateString("en-US", dateOptions)}`,
      highestWastage: buckets.reduce((highest, item) => item.wastage > highest.wastage ? item : highest, buckets[0]),
    };
  }, [state.movements, stockPeriod]);
  const totalIn = stockData.stockIn.reduce((total, value) => total + value, 0);
  const totalOut = stockData.stockOut.reduce((total, value) => total + value, 0);
  const turnover = ((totalOut / Math.max((totalIn + totalOut) / 2, 1)) * 100).toFixed(1);
  const inventoryValue = state.products.reduce((total, product) => total + product.currentStock * product.unitPrice, 0);
  const retailValue = state.products.reduce((total, product) => total + product.currentStock * (product.srpPrice ?? product.unitPrice), 0);
  const maxInventoryValue = Math.max(...state.products.map((product) => product.currentStock * product.unitPrice), 1);
  const sortedProducts = useMemo(() => [...state.products].sort((left, right) => left.name.localeCompare(right.name)), [state.products]);
  const completedSales = useMemo(() => sales.filter((sale) => sale.status === "completed"), [sales]);
  const profitSales = useMemo(
    () => completedSales.filter((sale) =>
      sale.status === "completed" &&
      sale.items.length > 0 &&
      sale.items.every((item) => typeof item.unitCost === "number" && Number.isFinite(item.unitCost)),
    ),
    [completedSales],
  );
  const saleRows = profitSales.flatMap((sale) => {
    const netRevenue = Math.max(sale.subtotal - sale.discount, 0);
    return sale.items.map((item, index) => ({
      id: `${sale.id}-${index}`,
      name: item.productName,
      quantity: item.quantity,
      revenue: sale.subtotal > 0 ? netRevenue * item.totalPrice / sale.subtotal : 0,
      cost: item.quantity * (item.unitCost ?? 0),
    }));
  });
  const profitRevenue = completedSales.reduce((total, sale) => total + Math.max(sale.subtotal - sale.discount, 0), 0);
  const costTrackedRevenue = profitSales.reduce((total, sale) => total + Math.max(sale.subtotal - sale.discount, 0), 0);
  const profitCost = profitSales.reduce(
    (total, sale) => total + sale.items.reduce((saleCost, item) => saleCost + item.quantity * (item.unitCost ?? 0), 0),
    0,
  );
  const profitChart = useMemo(() => {
    const now = new Date();
    const buckets = profitPeriod === "Weekly"
      ? Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - (6 - index)); return { label: date.toLocaleDateString("en-US", { weekday: "short" }), key: date.toISOString().slice(0, 10) }; })
      : profitPeriod === "Monthly"
      ? Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1); return { label: date.toLocaleDateString("en-US", { month: "short" }), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }; })
      : Array.from({ length: 5 }, (_, index) => { const year = now.getFullYear() - (4 - index); return { label: String(year), key: String(year) }; });
    const points = buckets.map((bucket) => ({ ...bucket, profit: 0, revenue: 0 }));
    completedSales.forEach((sale) => {
      const date = new Date(sale.timestamp);
      const key = profitPeriod === "Weekly" ? date.toISOString().slice(0, 10) : profitPeriod === "Monthly" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : String(date.getFullYear());
      const point = points.find((item) => item.key === key);
      if (!point) return;
      const revenue = Math.max(sale.subtotal - sale.discount, 0);
      point.revenue += revenue;
      if (sale.items.length > 0 && sale.items.every((item) => typeof item.unitCost === "number" && Number.isFinite(item.unitCost))) {
        const cost = sale.items.reduce((total, item) => total + item.quantity * (item.unitCost ?? 0), 0);
        point.profit += revenue - cost;
      }
    });
    return { labels: points.map((point) => point.label), profit: points.map((point) => point.profit), revenue: points.map((point) => point.revenue) };
  }, [profitPeriod, completedSales]);
  const stockChartTitle = stockPeriod === "Weekly"
    ? translate(language, "weeklyMovementTitle")
    : stockPeriod === "Monthly"
      ? translate(language, "monthlyOverviewTitle")
      : translate(language, "annualOverviewTitle");

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}> 
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]} elevated={false}> 
        <Appbar.Content title={translate(language, "reportsTitle")} subtitle={translate(language, "reportsSubtitle")} titleStyle={styles.headerTitle} subtitleStyle={styles.headerSubtitle} />
      </Appbar.Header>

      <ScreenContainer style={[styles.wrapper, breakpoint !== "mobile" && { maxWidth: 1040, width: "100%", alignSelf: "center" }]} contentContainerStyle={[styles.content, breakpoint !== "mobile" && { paddingHorizontal: 32 }]}>
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}> 
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            const tabKey = tab === "Stock" ? "reportsTabStock" : "tabProfit";
            return <Pressable key={tab} onPress={() => router.setParams({ tab, period: stockPeriod })} style={[styles.tab, selected && { borderBottomColor: theme.colors.primary }]}><Text style={[styles.tabText, { color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>{translate(language, tabKey)}</Text></Pressable>;
          })}
        </View>

        {activeTab === "Stock" ? <View style={styles.kpiGrid}>
          <KpiCard icon="trending-up" label={translate(language, "totalInLabel")} value={String(totalIn)} color={theme.colors.primary} />
          <KpiCard icon="trending-down" label={translate(language, "totalOutLabel")} value={String(totalOut)} color={theme.colors.secondary} />
          <KpiCard icon="chart-bar" label={translate(language, "turnoverLabel")} value={`${turnover}%`} color={theme.colors.tertiary} />
        </View> : null}

        {activeTab === "Stock" && (
          <>
          <View style={[styles.periodSwitch, { backgroundColor: theme.colors.surfaceVariant }]}>
            {stockPeriods.map((period) => {
              const selected = stockPeriod === period;
              const label = period === "Weekly"
                ? translate(language, "reportsTabWeekly")
                : period === "Monthly"
                  ? translate(language, "reportsTabMonthly")
                  : translate(language, "reportsTabAnnual");
              return (
                <Pressable
                  key={period}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => router.setParams({ tab: period, period })}
                  style={[styles.periodButton, selected && { backgroundColor: theme.colors.surface }]}
                >
                  <Text style={{ color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "700", fontSize: 11 }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{stockChartTitle}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{stockData.range}</Text>
              <TrendLineChart labels={stockData.labels} first={stockData.stockIn} second={stockData.stockOut} third={stockPeriod === "Weekly" ? undefined : stockData.wastage} firstColor={theme.colors.primary} secondColor={theme.colors.secondary} thirdColor={theme.colors.error} />
              <TrendLegend firstColor={theme.colors.primary} secondColor={theme.colors.secondary} thirdColor={stockPeriod === "Weekly" ? undefined : theme.colors.error} thirdLabel={translate(language, "wastageLabel")} />
              {stockPeriod !== "Weekly" && stockData.highestWastage.wastage > 0 ? <View style={[styles.wastageBox, { backgroundColor: `${theme.colors.error}18` }]}><Text style={{ color: theme.colors.error, fontWeight: "700" }}>{translate(language, "wastageAlert").replace("{month}", stockData.highestWastage.label).replace("{units}", String(stockData.highestWastage.wastage))}</Text><Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "monitorWastage")}</Text></View> : null}
            </Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "inventoryValueByProduct")}</Text>
              {sortedProducts.slice(0, 7).map((product) => {
                const value = product.currentStock * product.unitPrice;
                return <TouchableRipple key={product.id} onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } } as Href)} style={styles.productValueRow}><View style={styles.productValueContent}><Text style={styles.productEmoji}>{product.icon}</Text><View style={{ flex: 1, minWidth: 0 }}><View style={styles.valueHeader}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.productValueName, { color: theme.colors.onSurface }]}>{product.name}</Text><Text style={[styles.valueText, { color: theme.colors.primary }]}>{getCurrency(value)}</Text></View><ProgressBar progress={value / maxInventoryValue} color={theme.colors.primary} style={styles.valueProgress} /></View></View></TouchableRipple>;
              })}
            </Card.Content>
          </Card>
          </>
        )}

        {activeTab === "Profit" && (
          <>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <View style={styles.reportChartHeader}><Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "profitAndSalesTrend")}</Text><Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{profitPeriod}</Text></View>
              <View style={[styles.periodSwitch, { backgroundColor: theme.colors.surfaceVariant }]}>{profitPeriods.map((period) => <Pressable key={period} onPress={() => setProfitPeriod(period)} style={[styles.periodButton, profitPeriod === period && { backgroundColor: theme.colors.surface }]}><Text style={{ color: profitPeriod === period ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "700", fontSize: 11 }}>{period}</Text></Pressable>)}</View>
              <TrendLineChart labels={profitChart.labels} first={profitChart.profit} second={profitChart.revenue} firstColor={theme.colors.secondary} secondColor={theme.colors.primary} />
              <TrendLegend firstColor={theme.colors.secondary} secondColor={theme.colors.primary} firstLabel={translate(language, "profitFromSales")} secondLabel={translate(language, "salesRevenue")} />
            </Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "profitFromSales")}</Text>
              <SummaryRow label={translate(language, "salesRevenue")} value={getCurrency(profitRevenue)} theme={theme} />
              <SummaryRow label={translate(language, "costLabel")} value={getCurrency(profitCost)} theme={theme} />
              <SummaryRow label={translate(language, "grossProfitLabel")} value={getCurrency(costTrackedRevenue - profitCost)} theme={theme} last />
              <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "saleOnlyProfitNote")}</Text>
              {saleRows.map((row) => <View key={row.id} style={[styles.profitRow, { borderBottomColor: theme.colors.outline }]}><Text numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0, marginRight: 8, color: theme.colors.onSurface }}>{row.name} · {row.quantity} units</Text><Text style={[styles.valueText, { color: theme.colors.secondary, flexShrink: 0 }]}>{getCurrency(row.revenue - row.cost)}</Text></View>)}
            </Card.Content>
          </Card>
          </>
        )}

        {activeTab !== "Profit" && <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "inventorySummaryTitle")}</Text>
            <SummaryRow label={translate(language, "totalProductsLabel")} value={summary.totalProducts} theme={theme} />
            <SummaryRow label={translate(language, "totalStockUnitsLabel")} value={summary.totalUnits} theme={theme} />
            <SummaryRow label={translate(language, "inventoryValueLabel")} value={getCurrency(inventoryValue)} theme={theme} />
            <SummaryRow label={translate(language, "retailValueLabel")} value={getCurrency(retailValue)} theme={theme} />
            <SummaryRow label={translate(language, "potentialProfitLabel")} value={getCurrency(retailValue - inventoryValue)} theme={theme} last />
          </Card.Content>
        </Card>}

        {activeTab !== "Profit" && <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "quickReportsTitle")}</Text>
            <QuickLink label={translate(language, "lowStockReportLink")} onPress={() => router.push({ pathname: "/alerts", params: { filter: "Low Stock" } } as Href)} theme={theme} />
            <QuickLink label={translate(language, "expiryReportLink")} onPress={() => router.push({ pathname: "/alerts", params: { filter: "Expiry" } } as Href)} theme={theme} last />
          </Card.Content>
        </Card>}

        <View style={styles.exportRow}><Button mode="contained" icon="download-outline" onPress={() => setExportDialogVisible(true)}>{translate(language, "downloadReportButton")}</Button><Button mode="outlined" icon="printer-outline" onPress={() => printInventoryData(state)}>{translate(language, "printReportButton")}</Button></View>
      </ScreenContainer>
      <ExportFormatDialog
        visible={exportDialogVisible}
        title="Download Report"
        onDismiss={() => setExportDialogVisible(false)}
        onSelectExcel={() => downloadInventoryExcel(state)}
        onSelectWord={() => downloadInventoryWord(state)}
      />
    </View>
  );
}

function KpiCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const theme = useTheme();
  return <Card style={[styles.kpiCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}><Card.Content style={styles.kpiContent}><Icon source={icon} size={20} color={color} /><Text style={[styles.kpiValue, { color: theme.colors.onSurface }]}>{value}</Text><Text style={[styles.kpiLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text></Card.Content></Card>;
}

function SummaryRow({ label, value, theme, last = false }: { label: string; value: number | string; theme: any; last?: boolean }) {
  return <View style={[styles.summaryRow, !last && { borderBottomColor: theme.colors.outline, borderBottomWidth: 1 }]}><Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text><Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text></View>;
}

function QuickLink({ label, onPress, theme, last = false }: { label: string; onPress: () => void; theme: any; last?: boolean }) {
  return <TouchableRipple onPress={onPress} style={[styles.quickLink, !last && { borderBottomColor: theme.colors.outline, borderBottomWidth: 1 }]}><View style={styles.quickLinkContent}><Text style={{ color: theme.colors.onSurface }}>{label}</Text><Icon source="chevron-right" size={18} color={theme.colors.onSurfaceVariant} /></View></TouchableRipple>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { elevation: 0 },
  headerTitle: { color: "#ffffff", fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.72)" },
  wrapper: { flex: 1 },
  content: { padding: 16, paddingBottom: 88 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontWeight: "700", textAlign: "center", flexShrink: 1, textTransform: "uppercase" },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, borderRadius: 16, borderWidth: 1 },
  kpiContent: { alignItems: "center", paddingHorizontal: 4, paddingVertical: 12 },
  kpiValue: { fontSize: 17, fontWeight: "800", marginTop: 4 },
  kpiLabel: { fontSize: 10, marginTop: 3, textAlign: "center" },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 14, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  cardSubtitle: { fontSize: 11, marginBottom: 6 },
  reportChartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  periodSwitch: { flexDirection: "row", alignSelf: "flex-start", padding: 3, borderRadius: 10, marginVertical: 8 },
  periodButton: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
  chartWrap: { alignSelf: "center", marginTop: 8 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  dayLabel: { fontSize: 10 },
  legendRow: { flexDirection: "row", gap: 18, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  wastageBox: { padding: 12, borderRadius: 12, marginTop: 10, gap: 3 },
  smallText: { fontSize: 11 },
  productValueRow: { paddingVertical: 7 },
  productValueContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  productEmoji: { width: 28, fontSize: 20, textAlign: "center" },
  valueHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 },
  productValueName: { flex: 1, fontSize: 12, flexShrink: 1, marginRight: 4 },
  valueText: { fontSize: 12, fontWeight: "800", flexShrink: 0 },
  valueProgress: { height: 6, borderRadius: 5, marginTop: 5 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  summaryValue: { fontWeight: "800" },
  profitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, minWidth: 0 },
  quickLink: { paddingVertical: 12 },
  quickLinkContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exportRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 10 },
});

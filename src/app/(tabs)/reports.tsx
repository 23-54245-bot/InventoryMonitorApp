import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Appbar, Button, Card, Icon, ProgressBar, Text, TouchableRipple, useTheme } from "react-native-paper";

import { ExportFormatDialog } from "../../components/export-format-dialog";
import { TrendLegend, TrendLineChart } from "../../components/trend-line-chart";

import { ScreenContainer } from "../../components/screen-container";
import { useStore } from "../../context/store";
import { getCurrency } from "../../data/freshmart";
import { downloadInventoryExcel, downloadInventoryWord, printInventoryData } from "../../lib/inventory-export";

const tabs = ["Weekly", "Monthly", "Inventory", "Profit"] as const;
const profitPeriods = ["Weekly", "Monthly", "Annual"] as const;
export default function ReportsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { state, weeklyActivity, summary } = useStore();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Weekly");
  const [profitPeriod, setProfitPeriod] = useState<(typeof profitPeriods)[number]>("Weekly");
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  useEffect(() => {
    if (tab && tabs.includes(tab as (typeof tabs)[number])) {
      setActiveTab(tab as (typeof tabs)[number]);
    }
  }, [tab]);
  const language = state.user.preferences?.language ?? "English";
  const totalIn = weeklyActivity.stockIn.reduce((total, value) => total + value, 0);
  const totalOut = weeklyActivity.stockOut.reduce((total, value) => total + value, 0);
  const turnover = ((totalOut / Math.max((totalIn + totalOut) / 2, 1)) * 100).toFixed(1);
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, month: date.toLocaleDateString("en-US", { month: "short" }), stockIn: 0, stockOut: 0, wastage: 0 };
    });

    state.movements.forEach((movement) => {
      const date = new Date(movement.timestamp);
      const month = months.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
      if (!month) return;
      if (movement.type === "in") month.stockIn += movement.quantity;
      if (movement.type === "out") {
        month.stockOut += movement.quantity;
        if (movement.reason === "expired" || movement.reason === "damaged") month.wastage += movement.quantity;
      }
    });

    return months;
  }, [state.movements]);
  const highestWastage = monthlyData.reduce((highest, item) => item.wastage > highest.wastage ? item : highest, monthlyData[0]);
  const inventoryValue = state.products.reduce((total, product) => total + product.currentStock * product.unitPrice, 0);
  const retailValue = state.products.reduce((total, product) => total + product.currentStock * (product.srpPrice ?? product.unitPrice), 0);
  const maxInventoryValue = Math.max(...state.products.map((product) => product.currentStock * product.unitPrice), 1);
  const sortedProducts = useMemo(() => [...state.products].sort((left, right) => left.name.localeCompare(right.name)), [state.products]);
  const saleRows = state.movements.filter((movement) => movement.type === "out").map((movement) => {
    const product = state.products.find((item) => item.id === movement.productId);
    if (!product) return null;
    const sellingPrice = product.srpPrice ?? product.unitPrice * 1.2;
    return { id: movement.id, name: product.name, quantity: movement.quantity, revenue: movement.quantity * sellingPrice, cost: movement.quantity * product.unitPrice };
  }).filter((row): row is NonNullable<typeof row> => row !== null);
  const profitRevenue = saleRows.reduce((total, row) => total + row.revenue, 0);
  const profitCost = saleRows.reduce((total, row) => total + row.cost, 0);
  const profitChart = useMemo(() => {
    const now = new Date();
    const buckets = profitPeriod === "Weekly"
      ? Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setDate(now.getDate() - (6 - index)); return { label: date.toLocaleDateString("en-US", { weekday: "short" }), key: date.toISOString().slice(0, 10) }; })
      : profitPeriod === "Monthly"
      ? Array.from({ length: 6 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1); return { label: date.toLocaleDateString("en-US", { month: "short" }), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }; })
      : Array.from({ length: 5 }, (_, index) => { const year = now.getFullYear() - (4 - index); return { label: String(year), key: String(year) }; });
    const points = buckets.map((bucket) => ({ ...bucket, profit: 0, revenue: 0 }));
    state.movements.filter((movement) => movement.type === "out").forEach((movement) => {
      const product = state.products.find((item) => item.id === movement.productId);
      if (!product) return;
      const date = new Date(movement.timestamp);
      const key = profitPeriod === "Weekly" ? date.toISOString().slice(0, 10) : profitPeriod === "Monthly" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : String(date.getFullYear());
      const point = points.find((item) => item.key === key);
      if (!point) return;
      const revenue = movement.quantity * (product.srpPrice ?? product.unitPrice * 1.2);
      point.revenue += revenue;
      point.profit += revenue - movement.quantity * product.unitPrice;
    });
    return { labels: points.map((point) => point.label), profit: points.map((point) => point.profit), revenue: points.map((point) => point.revenue) };
  }, [profitPeriod, state.movements, state.products]);

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}> 
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]} elevated={false}> 
        <Appbar.Content title="Reports" subtitle="Inventory Analytics & Insights" titleStyle={styles.headerTitle} subtitleStyle={styles.headerSubtitle} />
      </Appbar.Header>

      <ScreenContainer style={styles.wrapper} contentContainerStyle={styles.content}>
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}> 
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, selected && { borderBottomColor: theme.colors.primary }]}><Text style={[styles.tabText, { color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>{tab}</Text></Pressable>;
          })}
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard icon="trending-up" label="Total In" value={String(totalIn)} color={theme.colors.primary} />
          <KpiCard icon="trending-down" label="Total Out" value={String(totalOut)} color={theme.colors.secondary} />
          <KpiCard icon="chart-bar" label="Turnover" value={`${turnover}%`} color={theme.colors.tertiary} />
        </View>

        {activeTab === "Weekly" && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Weekly Stock Movement</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{weeklyActivity.selectedRange}</Text>
              <TrendLineChart labels={weeklyActivity.labels} first={weeklyActivity.stockIn} second={weeklyActivity.stockOut} firstColor={theme.colors.primary} secondColor={theme.colors.secondary} />
              <TrendLegend firstColor={theme.colors.primary} secondColor={theme.colors.secondary} />
            </Card.Content>
          </Card>
        )}

        {activeTab === "Monthly" && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Monthly Inventory Trend</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{monthlyData[0].month} - {monthlyData[monthlyData.length - 1].month}</Text>
              <TrendLineChart labels={monthlyData.map((item) => item.month)} first={monthlyData.map((item) => item.stockIn)} second={monthlyData.map((item) => item.stockOut)} third={monthlyData.map((item) => item.wastage)} firstColor={theme.colors.primary} secondColor={theme.colors.secondary} thirdColor={theme.colors.error} />
              {highestWastage.wastage > 0 ? <View style={[styles.wastageBox, { backgroundColor: `${theme.colors.error}18` }]}><Text style={{ color: theme.colors.error, fontWeight: "700" }}>Wastage Alert: {highestWastage.month} Highest at {highestWastage.wastage} Units</Text><Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>Monitor expiry dates to reduce inventory wastage.</Text></View> : null}
            </Card.Content>
          </Card>
        )}

        {activeTab === "Inventory" && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Inventory Value by Product</Text>
              {sortedProducts.slice(0, 7).map((product) => {
                const value = product.currentStock * product.unitPrice;
                return <TouchableRipple key={product.id} onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } } as any)} style={styles.productValueRow}><View style={styles.productValueContent}><Text style={styles.productEmoji}>{product.icon}</Text><View style={{ flex: 1, minWidth: 0 }}><View style={styles.valueHeader}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.productValueName, { color: theme.colors.onSurface }]}>{product.name}</Text><Text style={[styles.valueText, { color: theme.colors.primary }]}>{getCurrency(value)}</Text></View><ProgressBar progress={value / maxInventoryValue} color={theme.colors.primary} style={styles.valueProgress} /></View></View></TouchableRipple>;
              })}
            </Card.Content>
          </Card>
        )}

        {activeTab === "Profit" && (
          <>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <View style={styles.reportChartHeader}><Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Profit & Sales Trend</Text><Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>{profitPeriod}</Text></View>
              <View style={[styles.periodSwitch, { backgroundColor: theme.colors.surfaceVariant }]}>{profitPeriods.map((period) => <Pressable key={period} onPress={() => setProfitPeriod(period)} style={[styles.periodButton, profitPeriod === period && { backgroundColor: theme.colors.surface }]}><Text style={{ color: profitPeriod === period ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: "700", fontSize: 11 }}>{period}</Text></Pressable>)}</View>
              <TrendLineChart labels={profitChart.labels} first={profitChart.profit} second={profitChart.revenue} firstColor={theme.colors.secondary} secondColor={theme.colors.primary} />
              <TrendLegend firstColor={theme.colors.secondary} secondColor={theme.colors.primary} firstLabel="Profit" secondLabel="Sales Revenue" />
            </Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Profit from Sales</Text>
              <SummaryRow label="Revenue" value={getCurrency(profitRevenue)} theme={theme} />
              <SummaryRow label="Cost" value={getCurrency(profitCost)} theme={theme} />
              <SummaryRow label="Gross Profit" value={getCurrency(profitRevenue - profitCost)} theme={theme} last />
              <Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>Only stock-outs categorized as Sale are included.</Text>
              {saleRows.map((row) => <View key={row.id} style={[styles.profitRow, { borderBottomColor: theme.colors.outline }]}><Text numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0, marginRight: 8, color: theme.colors.onSurface }}>{row.name} · {row.quantity} units</Text><Text style={[styles.valueText, { color: theme.colors.secondary, flexShrink: 0 }]}>{getCurrency(row.revenue - row.cost)}</Text></View>)}
            </Card.Content>
          </Card>
          </>
        )}

        {activeTab !== "Profit" && <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Inventory Summary</Text>
            <SummaryRow label="Total Products" value={summary.totalProducts} theme={theme} />
            <SummaryRow label="Total Stock Units" value={summary.totalUnits} theme={theme} />
            <SummaryRow label="Total Inventory Value" value={getCurrency(inventoryValue)} theme={theme} />
            <SummaryRow label="Estimated Retail Value" value={getCurrency(retailValue)} theme={theme} />
            <SummaryRow label="Potential Profit" value={getCurrency(retailValue - inventoryValue)} theme={theme} last />
          </Card.Content>
        </Card>}

        {activeTab !== "Profit" && <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Quick Reports</Text>
            <QuickLink label="Low Stock Report" onPress={() => router.push({ pathname: "/alerts", params: { filter: "Low Stock" } } as any)} theme={theme} />
            <QuickLink label="Expiry Report" onPress={() => router.push({ pathname: "/alerts", params: { filter: "Expiry" } } as any)} theme={theme} last />
          </Card.Content>
        </Card>}

        <View style={styles.exportRow}><Button mode="contained" icon="download-outline" onPress={() => setExportDialogVisible(true)}>Download Report</Button><Button mode="outlined" icon="printer-outline" onPress={() => printInventoryData(state)}>Print Report</Button></View>
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
  content: { padding: 16, paddingBottom: 40 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontWeight: "700" },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, borderRadius: 16, borderWidth: 1 },
  kpiContent: { alignItems: "center", paddingHorizontal: 4, paddingVertical: 12 },
  kpiValue: { fontSize: 17, fontWeight: "800", marginTop: 4 },
  kpiLabel: { fontSize: 10, marginTop: 3, textAlign: "center" },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 14, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  cardSubtitle: { fontSize: 11, marginBottom: 6 },
  reportChartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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

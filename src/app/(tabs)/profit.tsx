import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Card, ProgressBar, Text, useTheme } from "react-native-paper";

import { ScreenContainer } from "../../components/screen-container";
import { useStore } from "../../context/store";
import { getCurrency } from "../../data/freshmart";

export default function ProfitScreen() {
  const theme = useTheme();
  const { state } = useStore();

  const profitData = useMemo(() => {
    const productMap = new Map(state.products.map((product) => [product.id, product]));
    const rows = state.movements
      .filter((movement) => movement.type === "out")
      .map((movement) => {
        const product = productMap.get(movement.productId);
        if (!product) return null;
        const sellingPrice = product.srpPrice ?? product.unitPrice * 1.2;
        const profitPerUnit = sellingPrice - product.unitPrice;
        return {
          id: movement.id,
          productName: product.name,
          quantity: movement.quantity,
          revenue: movement.quantity * sellingPrice,
          cost: movement.quantity * product.unitPrice,
          profit: movement.quantity * profitPerUnit,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    return {
      rows,
      revenue: rows.reduce((total, row) => total + row.revenue, 0),
      cost: rows.reduce((total, row) => total + row.cost, 0),
      profit: rows.reduce((total, row) => total + row.profit, 0),
    };
  }, [state.movements, state.products]);

  const margin = profitData.revenue ? (profitData.profit / profitData.revenue) * 100 : 0;
  const maxProfit = Math.max(...profitData.rows.map((row) => row.profit), 1);

  return (
    <ScreenContainer style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.secondaryContainer }]}>ESTIMATED PERFORMANCE</Text>
            <Text style={[styles.title, { color: theme.colors.onPrimary }]}>Profit Overview</Text>
            <Text style={[styles.subtitle, { color: `${theme.colors.onPrimary}cc` }]}>Based on recorded stock-out movements</Text>
          </View>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.secondary }]}><MaterialCommunityIcons name="trending-up" size={24} color={theme.colors.onSecondary} /></View>
        </View>
        <Text style={[styles.heroValue, { color: theme.colors.onPrimary }]}>{getCurrency(profitData.profit)}</Text>
        <Text style={[styles.heroCaption, { color: `${theme.colors.onPrimary}cc` }]}>Estimated gross profit</Text>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Revenue" value={getCurrency(profitData.revenue)} icon="cash-plus" color={theme.colors.primary} theme={theme} />
        <Metric label="Cost" value={getCurrency(profitData.cost)} icon="cash-minus" color={theme.colors.tertiary} theme={theme} />
        <Metric label="Margin" value={`${margin.toFixed(1)}%`} icon="percent" color={theme.colors.secondary} theme={theme} />
      </View>

      <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Card.Content>
          <View style={styles.cardHeader}><Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Profit by Sale</Text><Text style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>Stock Out</Text></View>
          {profitData.rows.length ? profitData.rows.map((row) => <View key={row.id} style={styles.row}>
            <View style={styles.rowHeader}><Text style={[styles.productName, { color: theme.colors.onSurface }]} numberOfLines={1}>{row.productName}</Text><Text style={[styles.profitValue, { color: theme.colors.secondary }]}>{getCurrency(row.profit)}</Text></View>
            <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{row.quantity} units · Revenue {getCurrency(row.revenue)}</Text>
            <ProgressBar progress={row.profit / maxProfit} color={theme.colors.secondary} style={styles.progress} />
          </View>) : <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No stock-out movements recorded yet.</Text>}
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

function Metric({ label, value, icon, color, theme }: { label: string; value: string; icon: string; color: string; theme: any }) {
  return <Card style={[styles.metric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}><Card.Content style={styles.metricContent}><MaterialCommunityIcons name={icon as any} size={20} color={color} /><Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{value}</Text><Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text></Card.Content></Card>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 18, padding: 20, marginBottom: 14 },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 25, fontWeight: "800", marginTop: 5 },
  subtitle: { fontSize: 12, marginTop: 4 },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroValue: { fontSize: 32, fontWeight: "800", marginTop: 24 },
  heroCaption: { fontSize: 12, marginTop: 2 },
  metricGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 14 },
  metricContent: { alignItems: "center", paddingHorizontal: 4 },
  metricValue: { fontSize: 14, fontWeight: "800", marginTop: 8 },
  metricLabel: { fontSize: 11, marginTop: 3 },
  card: { borderWidth: 1, borderRadius: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  helper: { fontSize: 11 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(24,59,86,0.1)" },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  productName: { flex: 1, fontSize: 14, fontWeight: "700" },
  profitValue: { fontSize: 14, fontWeight: "800" },
  rowMeta: { fontSize: 11, marginTop: 4 },
  progress: { height: 6, borderRadius: 4, marginTop: 8 },
  empty: { paddingVertical: 24, textAlign: "center" },
});

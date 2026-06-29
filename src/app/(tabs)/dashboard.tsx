import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, ProgressBar, Surface, Text, Title } from "react-native-paper";

const products = [
  { name: "Jasmine Rice", stock: 45, category: "Grains", threshold: 20, safetyStock: 30, reorderPoint: 25 },
  { name: "Cooking Oil", stock: 8, category: "Oils", threshold: 20, safetyStock: 25, reorderPoint: 30 },
  { name: "Fresh Milk", stock: 22, category: "Dairy", threshold: 30, safetyStock: 35, reorderPoint: 40 },
  { name: "Soap", stock: 12, category: "Cleaning", threshold: 15, safetyStock: 20, reorderPoint: 25 },
];

export default function Dashboard() {
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, item) => sum + item.stock, 0);
  const lowStock = products.filter((item) => item.stock <= item.threshold).length;
  const outOfStock = products.filter((item) => item.stock === 0).length;
  const belowSafety = products.filter((item) => item.stock < item.safetyStock).length;
  const alerts = products.filter((item) => item.stock <= item.threshold);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.heroCard}>
        <Title style={styles.heroTitle}>Inventory Dashboard</Title>
        <Text style={styles.heroSubtitle}>
          Monitor stock, identify shortages, and stay ahead of inventory risks.
        </Text>
      </Surface>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statNumber}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Product types</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statNumber}>{totalStock}</Text>
            <Text style={styles.statLabel}>Units available</Text>
          </Card.Content>
        </Card>
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statNumber}>{lowStock}</Text>
            <Text style={styles.statLabel}>Low-stock items</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statNumber}>{belowSafety}</Text>
            <Text style={styles.statLabel}>Below safety stock</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.alertCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Critical alerts</Text>
          <Text style={styles.sectionText}>
            Items below thresholds need restocking to avoid stockouts.
          </Text>
          <View style={styles.chipRow}>
            {alerts.map((item) => (
              <Chip key={item.name} style={styles.chip} textStyle={styles.chipText}>
                {item.name}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Inventory snapshot with Safety Stock</Text>
      {products.map((item) => {
        const stockHealth = item.stock / item.safetyStock;
        return (
          <Card key={item.name} style={styles.productCard}>
            <Card.Content>
              <View style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.category}</Text>
                </View>
                <Chip style={item.stock <= item.threshold ? styles.badgeLow : styles.badgeHealthy}>
                  {item.stock} units
                </Chip>
              </View>

              <View style={styles.safetySection}>
                <View style={styles.safetyRow}>
                  <Text style={styles.safetyLabel}>Current</Text>
                  <Text style={styles.safetyValue}>{item.stock}</Text>
                </View>
                <View style={styles.safetyRow}>
                  <Text style={styles.safetyLabel}>Safety Stock</Text>
                  <Text style={styles.safetyValue}>{item.safetyStock}</Text>
                </View>
                <View style={styles.safetyRow}>
                  <Text style={styles.safetyLabel}>Reorder Point</Text>
                  <Text style={styles.safetyValue}>{item.reorderPoint}</Text>
                </View>
              </View>

              <ProgressBar
                progress={Math.min(stockHealth, 1)}
                color={stockHealth >= 1 ? "#16a34a" : stockHealth >= 0.7 ? "#f59e0b" : "#dc2626"}
                style={styles.safetyBar}
              />
              <Text style={styles.safetyStatus}>
                {stockHealth >= 1
                  ? "✓ Above safety stock"
                  : `${Math.round((1 - stockHealth) * 100)}% below safety level`}
              </Text>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef2ff" },
  content: { padding: 20 },
  heroCard: { padding: 20, marginBottom: 20, backgroundColor: "#ffffff", elevation: 2 },
  heroTitle: { fontSize: 28, marginBottom: 8 },
  heroSubtitle: { color: "#4b5563", lineHeight: 22 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statCard: { flex: 1, marginHorizontal: 4, backgroundColor: "#ffffff", elevation: 2 },
  statNumber: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  statLabel: { color: "#6b7280" },
  alertCard: { marginBottom: 20, backgroundColor: "#ffffff", elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  sectionText: { color: "#6b7280", marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { marginRight: 8, marginBottom: 8, backgroundColor: "#fef3c7" },
  chipText: { color: "#92400e" },
  productCard: { marginBottom: 12, backgroundColor: "#ffffff", elevation: 2 },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  productName: { fontSize: 16, fontWeight: "600" },
  productMeta: { color: "#6b7280", marginTop: 4 },
  badgeLow: { backgroundColor: "#fee2e2" },
  badgeHealthy: { backgroundColor: "#d1fae5" },
  safetySection: { backgroundColor: "#f3f4f6", padding: 10, borderRadius: 6, marginBottom: 10 },
  safetyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  safetyLabel: { fontSize: 12, color: "#6b7280" },
  safetyValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  safetyBar: { height: 6, borderRadius: 3, marginBottom: 6 },
  safetyStatus: { fontSize: 11, color: "#6b7280" },
});

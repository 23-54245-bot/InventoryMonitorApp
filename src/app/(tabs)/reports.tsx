import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, ProgressBar, Text, Title } from 'react-native-paper';

const reportData = {
  weekly: {
    period: 'Last 7 Days',
    totalSales: 2450,
    itemsSold: 342,
    accuracy: 97.8,
    categories: [
      { name: 'Grains', sales: 890, change: '+12%' },
      { name: 'Oils', sales: 650, change: '+5%' },
      { name: 'Dairy', sales: 560, change: '-3%' },
      { name: 'Cleaning', sales: 350, change: '+18%' },
    ],
  },
  monthly: {
    period: 'Last 30 Days',
    totalSales: 9840,
    itemsSold: 1456,
    accuracy: 98.2,
    categories: [
      { name: 'Grains', sales: 3560, change: '+22%' },
      { name: 'Oils', sales: 2890, change: '+15%' },
      { name: 'Dairy', sales: 2100, change: '+8%' },
      { name: 'Cleaning', sales: 1290, change: '+32%' },
    ],
  },
  annual: {
    period: 'Last 365 Days',
    totalSales: 118920,
    itemsSold: 17234,
    accuracy: 97.5,
    categories: [
      { name: 'Grains', sales: 42560, change: '+25%' },
      { name: 'Oils', sales: 35680, change: '+18%' },
      { name: 'Dairy', sales: 26400, change: '+12%' },
      { name: 'Cleaning', sales: 14280, change: '+35%' },
    ],
  },
};

export default function Reports() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'annual'>('weekly');
  const data = reportData[period];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Title style={styles.title}>Inventory Reports</Title>
      </View>

      <View style={styles.tabRow}>
        {(['weekly', 'monthly', 'annual'] as const).map((p) => (
          <Chip
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              styles.tab,
              period === p && styles.activeTab,
            ]}
            textStyle={period === p ? styles.activeTabText : styles.tabText}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Chip>
        ))}
      </View>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.periodLabel}>{data.period}</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Sales</Text>
              <Text style={styles.metricValue}>${data.totalSales.toLocaleString()}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Items Sold</Text>
              <Text style={styles.metricValue}>{data.itemsSold.toLocaleString()}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Accuracy</Text>
              <Text style={styles.metricValue}>{data.accuracy}%</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Category Performance</Text>
      {data.categories.map((cat) => {
        const maxSales = Math.max(...data.categories.map((c) => c.sales));
        const progress = cat.sales / maxSales;
        const isPositive = cat.change.startsWith('+');
        return (
          <Card key={cat.name} style={styles.categoryCard}>
            <Card.Content>
              <View style={styles.categoryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <ProgressBar progress={progress} color="#2563eb" style={styles.progress} />
                </View>
                <View style={styles.categoryStats}>
                  <Text style={styles.categorySales}>${cat.sales.toLocaleString()}</Text>
                  <Chip
                    style={{
                      backgroundColor: isPositive ? '#d1fae5' : '#fee2e2',
                    }}
                    textStyle={{
                      color: isPositive ? '#065f46' : '#991b1b',
                      fontSize: 11,
                    }}
                  >
                    {cat.change}
                  </Chip>
                </View>
              </View>
            </Card.Content>
          </Card>
        );
      })}

      <Card style={styles.insightsCard}>
        <Card.Title title="Key Insights" />
        <Card.Content>
          <Text style={styles.insight}>
            • Cleaning products show highest growth ({reportData[period].categories[3].change}) for {period}.
          </Text>
          <Text style={styles.insight}>
            • Inventory accuracy is {data.accuracy}%, maintaining strong supply chain reliability.
          </Text>
          <Text style={styles.insight}>
            • Recommend increasing Cleaning product stock due to high demand trend.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { backgroundColor: '#f3f4f6' },
  activeTab: { backgroundColor: '#2563eb' },
  activeTabText: { color: '#ffffff' },
  tabText: { color: '#111827' },
  summaryCard: { marginBottom: 20, backgroundColor: '#ffffff', elevation: 2 },
  periodLabel: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  categoryCard: { marginBottom: 12, backgroundColor: '#ffffff', elevation: 2 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryName: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  progress: { height: 8, borderRadius: 4 },
  categoryStats: { alignItems: 'flex-end' },
  categorySales: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  insightsCard: { marginTop: 12, backgroundColor: '#f0f9ff', elevation: 0 },
  insight: { fontSize: 13, color: '#1e40af', marginBottom: 8, lineHeight: 18 },
});

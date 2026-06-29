import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Text, Title } from 'react-native-paper';

const alertData = [
  {
    id: 1,
    title: 'Critical: Cooking Oil - Stock Below Safety Level',
    message: 'Current stock: 8 units | Safety stock: 25 units | Reorder point: 20 units',
    severity: 'critical',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    title: 'Warning: Jasmine Rice - Low Inventory',
    message: 'Current stock: 45 units | Will reach threshold in ~3 days at current consumption rate',
    severity: 'warning',
    timestamp: '5 hours ago',
  },
  {
    id: 3,
    title: 'Alert: Fresh Milk - Approaching Expiration',
    message: '12 units expiring in 3 days. Consider prioritizing this stock.',
    severity: 'critical',
    timestamp: '1 day ago',
  },
  {
    id: 4,
    title: 'Info: Hand Soap - Reorder Received',
    message: '50 units of Hand Soap received and added to inventory.',
    severity: 'info',
    timestamp: '2 days ago',
  },
  {
    id: 5,
    title: 'Warning: Dairy Products - High Spoilage Rate',
    message: 'Spoilage rate at 8% this week. Review storage conditions.',
    severity: 'warning',
    timestamp: '3 days ago',
  },
];

export default function Alerts() {
  const severityColors = {
    critical: { bg: '#fee2e2', text: '#991b1b', badge: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#92400e', badge: '#f59e0b' },
    info: { bg: '#dbeafe', text: '#1e40af', badge: '#3b82f6' },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Title style={styles.title}>Alerts & Notifications</Title>
        <Chip>{alertData.length} Active</Chip>
      </View>

      {alertData.map((alert) => {
        const colors = severityColors[alert.severity as keyof typeof severityColors];
        return (
          <Card
            key={alert.id}
            style={[styles.alertCard, { borderLeftColor: colors.badge, borderLeftWidth: 4 }]}
          >
            <Card.Content>
              <View style={styles.alertHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text>
                </View>
                <Chip
                  style={{ backgroundColor: colors.bg }}
                  textStyle={{ color: colors.text, fontSize: 11 }}
                >
                  {alert.severity.toUpperCase()}
                </Chip>
              </View>

              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.timestamp}>{alert.timestamp}</Text>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 0 },
  alertCard: { marginBottom: 12, backgroundColor: '#ffffff', elevation: 2 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  alertTitle: { fontSize: 14, fontWeight: '700' },
  alertMessage: { fontSize: 13, color: '#4b5563', marginBottom: 8 },
  timestamp: { fontSize: 12, color: '#9ca3af' },
});

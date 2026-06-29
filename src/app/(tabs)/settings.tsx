import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, Switch, Text, Title } from "react-native-paper";

export default function Settings() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Title style={styles.header}>Settings</Title>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.row}>
            <Text>New alert notifications</Text>
            <Switch value={true} />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text>Inventory reminders</Text>
            <Switch value={false} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>App Experience</Text>
          <View style={styles.row}>
            <Text>Dark mode</Text>
            <Switch value={false} />
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text>Auto refresh inventory</Text>
            <Switch value={true} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Security</Text>
          <View style={styles.row}>
            <Text>Biometric login</Text>
            <Switch value={false} />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef2ff" },
  content: { padding: 20 },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  card: { marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  divider: { marginVertical: 8 },
});
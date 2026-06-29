import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, IconButton, Text, Title } from "react-native-paper";

export default function Profile() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.profileHeader}>
        <Card.Content style={styles.headerRow}>
          <Avatar.Text size={64} label="JD" style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Title style={styles.title}>Jamie Doe</Title>
            <Text style={styles.subtitle}>Inventory Manager</Text>
          </View>
          <IconButton
            icon="cog"
            mode="outlined"
            onPress={() => router.push("/settings")}
            accessibilityLabel="Open settings"
          />
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <Card.Title title="Contact" />
        <Card.Content>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>jamie@example.com</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>+1 234 567 890</Text>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <Card.Title title="Team" />
        <Card.Content>
          <Text style={styles.label}>Warehouse 1</Text>
          <Text style={styles.value}>Main Distribution Center</Text>
        </Card.Content>
      </Card>

      {/* Settings accessible via the cog icon in the header */}
      <Button mode="contained" onPress={() => router.push("/") } style={styles.logoutButton}>
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef2ff" },
  content: { padding: 20 },
  profileHeader: { marginBottom: 20, elevation: 2 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  avatar: { backgroundColor: "#2563eb" },
  headerInfo: { marginLeft: 16 },
  title: { marginBottom: 4 },
  subtitle: { color: "#6b7280" },
  infoCard: { marginBottom: 16, elevation: 2 },
  label: { marginTop: 12, color: "#6b7280" },
  value: { fontSize: 16, fontWeight: "600", color: "#111827" },
  settingsButton: { marginBottom: 8, paddingVertical: 6 },
  logoutButton: { paddingVertical: 6 },
});

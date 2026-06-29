import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Alerts() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Low Stock Alerts</Text>
      <View style={styles.card}>
        <Text style={styles.item}>Cooking Oil (1L) - 8 left</Text>
        <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Restock</Text></TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.item}>White Sugar (1kg) - 3 left</Text>
        <TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Restock</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fafafa" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 12, elevation: 2 },
  item: { fontSize: 16, marginBottom: 6 },
  button: { backgroundColor: "#007AFF", padding: 8, borderRadius: 6, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});

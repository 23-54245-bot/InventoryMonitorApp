import { StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";

export default function Alerts() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>{"Low Stock Alerts"}</Text>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Card.Content>
          <Text style={[styles.item, { color: theme.colors.onSurface }]}>{"Cooking Oil (1L) - 8 left"}</Text>
          <Button mode="contained" buttonColor={theme.colors.primary} onPress={() => {}}>{"Restock"}</Button>
        </Card.Content>
      </Card>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Card.Content>
          <Text style={[styles.item, { color: theme.colors.onSurface }]}>{"White Sugar (1kg) - 3 left"}</Text>
          <Button mode="contained" buttonColor={theme.colors.primary} onPress={() => {}}>{"Restock"}</Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontWeight: "bold", marginBottom: 10 },
  card: { padding: 12, borderRadius: 8, marginBottom: 12, elevation: 2, borderWidth: 1 },
  item: { fontSize: 16, marginBottom: 10 },
});

import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Menu, SegmentedButtons, Text, TextInput, useTheme } from "react-native-paper";

import { useStore } from "../context/store";
import type { StockMovement } from "../data/freshmart";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { translate } from "../lib/i18n";
const measurementOptions = ["pcs", "bags", "bottles", "packs", "cans", "boxes", "cartons", "trays", "bars"];

export default function StockMovementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; productId?: string }>();
  const { state, stockIn, stockOut } = useStore();
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint !== "mobile";
  const [type, setType] = useState(params.type === "out" ? "out" : "in");
  const [stockOutReason, setStockOutReason] = useState<NonNullable<StockMovement["reason"]>>("sale");
  const [quantity, setQuantity] = useState("1");
  const [productMenuVisible, setProductMenuVisible] = useState(false);
  const [measurementMenuVisible, setMeasurementMenuVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(params.productId ?? state.products[0]?.id ?? "");
  const [measurement, setMeasurement] = useState(state.products.find((item) => item.id === (params.productId ?? state.products[0]?.id))?.unitType ?? "pcs");
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));

  const selectedProduct = useMemo(() => state.products.find((item) => item.id === selectedProductId), [selectedProductId, state.products]);
  const sortedProducts = useMemo(() => [...state.products].sort((left, right) => left.name.localeCompare(right.name)), [state.products]);
  const language = state.user.preferences.language;
  const closeMovement = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/inventory" as Href));
  const parsedQuantity = Number(quantity);
  const quantityValue = /^\d+$/.test(quantity) && Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 0;
  const newStock = selectedProduct && quantityValue > 0
    ? type === "in" ? selectedProduct.currentStock + quantityValue : Math.max(selectedProduct.currentStock - quantityValue, 0)
    : selectedProduct?.currentStock ?? 0;
  const adjustQuantity = (amount: number) => setQuantity(String(Math.max((quantityValue || 0) + amount, 1)));

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]} keyboardShouldPersistTaps="handled">
      <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }, isDesktop && styles.desktopCard]}><Card.Content>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{type === "in" ? translate(language, "stockInLabel") : translate(language, "stockOutLabel")}</Text>
        <SegmentedButtons value={type} onValueChange={(value) => setType(value)} buttons={[{ value: "in", label: translate(language, "stockInLabel") }, { value: "out", label: translate(language, "stockOutLabel") }]} style={styles.segmented} />
        {type === "out" ? <>
          <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>{translate(language, "stockOutReason")}</Text>
          <SegmentedButtons value={stockOutReason} onValueChange={(value) => setStockOutReason(value as NonNullable<StockMovement["reason"]>)} buttons={[{ value: "sale", label: translate(language, "saleReason") }, { value: "damaged", label: translate(language, "damagedReason") }, { value: "expired", label: translate(language, "expiredReason") }, { value: "adjustment", label: translate(language, "adjustmentReason") }]} style={styles.segmented} />
        </> : null}
        <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>{translate(language, "selectProduct")}</Text>
        <Menu
          visible={productMenuVisible}
          onDismiss={() => setProductMenuVisible(false)}
          anchor={<Button mode="outlined" onPress={() => setProductMenuVisible(true)} contentStyle={styles.productButtonContent}>{selectedProduct?.name ?? translate(language, "noProductsAvailable")}</Button>}
        >
          {sortedProducts.map((product) => (
            <Menu.Item
              key={product.id}
              title={`${product.name} · ${product.sku}`}
              onPress={() => { setSelectedProductId(product.id); setMeasurement(product.unitType); setProductMenuVisible(false); }}
            />
          ))}
        </Menu>
        <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>{translate(language, "quantityLabel")} {type === "in" ? translate(language, "toAdd") : translate(language, "toRemove")}</Text>
        <View style={styles.stepper}>
          <IconButton icon="minus" mode="contained-tonal" onPress={() => adjustQuantity(-1)} />
          <View style={styles.quantityValue}>
            <TextInput
              accessibilityLabel={`${translate(language, "quantityLabel")} ${type === "in" ? translate(language, "toAdd") : translate(language, "toRemove")}`}
              mode="outlined"
              value={quantity}
              onChangeText={(value) => setQuantity(value.replace(/\D/g, ""))}
              keyboardType="number-pad"
              selectTextOnFocus
              style={styles.quantityInput}
              contentStyle={styles.quantityInputContent}
              dense
            />
            <Menu visible={measurementMenuVisible} onDismiss={() => setMeasurementMenuVisible(false)} anchor={<Button compact onPress={() => setMeasurementMenuVisible(true)}>{measurement}</Button>}>
            {measurementOptions.map((option) => <Menu.Item key={option} title={option} onPress={() => { setMeasurement(option); setMeasurementMenuVisible(false); }} />)}
            </Menu>
          </View>
          <IconButton icon="plus" mode="contained-tonal" onPress={() => adjustQuantity(1)} />
        </View>
        <View style={[styles.totalPreview, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>{type === "in" ? translate(language, "newStockAfterAdding") : translate(language, "newStockAfterRemoving")}</Text>
          <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{newStock} {measurement}</Text>
        </View>
        <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>{translate(language, "detailsLabel")}</Text>
        <TextInput label={translate(language, "dateLabel")} value={movementDate} onChangeText={setMovementDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} mode="outlined" />
        {type === "in" ? <TextInput label={translate(language, "supplierOptional")} placeholder="e.g. Harvest Mills" value={supplier} onChangeText={setSupplier} style={styles.input} mode="outlined" /> : null}
        <TextInput label={translate(language, "invoiceOptional")} placeholder="e.g. INV-2026-0613" value={invoiceNumber} onChangeText={setInvoiceNumber} style={styles.input} mode="outlined" />
        <TextInput label={translate(language, "noteOptional")} placeholder="e.g. Regular weekly delivery" value={note} onChangeText={setNote} style={styles.input} mode="outlined" multiline />
        <View style={styles.row}>
          <Button disabled={!selectedProduct || quantityValue < 1} mode="contained" buttonColor={theme.colors.primary} onPress={() => { if (!selectedProduct || quantityValue < 1) return; const parsedDate = new Date(`${movementDate}T12:00:00`); const movementTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(movementDate) && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString(); const movementNote = [supplier && `Supplier: ${supplier}`, invoiceNumber && `Invoice: ${invoiceNumber}`, note].filter(Boolean).join(" | "); if (type === "in") { stockIn(selectedProduct.id, quantityValue, state.user.name, movementNote, movementTimestamp); } else { stockOut(selectedProduct.id, quantityValue, state.user.name, movementNote, movementTimestamp, stockOutReason); } closeMovement(); }}>{type === "in" ? translate(language, "confirmStockIn") : translate(language, "confirmStockOut")} ({type === "in" ? "+" : "-"}{quantityValue} {measurement})</Button>
          <Button onPress={closeMovement}>{translate(language, "cancelButton") || "Cancel"}</Button>
        </View>
      </Card.Content></Card>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: 1, elevation: 0 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  segmented: { marginBottom: 12 },
  label: { marginBottom: 4 },
  sectionHeading: { fontSize: 17, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 },
  quantityValue: { alignItems: "center", minWidth: 80 },
  quantityInput: { width: 100, textAlign: "center" },
  quantityInputContent: { textAlign: "center", fontSize: 24, fontWeight: "800" },
  unitText: { fontSize: 13 },
  totalPreview: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 8, marginBottom: 10 },
  totalValue: { fontWeight: "600", fontSize: 15 },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  value: { fontWeight: "600", marginBottom: 10 },
  productButtonContent: { justifyContent: "flex-start" },
  input: { marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  desktopContent: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  desktopCard: { maxWidth: 580, width: "100%", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Appbar, Button, Chip, Divider, IconButton, Surface, Text, useTheme } from "react-native-paper";

import { ResponsiveContainer } from "../components/responsive-container";
import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { getCurrency, type PurchaseOrder } from "../data/freshmart";

type DraftItem = {
  productId: string;
  productName: string;
  sku: string;
  quantity: string;
  unitCost: string;
};

function getOrderTotal(order: PurchaseOrder): number {
  return order.items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
}

function getStatusLabel(status: PurchaseOrder["status"]): string {
  return {
    draft: "Draft",
    ordered: "Ordered",
    partially_received: "Partially received",
    received: "Received",
    cancelled: "Cancelled",
  }[status];
}

export default function PurchaseOrderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isReady } = useAuth();
  const {
    isStoreReady,
    state,
    purchaseOrders,
    purchaseOrdersLoadError,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    receivePurchaseOrderItems,
  } = useStore();
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return state.products
      .filter((product) => !draftItems.some((item) => item.productId === product.id))
      .filter((product) => !query || `${product.name} ${product.sku}`.toLowerCase().includes(query))
      .slice(0, 20);
  }, [state.products, draftItems, productSearch]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const addProduct = (productId: string) => {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    setDraftItems((items) => [
      ...items,
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: "1",
        unitCost: "",
      },
    ]);
    setProductSearch("");
  };

  const updateDraftItem = (productId: string, field: "quantity" | "unitCost", value: string) => {
    setDraftItems((items) => items.map((item) =>
      item.productId === productId ? { ...item, [field]: value } : item,
    ));
  };

  const handleCreateOrder = async () => {
    if (!supplierName.trim()) {
      Alert.alert("Supplier required", "Enter the supplier name before creating the order.");
      return;
    }
    if (draftItems.length === 0) {
      Alert.alert("Products required", "Add at least one product to the order.");
      return;
    }
    const items = draftItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
    }));
    if (items.some((item) =>
      !Number.isFinite(item.quantity) || item.quantity <= 0 ||
      !Number.isFinite(item.unitCost) || item.unitCost < 0 ||
      item.unitCost === 0 && !draftItems.find((draft) => draft.productId === item.productId)?.unitCost.trim()
    )) {
      Alert.alert("Check quantities and costs", "Enter a positive quantity and a unit cost of zero or more for every product.");
      return;
    }

    setIsSaving(true);
    try {
      await createPurchaseOrder({
        supplierName,
        invoiceNumber,
        items,
      });
      setSupplierName("");
      setInvoiceNumber("");
      setDraftItems([]);
      Alert.alert("Purchase order created", "The order is saved as a draft. Mark it ordered when it has been sent to the supplier.");
    } catch (error) {
      Alert.alert("Could not create purchase order", error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkOrdered = async (order: PurchaseOrder) => {
    setIsSaving(true);
    try {
      const updated = await updatePurchaseOrderStatus(order.id, "ordered");
      if (!updated) Alert.alert("Could not update order", "This purchase order is no longer a draft.");
    } catch (error) {
      Alert.alert("Could not update order", error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOrder = (order: PurchaseOrder) => {
    Alert.alert("Cancel purchase order?", `Cancel the order for ${order.supplierName}? Stock already received will not be removed.`, [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: () => {
          setIsSaving(true);
          void updatePurchaseOrderStatus(order.id, "cancelled")
            .then((updated) => {
              if (!updated) Alert.alert("Could not cancel order", "This purchase order can no longer be cancelled.");
            })
            .catch((error) => Alert.alert("Could not cancel order", error instanceof Error ? error.message : String(error)))
            .finally(() => setIsSaving(false));
        },
      },
    ]);
  };

  const openReceiveModal = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    setReceiveQuantities({});
  };

  const handleReceiveOrder = async () => {
    if (!receivingOrder) return;
    const quantities = Object.fromEntries(
      Object.entries(receiveQuantities).map(([productId, value]) => [productId, value.trim() ? Number(value) : 0]),
    );
    setIsSaving(true);
    try {
      const updated = await receivePurchaseOrderItems(receivingOrder.id, quantities);
      if (!updated) {
        Alert.alert("Could not receive order", "Only ordered or partially received purchase orders can be received.");
        return;
      }
      setReceivingOrder(null);
      setReceiveQuantities({});
    } catch (error) {
      Alert.alert("Could not receive order", error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={handleBack} />
        <Appbar.Content title="Purchase Orders" titleStyle={{ color: theme.colors.onPrimary }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
          <View style={styles.sectionHeading}>
            <View>
              <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>Create purchase order</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Draft orders do not change stock. Receive deliveries to add stock.
              </Text>
            </View>
          </View>
          {purchaseOrdersLoadError ? (
            <Surface style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
              <MaterialCommunityIcons name="database-alert-outline" size={22} color={theme.colors.error} />
              <View style={styles.errorCopy}>
                <Text style={{ color: theme.colors.onErrorContainer, fontWeight: "700" }}>
                  Purchase orders could not be loaded
                </Text>
                <Text style={{ color: theme.colors.onErrorContainer, marginTop: 4 }}>
                  {purchaseOrdersLoadError}
                </Text>
                <Text style={{ color: theme.colors.onErrorContainer, marginTop: 6 }}>
                  If the purchase_orders table is missing, apply the Purchase Orders section from supabase/schema.sql in your Supabase SQL Editor.
                </Text>
              </View>
            </Surface>
          ) : null}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={1}>
            <TextInput
              style={[styles.input, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
              placeholder="Supplier name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={supplierName}
              onChangeText={setSupplierName}
              accessibilityLabel="Supplier name"
            />
            <TextInput
              style={[styles.input, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
              placeholder="Invoice / reference number (optional)"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              accessibilityLabel="Invoice or reference number"
            />
            <Text variant="titleMedium" style={[styles.subheading, { color: theme.colors.onSurface }]}>Products</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
              placeholder="Search inventory by name or SKU"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={productSearch}
              onChangeText={setProductSearch}
              accessibilityLabel="Search inventory"
            />
            {filteredProducts.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productChips}>
                {filteredProducts.map((product) => (
                  <Chip key={product.id} icon="plus" onPress={() => addProduct(product.id)}>
                    {product.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {state.products.length === 0 ? "Add inventory products before creating a purchase order." : "No matching products."}
              </Text>
            )}

            {draftItems.map((item) => (
              <View key={item.productId} style={[styles.draftItem, { borderColor: theme.colors.outlineVariant }]}>
                <View style={styles.draftItemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.productName}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>SKU: {item.sku}</Text>
                  </View>
                  <IconButton
                    icon="close"
                    accessibilityLabel={`Remove ${item.productName}`}
                    onPress={() => setDraftItems((items) => items.filter((draft) => draft.productId !== item.productId))}
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.numericInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
                    placeholder="Quantity"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    value={item.quantity}
                    onChangeText={(value) => updateDraftItem(item.productId, "quantity", value)}
                    accessibilityLabel={`${item.productName} order quantity`}
                  />
                  <TextInput
                    style={[styles.input, styles.numericInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
                    placeholder="Unit cost"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="decimal-pad"
                    value={item.unitCost}
                    onChangeText={(value) => updateDraftItem(item.productId, "unitCost", value)}
                    accessibilityLabel={`${item.productName} unit cost`}
                  />
                </View>
              </View>
            ))}

            <Button mode="contained" icon="file-document-plus-outline" loading={isSaving} disabled={isSaving || !isStoreReady} onPress={() => void handleCreateOrder()}>
              Create draft order
            </Button>
          </Surface>

          <View style={[styles.sectionHeading, styles.ordersHeading]}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>Orders</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{purchaseOrders.length} total</Text>
          </View>
          {purchaseOrders.length === 0 ? (
            <Surface style={[styles.card, styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={1}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={theme.colors.onSurfaceVariant} />
              <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>Purchase orders will appear here after you create one.</Text>
            </Surface>
          ) : purchaseOrders.map((order) => {
            const canReceive = order.status === "ordered" || order.status === "partially_received";
            return (
              <Surface key={order.id} style={[styles.card, styles.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]} elevation={1}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: "700" }}>{order.supplierName}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {new Date(order.createdAt).toLocaleDateString()} · PO {order.id.slice(0, 8)}
                    </Text>
                    {order.invoiceNumber ? <Text style={{ color: theme.colors.onSurfaceVariant }}>Invoice: {order.invoiceNumber}</Text> : null}
                  </View>
                  <Chip compact>{getStatusLabel(order.status)}</Chip>
                </View>
                <Divider style={styles.divider} />
                {order.items.map((item) => (
                  <View key={item.productId} style={styles.orderLine}>
                    <Text style={[styles.itemName, { color: theme.colors.onSurface, flex: 1 }]}>{item.productName}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.receivedQuantity}/{item.quantity} · {getCurrency(item.quantity * item.unitCost)}
                    </Text>
                  </View>
                ))}
                <View style={styles.orderTotal}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Order total</Text>
                  <Text style={{ color: theme.colors.onSurface, fontWeight: "700" }}>{getCurrency(getOrderTotal(order))}</Text>
                </View>
                {order.status === "draft" ? (
                  <View style={styles.actions}>
                    <Button mode="contained" compact disabled={isSaving} onPress={() => void handleMarkOrdered(order)}>Mark ordered</Button>
                    <Button mode="outlined" compact disabled={isSaving} onPress={() => handleCancelOrder(order)}>Cancel</Button>
                  </View>
                ) : canReceive ? (
                  <View style={styles.actions}>
                    <Button mode="contained" compact icon="truck-delivery-outline" disabled={isSaving} onPress={() => openReceiveModal(order)}>Receive items</Button>
                    <Button mode="outlined" compact disabled={isSaving} onPress={() => handleCancelOrder(order)}>Cancel remaining</Button>
                  </View>
                ) : null}
              </Surface>
            );
          })}
        </ResponsiveContainer>
      </ScrollView>

      <Modal visible={receivingOrder !== null} transparent animationType="slide" onRequestClose={() => setReceivingOrder(null)}>
        <View style={styles.modalBackdrop}>
          <Surface style={[styles.receiveModal, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <View style={styles.orderHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>Receive delivery</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{receivingOrder?.supplierName}</Text>
              </View>
              <IconButton icon="close" onPress={() => setReceivingOrder(null)} accessibilityLabel="Close receive dialog" />
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
              Enter the quantities received now. Leave other items at zero.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {receivingOrder?.items.map((item) => {
                const remaining = item.quantity - item.receivedQuantity;
                return (
                  <View key={item.productId} style={styles.receiveLine}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>{item.productName}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant }}>Remaining: {remaining}</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.receiveInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline }]}
                      placeholder="0"
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                      keyboardType="decimal-pad"
                      value={receiveQuantities[item.productId] ?? ""}
                      onChangeText={(value) => setReceiveQuantities((current) => ({ ...current, [item.productId]: value }))}
                      accessibilityLabel={`${item.productName} received quantity`}
                    />
                  </View>
                );
              })}
            </ScrollView>
            <Button mode="contained" icon="check" loading={isSaving} disabled={isSaving} onPress={() => void handleReceiveOrder()}>
              Confirm and receive
            </Button>
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { elevation: 0 },
  content: { padding: 16, paddingBottom: 32 },
  sectionHeading: { marginBottom: 12 },
  errorCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, padding: 14, marginBottom: 12 },
  errorCopy: { flex: 1 },
  ordersHeading: { marginTop: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, fontSize: 15 },
  subheading: { fontWeight: "700", marginBottom: 8 },
  productChips: { gap: 8, paddingVertical: 4, marginBottom: 8 },
  draftItem: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  draftItemHeader: { flexDirection: "row", alignItems: "center" },
  itemName: { fontWeight: "600" },
  inputRow: { flexDirection: "row", gap: 10 },
  numericInput: { flex: 1 },
  orderCard: { marginBottom: 12 },
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  divider: { marginVertical: 12 },
  orderLine: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  orderTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#94A3B8", paddingTop: 10, marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  emptyCard: { alignItems: "center", gap: 10, padding: 24 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: "rgba(15, 23, 42, 0.55)" },
  receiveModal: { maxHeight: "85%", borderRadius: 16, padding: 18 },
  receiveLine: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  receiveInput: { width: 96, textAlign: "right", marginBottom: 0 },
});

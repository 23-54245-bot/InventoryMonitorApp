import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { useStore } from "../../context/store";
import { getCurrency, type Product } from "../../data/freshmart";
import { translate, type AppLanguage } from "../../lib/i18n";

export interface AddBatchModalProps {
  visible: boolean;
  onDismiss: () => void;
  product: Product;
  language: AppLanguage;
}

export function AddBatchModal({
  visible,
  onDismiss,
  product,
  language,
}: AddBatchModalProps) {
  const theme = useTheme();
  const { batches, addBatch, deleteBatch } = useStore();
  const [currentTime] = useState(() => Date.now());
  const [batchNumber, setBatchNumber] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  });
  const [unitCostStr, setUnitCostStr] = useState(
    product.unitPrice ? String(product.unitPrice) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productBatches = batches.filter((b) => b.productId === product.id);

  const handleClose = () => {
    setBatchNumber("");
    setQuantityStr("");
    onDismiss();
  };

  const handleAddBatch = async () => {
    const trimmedBatchNumber = batchNumber.trim();
    if (!trimmedBatchNumber) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please enter a batch or lot number."
      );
      return;
    }

    const qty = Number(quantityStr);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please enter a valid positive quantity for this batch."
      );
      return;
    }

    const trimmedDate = expiryDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please enter expiry date in YYYY-MM-DD format."
      );
      return;
    }

    const unitCost = Number(unitCostStr) || 0;

    setIsSubmitting(true);
    try {
      const ok = await addBatch({
        productId: product.id,
        batchNumber: trimmedBatchNumber,
        quantity: qty,
        expiryDate: trimmedDate,
        unitCost,
      });

      if (ok) {
        Alert.alert(
          "Batch Added",
          `Batch ${trimmedBatchNumber} (${qty} units) has been added.`
        );
        setBatchNumber("");
        setQuantityStr("");
      } else {
        Alert.alert(
          translate(language, "errorLabel") || "Error",
          "Failed to add batch. Please try again."
        );
      }
    } catch (err: any) {
      Alert.alert(
        translate(language, "errorLabel") || "Error",
        err?.message || "Failed to add batch."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = (batchId: string, bNum: string) => {
    Alert.alert(
      "Delete Batch",
      `Are you sure you want to delete batch ${bNum}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteBatch(batchId);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Surface
          style={[
            styles.container,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Batch & Expiry Tracking (FEFO)
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                {product.icon} {product.name}
              </Text>
            </View>
            <IconButton icon="close" size={22} onPress={handleClose} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <ScrollView style={styles.scrollContent}>
            {/* Existing Batches List */}
            <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
              Existing Batches ({productBatches.length})
            </Text>

            {productBatches.length === 0 ? (
              <Surface
                style={[
                  styles.emptyBatches,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  No individual lot/batch numbers tracked yet. Add one below.
                </Text>
              </Surface>
            ) : (
              <View style={{ gap: 8, marginBottom: 14 }}>
                {productBatches.map((b) => {
                  const expiryTime = new Date(b.expiryDate).getTime();
                  const isExpiringSoon = currentTime !== null
                    && expiryTime - currentTime < 14 * 24 * 60 * 60 * 1000;
                  const isExpired = currentTime !== null && expiryTime < currentTime;

                  return (
                    <Card
                      key={b.id}
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: isExpired
                          ? theme.colors.error
                          : isExpiringSoon
                          ? theme.colors.tertiary
                          : theme.colors.outline,
                        borderWidth: 1,
                      }}
                    >
                      <Card.Content style={styles.batchCardContent}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontWeight: "700", fontSize: 13, color: theme.colors.onSurface }}>
                              Batch {b.batchNumber}
                            </Text>
                            <Chip
                              compact
                              style={{
                                backgroundColor: isExpired
                                  ? "#FEE2E2"
                                  : isExpiringSoon
                                  ? "#FEF9C3"
                                  : "#DCFCE7",
                              }}
                              textStyle={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: isExpired
                                  ? "#DC2626"
                                  : isExpiringSoon
                                  ? "#854D0E"
                                  : "#15803D",
                              }}
                            >
                              {isExpired ? "EXPIRED" : `Exp: ${b.expiryDate}`}
                            </Chip>
                          </View>
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            Qty: {b.quantity} {product.unitType} · Unit Cost: {getCurrency(b.unitCost)}
                          </Text>
                        </View>
                        <IconButton
                          icon="delete-outline"
                          size={18}
                          iconColor={theme.colors.error}
                          onPress={() => handleDeleteBatch(b.id, b.batchNumber)}
                        />
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}

            <Divider style={{ marginVertical: 8 }} />

            {/* New Batch Form */}
            <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
              Add New Batch
            </Text>

            <View style={{ gap: 10 }}>
              <TextInput
                label="Batch / Lot Number *"
                mode="outlined"
                placeholder="e.g. LOT-2024-001"
                value={batchNumber}
                onChangeText={setBatchNumber}
                style={{ backgroundColor: theme.colors.surface }}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  label="Quantity *"
                  mode="outlined"
                  placeholder="0"
                  value={quantityStr}
                  onChangeText={setQuantityStr}
                  keyboardType="numeric"
                  style={{ flex: 1, backgroundColor: theme.colors.surface }}
                />

                <TextInput
                  label="Unit Cost (₱)"
                  mode="outlined"
                  placeholder="0.00"
                  value={unitCostStr}
                  onChangeText={setUnitCostStr}
                  keyboardType="numeric"
                  left={<TextInput.Affix text="₱ " />}
                  style={{ flex: 1, backgroundColor: theme.colors.surface }}
                />
              </View>

              <TextInput
                label="Expiry Date (YYYY-MM-DD) *"
                mode="outlined"
                placeholder="YYYY-MM-DD"
                value={expiryDate}
                onChangeText={setExpiryDate}
                style={{ backgroundColor: theme.colors.surface }}
              />
            </View>
          </ScrollView>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleClose}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              Done
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              textColor="#FFFFFF"
              onPress={handleAddBatch}
              loading={isSubmitting}
              disabled={isSubmitting || !batchNumber.trim() || !quantityStr.trim()}
              style={{ flex: 1 }}
            >
              Add Batch
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    maxHeight: 400,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyBatches: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  batchCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
});

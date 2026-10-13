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
    Divider,
    IconButton,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { getCurrency, type SaleTransaction } from "../../data/freshmart";
import { translate, type AppLanguage } from "../../lib/i18n";

export interface VoidSaleModalProps {
  visible: boolean;
  onDismiss: () => void;
  sale: SaleTransaction | null;
  language: AppLanguage;
  onVoided?: () => void;
}

export function VoidSaleModal({
  visible,
  onDismiss,
  sale,
  language,
  onVoided,
}: VoidSaleModalProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { voidSale } = useStore();

  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canVoid = session?.role === "Admin" || session?.role === "Manager";

  const handleClose = () => {
    setReason("");
    onDismiss();
  };

  const handleConfirmVoid = async () => {
    if (!sale) return;

    if (!canVoid) {
      Alert.alert(
        translate(language, "permissionDenied") || "Permission Denied",
        "Only Admins and Managers can void sales transactions."
      );
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please provide a reason of at least 5 characters for voiding this sale."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await voidSale(sale.id, trimmedReason);
      if (result.success) {
        Alert.alert(
          "Sale Voided",
          `Sale receipt ${sale.receiptNumber} has been successfully voided.`
        );
        handleClose();
        if (onVoided) {
          onVoided();
        }
      } else {
        Alert.alert(
          translate(language, "errorLabel") || "Error",
          result.error || "Failed to void sale. Please try again."
        );
      }
    } catch (err: any) {
      Alert.alert(
        translate(language, "errorLabel") || "Error",
        err?.message || "An unexpected error occurred while voiding sale."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

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
              <Text style={[styles.title, { color: theme.colors.error }]}>
                Void Transaction
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                Receipt: {sale.receiptNumber}
              </Text>
            </View>
            <IconButton icon="close" size={22} onPress={handleClose} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <ScrollView style={styles.scrollContent}>
            {/* Warning callout */}
            <Surface
              style={[
                styles.warningBox,
                { backgroundColor: theme.colors.errorContainer },
              ]}
            >
              <Text style={[styles.warningText, { color: theme.colors.onErrorContainer }]}>
                ⚠️ This action cannot be undone. Inventory will be returned to stock and the sale will be marked as voided.
              </Text>
            </Surface>

            {/* Sale summary */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                  Total Amount:
                </Text>
                <Text style={{ fontWeight: "700", fontSize: 15, color: theme.colors.primary }}>
                  {getCurrency(sale.totalAmount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                  Date & Time:
                </Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>
                  {new Date(sale.timestamp).toLocaleString()}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                  Cashier:
                </Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>
                  {sale.cashierName || "Staff"}
                </Text>
              </View>
            </View>

            {/* Items preview */}
            <Text style={[styles.sectionHeading, { color: theme.colors.onSurface }]}>
              Items ({sale.items.length}):
            </Text>
            <View style={styles.itemsList}>
              {sale.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, color: theme.colors.onSurface, fontSize: 13 }}
                  >
                    {item.productName} x{item.quantity}
                  </Text>
                  <Text style={{ fontWeight: "600", color: theme.colors.onSurface, fontSize: 13 }}>
                    {getCurrency(item.totalPrice)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Reason input */}
            <Text style={[styles.sectionHeading, { color: theme.colors.onSurface, marginTop: 12 }]}>
              Reason for Voiding *
            </Text>
            <TextInput
              mode="outlined"
              placeholder="e.g. Customer cancelled order, wrong item scanned"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: theme.colors.surface }}
            />
          </ScrollView>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleClose}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={handleConfirmVoid}
              loading={isSubmitting}
              disabled={isSubmitting || reason.trim().length < 5}
              style={{ flex: 1 }}
            >
              Confirm Void
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
    fontSize: 20,
    fontWeight: "800",
  },
  scrollContent: {
    maxHeight: 380,
  },
  warningBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  summarySection: {
    gap: 6,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  itemsList: {
    gap: 4,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
});


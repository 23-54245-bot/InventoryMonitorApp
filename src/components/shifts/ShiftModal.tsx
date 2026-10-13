import { useMemo, useState } from "react";
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
    Divider,
    IconButton,
    Surface,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { useStore } from "../../context/store";
import { getCurrency } from "../../data/freshmart";
import { translate, type AppLanguage } from "../../lib/i18n";

export interface ShiftModalProps {
  visible: boolean;
  onDismiss: () => void;
  language: AppLanguage;
  onSuccess?: () => void;
}

export function ShiftModal({
  visible,
  onDismiss,
  language,
  onSuccess,
}: ShiftModalProps) {
  const theme = useTheme();
  const { currentShift, openShift, closeShift, sales } = useStore();

  const [openingFloatStr, setOpeningFloatStr] = useState("500");
  const [countedCashStr, setCountedCashStr] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If a shift is currently open, calculate live cash sales and expected cash
  const { cashSalesTotal, expectedCash } = useMemo(() => {
    if (!currentShift) return { cashSalesTotal: 0, expectedCash: 0 };

    const shiftSales = sales.filter(
      (s) =>
        s.status !== "voided" &&
        new Date(s.timestamp) >= new Date(currentShift.openedAt)
    );

    const totalCash = shiftSales.reduce((sum, s) => {
      if (s.paymentMethod === "cash") return sum + s.totalAmount;
      if (s.paymentMethod === "split") return sum + (s.splitCashAmount ?? 0);
      return sum;
    }, 0);

    const expected = currentShift.openingFloat + totalCash;
    return { cashSalesTotal: totalCash, expectedCash: expected };
  }, [currentShift, sales]);

  const countedCash = Number(countedCashStr);
  const hasCountedInput = countedCashStr.trim() !== "" && !isNaN(countedCash);
  const variance = hasCountedInput ? countedCash - expectedCash : 0;

  const handleClose = () => {
    setCountedCashStr("");
    setNotes("");
    onDismiss();
  };

  const handleOpenShift = async () => {
    const floatAmount = Number(openingFloatStr);
    if (isNaN(floatAmount) || floatAmount < 0) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please enter a valid opening float amount."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await openShift(floatAmount);
      if (ok) {
        Alert.alert(
          "Shift Opened",
          `Cash shift started with opening float of ${getCurrency(floatAmount)}.`
        );
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert(
          translate(language, "errorLabel") || "Error",
          "Failed to open shift. Please try again."
        );
      }
    } catch (err: any) {
      Alert.alert(
        translate(language, "errorLabel") || "Error",
        err?.message || "Failed to open shift."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!hasCountedInput || countedCash < 0) {
      Alert.alert(
        translate(language, "warningLabel") || "Warning",
        "Please enter the physically counted cash amount."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await closeShift(countedCash, notes.trim() || undefined);
      if (ok) {
        const varianceText =
          variance === 0
            ? "Balanced"
            : variance > 0
            ? `Overage of ${getCurrency(variance)}`
            : `Shortage of ${getCurrency(Math.abs(variance))}`;

        Alert.alert(
          "Shift Closed",
          `Shift finalized.\nCounted: ${getCurrency(countedCash)}\nExpected: ${getCurrency(expectedCash)}\nResult: ${varianceText}`
        );
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        Alert.alert(
          translate(language, "errorLabel") || "Error",
          "Failed to close shift. Please try again."
        );
      }
    } catch (err: any) {
      Alert.alert(
        translate(language, "errorLabel") || "Error",
        err?.message || "Failed to close shift."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isShiftOpen = Boolean(currentShift && currentShift.status === "open");

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
                {isShiftOpen ? "Close Cash Shift" : "Open Cash Shift"}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                {isShiftOpen ? "End-of-day register reconciliation" : "Start-of-day cash drawer setup"}
              </Text>
            </View>
            <IconButton icon="close" size={22} onPress={handleClose} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <ScrollView style={styles.scrollContent}>
            {!isShiftOpen ? (
              // Open Shift Form
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
                  Enter the starting cash amount (float/change fund) placed in the cash drawer before accepting transactions.
                </Text>

                <TextInput
                  label="Opening Cash Float (₱)"
                  mode="outlined"
                  value={openingFloatStr}
                  onChangeText={setOpeningFloatStr}
                  keyboardType="numeric"
                  left={<TextInput.Affix text="₱ " />}
                  style={{ backgroundColor: theme.colors.surface }}
                />

                <View style={styles.presetRow}>
                  {[200, 500, 1000, 2000].map((preset) => (
                    <Button
                      key={preset}
                      mode="outlined"
                      compact
                      onPress={() => setOpeningFloatStr(String(preset))}
                    >
                      ₱{preset}
                    </Button>
                  ))}
                </View>
              </View>
            ) : (
              // Close Shift Form
              <View style={{ gap: 14 }}>
                <Card style={{ backgroundColor: theme.colors.surfaceVariant }}>
                  <Card.Content style={{ gap: 6 }}>
                    <View style={styles.summaryRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>Opened At:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.onSurface }}>
                        {new Date(currentShift!.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>Cashier:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.onSurface }}>
                        {currentShift!.cashierName}
                      </Text>
                    </View>
                    <Divider style={{ marginVertical: 4 }} />
                    <View style={styles.summaryRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>Opening Float:</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.onSurface }}>
                        {getCurrency(currentShift!.openingFloat)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>Cash Sales (This Shift):</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.primary }}>
                        +{getCurrency(cashSalesTotal)}
                      </Text>
                    </View>
                    <Divider style={{ marginVertical: 4 }} />
                    <View style={styles.summaryRow}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.onSurface }}>Expected Cash in Drawer:</Text>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.primary }}>
                        {getCurrency(expectedCash)}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                <TextInput
                  label="Counted Cash in Drawer (₱) *"
                  mode="outlined"
                  value={countedCashStr}
                  onChangeText={setCountedCashStr}
                  keyboardType="numeric"
                  placeholder="0.00"
                  left={<TextInput.Affix text="₱ " />}
                  style={{ backgroundColor: theme.colors.surface }}
                />

                {hasCountedInput ? (
                  <Surface
                    style={[
                      styles.varianceBox,
                      {
                        backgroundColor:
                          variance === 0
                            ? "#DCFCE7"
                            : variance > 0
                            ? "#FEF9C3"
                            : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color:
                          variance === 0
                            ? "#15803D"
                            : variance > 0
                            ? "#854D0E"
                            : "#DC2626",
                      }}
                    >
                      {variance === 0
                        ? "✓ Drawer is perfectly balanced (±₱0.00)"
                        : variance > 0
                        ? `▲ Overage: +${getCurrency(variance)} (more cash than expected)`
                        : `▼ Shortage: -${getCurrency(Math.abs(variance))} (missing cash)`}
                    </Text>
                  </Surface>
                ) : null}

                <TextInput
                  label="Closing Notes (optional)"
                  mode="outlined"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Returned ₱100 change to supplier"
                  multiline
                  numberOfLines={2}
                  style={{ backgroundColor: theme.colors.surface }}
                />
              </View>
            )}
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
              buttonColor={isShiftOpen ? theme.colors.error : theme.colors.primary}
              textColor="#FFFFFF"
              onPress={isShiftOpen ? handleCloseShift : handleOpenShift}
              loading={isSubmitting}
              disabled={isSubmitting || (isShiftOpen && !hasCountedInput)}
              style={{ flex: 1 }}
            >
              {isShiftOpen ? "Close Shift" : "Start Shift"}
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
    maxHeight: 400,
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  varianceBox: {
    padding: 10,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
});


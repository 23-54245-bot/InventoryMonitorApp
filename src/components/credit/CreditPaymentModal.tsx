import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, IconButton, Surface, useTheme } from 'react-native-paper';
import { type Debt } from '../../data/freshmart';
import { translate, type AppLanguage } from '../../lib/i18n';

interface Props {
  visible: boolean;
  debt: Debt | null;
  isDesktop: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSubmit: (params: {debtId: string, customerId: string, amount: number, paymentMethod: "cash"|"gcash"|"maya", referenceNumber?: string, note?: string}) => Promise<boolean>;
  getCurrency: (val: number) => string;
}

export function CreditPaymentModal({ visible, debt, isDesktop, language, onClose, onSubmit, getCurrency }: Props) {
  const theme = useTheme();
  
  const [paymentAmountStr, setPaymentAmountStr] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "maya">("cash");
  const [paymentRefNumber, setPaymentRefNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleSubmitPayment = async () => {
    if (!debt) return;
    const amount = Number(paymentAmountStr);
    if (!amount || amount <= 0) {
      Alert.alert(translate(language, "warningLabel") || "Warning", "Please enter a valid payment amount.");
      return;
    }
    if (amount > debt.balance) {
      Alert.alert(translate(language, "warningLabel") || "Warning", "Payment amount cannot exceed balance due.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const success = await onSubmit({
        debtId: debt.id,
        customerId: debt.customerId,
        amount,
        paymentMethod,
        referenceNumber: paymentRefNumber.trim() || undefined,
        note: paymentNote.trim() || undefined,
      });

      if (success) {
        onClose();
        Alert.alert(
          translate(language, "paymentSuccess") || "Payment Recorded",
          `Recorded ₱${amount.toFixed(2)} payment for ${debt.customerName}. Remaining: ₱${Math.max(0, debt.balance - amount).toFixed(2)}`
        );
      }
    } catch (err: any) {
      Alert.alert(translate(language, "errorLabel") || "Error", err?.message ?? translate(language, "failedToRecordPayment"));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }, isDesktop && styles.desktopModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{translate(language, "recordPaymentTitle")}</Text>
            <IconButton icon="close" size={20} onPress={onClose} />
          </View>

          {debt ? (
            <ScrollView>
              <Surface style={styles.debtSummaryBanner} elevation={0}>
                <Text style={{ fontWeight: "700", fontSize: 16 }}>{debt.customerName}</Text>
                <Text style={{ color: "#64748B", marginVertical: 2 }}>
                  Original: {getCurrency(debt.amount)} · Paid: {getCurrency(debt.amountPaid)}
                </Text>
                <Text style={{ fontWeight: "800", color: "#DC2626", fontSize: 18 }}>
                  Balance: {getCurrency(debt.balance)}
                </Text>
              </Surface>

              <Text style={styles.inputLabel}>{translate(language, "paymentAmountLabel")}</Text>
              <TextInput
                style={styles.modalTextInput}
                keyboardType="decimal-pad"
                value={paymentAmountStr}
                onChangeText={setPaymentAmountStr}
                placeholder="0.00"
              />

              <View style={styles.quickChipsRow}>
                <Chip compact onPress={() => setPaymentAmountStr(String(debt.balance))}>
                  Full Balance ({getCurrency(debt.balance)})
                </Chip>
                {debt.balance > 100 && (
                  <Chip compact onPress={() => setPaymentAmountStr(String(Math.floor(debt.balance / 2)))}>
                    Half ({getCurrency(Math.floor(debt.balance / 2))})
                  </Chip>
                )}
              </View>

              <Text style={styles.inputLabel}>{translate(language, "paymentMethodLabel")}</Text>
              <View style={styles.paymentMethodRow}>
                <Chip
                  selected={paymentMethod === "cash"}
                  onPress={() => setPaymentMethod("cash")}
                  style={[styles.methodChip, paymentMethod === "cash" && styles.selectedMethod]}
                >
                  💵 Cash
                </Chip>
                <Chip
                  selected={paymentMethod === "gcash"}
                  onPress={() => setPaymentMethod("gcash")}
                  style={[styles.methodChip, paymentMethod === "gcash" && styles.selectedMethod]}
                >
                  💙 GCash
                </Chip>
                <Chip
                  selected={paymentMethod === "maya"}
                  onPress={() => setPaymentMethod("maya")}
                  style={[styles.methodChip, paymentMethod === "maya" && styles.selectedMethod]}
                >
                  💚 Maya
                </Chip>
              </View>

              {paymentMethod !== "cash" && (
                <>
                  <Text style={styles.inputLabel}>{translate(language, "referenceNumber")}</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 100293847583"
                    value={paymentRefNumber}
                    onChangeText={setPaymentRefNumber}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{translate(language, "noteOptional")}</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder={translate(language, "additionalRemarks")}
                value={paymentNote}
                onChangeText={setPaymentNote}
              />

              <Button
                mode="contained"
                onPress={handleSubmitPayment}
                loading={isProcessingPayment}
                style={{ marginTop: 16 }}
              >
                {translate(language, "confirmPaymentButton")}
              </Button>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  desktopModalBackdrop: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  desktopModalContent: {
    maxWidth: 580,
    width: "100%",
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  debtSummaryBanner: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  modalTextInput: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1E293B",
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodChip: {
    flex: 1,
    alignItems: "center",
  },
  selectedMethod: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
    borderWidth: 1,
  }
});

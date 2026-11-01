import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, IconButton, useTheme } from 'react-native-paper';
import { type Customer, type Debt } from '../../data/freshmart';
import { type AppLanguage } from '../../lib/i18n';

interface Props {
  visible: boolean;
  customers: Customer[];
  getCustomerOutstandingDebt: (customerId: string) => number;
  isDesktop: boolean;
  language: AppLanguage;
  onClose: () => void;
  onCreated?: () => void;
  addCustomer: (params: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalDebt' | 'loyaltyPoints'>) => Promise<Customer>;
  addDebt: (params: Omit<Debt, 'id' | 'amountPaid' | 'balance' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<Debt>;
  getCurrency: (val: number) => string;
}

export function CreditRecordModal({ visible, customers, getCustomerOutstandingDebt, isDesktop, language, onClose, onCreated, addCustomer, addDebt, getCurrency }: Props) {
  const theme = useTheme();

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState("1000");
  const [newUtangAmountStr, setNewUtangAmountStr] = useState("");
  const [newUtangDueDate, setNewUtangDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [newUtangNote, setNewUtangNote] = useState("");

  const handleCreateUtang = async () => {
    const amount = Number(newUtangAmountStr);
    if (!amount || amount <= 0) {
      Alert.alert("Validation", "Please enter a valid utang amount.");
      return;
    }

    let customerId = selectedCustomerId;
    let customerName = "";
    let customerPhone = "";

    if (!customerId) {
      if (!newCustomerName.trim()) {
        Alert.alert("Validation", "Please select an existing customer or enter a customer name.");
        return;
      }
      const created = await addCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || "N/A",
        creditLimit: Number(newCustomerCreditLimit) || 1000,
        riskStatus: "good",
      });
      customerId = created.id;
      customerName = created.name;
      customerPhone = created.phone;
    } else {
      const existing = customers.find((c) => c.id === customerId);
      if (existing) {
        customerName = existing.name;
        customerPhone = existing.phone;
        const outstandingDebt = getCustomerOutstandingDebt(existing.id);
        // Credit limit check
        if (outstandingDebt + amount > existing.creditLimit) {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Credit Limit Exceeded",
              `${existing.name}'s credit limit is ${getCurrency(existing.creditLimit)}. Current debt is ${getCurrency(outstandingDebt)}. Adding ${getCurrency(amount)} will exceed the limit. Proceed anyway?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Proceed", style: "destructive", onPress: () => resolve(true) },
              ]
            );
          });
          if (!proceed) return;
        }

        if (existing.riskStatus === "blacklisted") {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Blacklisted Customer",
              `${existing.name} is blacklisted for credit purchases. Proceed anyway?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Override & Proceed", style: "destructive", onPress: () => resolve(true) },
              ]
            );
          });
          if (!proceed) return;
        }
      }
    }

    await addDebt({
      customerId,
      customerName,
      customerPhone,
      amount,
      dueDate: newUtangDueDate || undefined,
      note: newUtangNote.trim() || undefined,
      itemsSummary: newUtangNote.trim() || "Manual Utang Entry",
    });

    onCreated?.();
    onClose();
    Alert.alert("Success", `Recorded utang of ${getCurrency(amount)} for ${customerName}.`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }, isDesktop && styles.desktopModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Magtala ng Bagong Utang</Text>
            <IconButton icon="close" size={20} onPress={onClose} />
          </View>

          <ScrollView>
            <Text style={styles.inputLabel}>Pumili ng Customer o Magdagdag</Text>
            {customers.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {customers.map((c) => (
                  <Chip
                    key={c.id}
                    selected={selectedCustomerId === c.id}
                    onPress={() => setSelectedCustomerId(selectedCustomerId === c.id ? "" : c.id)}
                    style={[styles.customerSelectChip, selectedCustomerId === c.id && styles.selectedMethod]}
                  >
                    {c.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : null}

            {!selectedCustomerId && (
              <>
                <Text style={styles.inputLabel}>Bagong Pangalan ng Customer</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Juan Dela Cruz"
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                />

                <Text style={styles.inputLabel}>Numero ng Telepono</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="09171234567"
                  keyboardType="phone-pad"
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                />

                <Text style={styles.inputLabel}>Credit Limit (₱)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="1000"
                  keyboardType="numeric"
                  value={newCustomerCreditLimit}
                  onChangeText={setNewCustomerCreditLimit}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Halaga ng Utang (₱)</Text>
            <TextInput
              style={styles.modalTextInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={newUtangAmountStr}
              onChangeText={setNewUtangAmountStr}
            />

            <Text style={styles.inputLabel}>Takdang Petsa ng Pagbayad (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="YYYY-MM-DD"
              value={newUtangDueDate}
              onChangeText={setNewUtangDueDate}
            />

            <View style={styles.quickChipsRow}>
              <Chip
                compact
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setNewUtangDueDate(d.toISOString().split("T")[0]);
                }}
              >
                +7 Days
              </Chip>
              <Chip
                compact
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 15);
                  setNewUtangDueDate(d.toISOString().split("T")[0]);
                }}
              >
                +15 Days
              </Chip>
              <Chip
                compact
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setNewUtangDueDate(d.toISOString().split("T")[0]);
                }}
              >
                +30 Days
              </Chip>
            </View>

            <Text style={styles.inputLabel}>Items / Note</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="hal. 2 Bigas, 1 Mantika"
              value={newUtangNote}
              onChangeText={setNewUtangNote}
            />

            <Button mode="contained" onPress={handleCreateUtang} style={{ marginTop: 16 }}>
              Itala ang Utang
            </Button>
          </ScrollView>
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
  customerSelectChip: {
    marginRight: 6,
  },
  selectedMethod: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
    borderWidth: 1,
  }
});

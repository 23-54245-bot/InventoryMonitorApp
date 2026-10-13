import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, IconButton, useTheme } from 'react-native-paper';
import { type Customer, type CustomerRiskStatus } from '../../data/freshmart';
import { translate, type AppLanguage } from '../../lib/i18n';

interface Props {
  visible: boolean;
  customer: Customer | null;
  isDesktop: boolean;
  language: AppLanguage;
  onClose: () => void;
  onSave: (id: string, updates: {creditLimit: number, riskStatus: CustomerRiskStatus}) => Promise<void>;
  getCurrency: (val: number) => string;
}

export function CreditCustomerModal({ visible, customer, isDesktop, language, onClose, onSave, getCurrency }: Props) {
  const theme = useTheme();

  const [editLimitStr, setEditLimitStr] = useState(customer ? String(customer.creditLimit) : "");
  const [editRiskStatus, setEditRiskStatus] = useState<CustomerRiskStatus>(customer?.riskStatus ?? "good");

  const handleSaveCustomer = async () => {
    if (!customer) return;
    const limit = Number(editLimitStr) || 1000;
    await onSave(customer.id, {
      creditLimit: limit,
      riskStatus: editRiskStatus,
    });
    onClose();
    Alert.alert(translate(language, "customerUpdated"), `${customer.name} ${translate(language, "customerProfileUpdated")}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }, isDesktop && styles.desktopModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{translate(language, "creditStandingLimit")}</Text>
            <IconButton icon="close" size={20} onPress={onClose} />
          </View>

          {customer ? (
            <ScrollView>
              <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>{customer.name}</Text>
              <Text style={{ color: "#64748B", marginBottom: 14 }}>Phone: {customer.phone}</Text>

              <Text style={styles.inputLabel}>{translate(language, "creditLimitPeso")}</Text>
              <TextInput
                style={styles.modalTextInput}
                keyboardType="numeric"
                value={editLimitStr}
                onChangeText={setEditLimitStr}
              />

              <Text style={styles.inputLabel}>{translate(language, "riskStatusCreditStanding")}</Text>
              <View style={styles.paymentMethodRow}>
                <Chip
                  selected={editRiskStatus === "good"}
                  onPress={() => setEditRiskStatus("good")}
                  style={[styles.methodChip, editRiskStatus === "good" && { backgroundColor: "#DCFCE7" }]}
                >
                  Good
                </Chip>
                <Chip
                  selected={editRiskStatus === "warning"}
                  onPress={() => setEditRiskStatus("warning")}
                  style={[styles.methodChip, editRiskStatus === "warning" && { backgroundColor: "#FEF3C7" }]}
                >
                  Warning
                </Chip>
                <Chip
                  selected={editRiskStatus === "blacklisted"}
                  onPress={() => setEditRiskStatus("blacklisted")}
                  style={[styles.methodChip, editRiskStatus === "blacklisted" && { backgroundColor: "#FEE2E2" }]}
                >
                  Blacklisted
                </Chip>
              </View>

              <Button mode="contained" onPress={handleSaveCustomer} style={{ marginTop: 20 }}>
                {translate(language, "saveButton")}
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
  paymentMethodRow: {
    flexDirection: "row",
    gap: 8,
  },
  methodChip: {
    flex: 1,
    alignItems: "center",
  }
});

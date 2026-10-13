import React from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, type MD3Theme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { SaleTransaction } from "../../data/freshmart";
import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

interface Props {
  visible: boolean;
  completedSale: SaleTransaction | null;
  isDesktop: boolean;
  language: AppLanguage;
  theme: MD3Theme;
  onPrintOrShare: () => void;
  onNewSale: () => void;
  getCurrency: (val: number) => string;
}

export function PosReceiptModal({
  visible,
  completedSale,
  isDesktop,
  language,
  theme,
  onPrintOrShare,
  onNewSale,
  getCurrency,
}: Props) {
  if (!completedSale) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View
          style={[
            styles.receiptModalCard,
            { backgroundColor: theme.colors.surface },
            isDesktop && styles.desktopModalCard,
          ]}
        >
          <View style={styles.receiptHeader}>
            <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.secondary} />
            <Text style={[styles.receiptTitle, { color: theme.colors.onSurface }]}>
              {translate(language, "saleSuccess")}
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
              {completedSale.receiptNumber}
            </Text>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <ScrollView style={{ maxHeight: 220 }}>
            {completedSale.items.map((i, idx) => (
              <View key={idx} style={styles.receiptLineItem}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text numberOfLines={2} ellipsizeMode="tail" style={{ fontWeight: "600", color: theme.colors.onSurface }}>
                    {i.productName}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                    {i.quantity} x {getCurrency(i.unitPrice)}
                  </Text>
                </View>
                <Text style={{ fontWeight: "700", color: theme.colors.onSurface, flexShrink: 0 }}>
                  {getCurrency(i.totalPrice)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.receiptTotals}>
            <View style={styles.summaryLine}>
              <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.onSurface }}>
                Total Paid:
              </Text>
              <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.primary }}>
                {getCurrency(completedSale.totalAmount ?? 0)}
              </Text>
            </View>
            {completedSale.paymentMethod === "cash" ? (
              <View style={styles.summaryLine}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>Change Due:</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.secondary }}>
                  {getCurrency(completedSale.changeAmount ?? 0)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.receiptActions}>
            <Button
              mode="outlined"
              icon="share-variant-outline"
              onPress={onPrintOrShare}
              style={{ flex: 1 }}
            >
              Print / Share
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              onPress={onNewSale}
              style={{ flex: 1 }}
            >
              {translate(language, "newSale")}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  desktopModalBackdrop: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  desktopModalCard: {
    maxWidth: 580,
    width: "100%",
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  receiptModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  receiptHeader: {
    alignItems: "center",
    gap: 6,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  receiptLineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  receiptTotals: {
    marginBottom: 16,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  receiptActions: {
    flexDirection: "row",
    gap: 12,
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import {
    Appbar,
    Card,
    Chip,
    Divider,
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { useStore } from "../context/store";
import { getCurrency, type SaleTransaction } from "../data/freshmart";
import { translate } from "../lib/i18n";

export default function SalesHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { sales, loadSales, state } = useStore();
  const language = state.user.preferences.language ?? "English";

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [filterPayment, setFilterPayment] = useState<string>("All");

  useEffect(() => {
    void loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    if (filterPayment === "All") return sales;
    return sales.filter((s) => s.paymentMethod === filterPayment);
  }, [sales, filterPayment]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSales]);

  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalItems, 0);
  }, [filteredSales]);

  const handleShareReceipt = async (sale: SaleTransaction) => {
    const storeName = state.user.storeName || "StockTrack Store";
    const dateStr = new Date(sale.timestamp).toLocaleString();

    const itemsHtml = sale.items
      .map(
        (i) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #ccc;">
            <strong>${i.productName}</strong><br />
            <small>${i.quantity} x ${getCurrency(i.unitPrice)}</small>
          </td>
          <td style="text-align: right; vertical-align: top; padding: 6px 0; border-bottom: 1px dashed #ccc;">
            ${getCurrency(i.totalPrice)}
          </td>
        </tr>
      `
      )
      .join("");

    const html = `
      <html>
        <body style="font-family: monospace; padding: 24px; max-width: 320px; margin: 0 auto; color: #111;">
          <div style="text-align: center; margin-bottom: 16px;">
            <h2 style="margin: 0;">${storeName}</h2>
            <p style="margin: 4px 0;">Official Sales Receipt</p>
            <p style="margin: 2px 0; font-size: 11px;">Receipt: ${sale.receiptNumber}</p>
            <p style="margin: 2px 0; font-size: 11px;">${dateStr}</p>
          </div>
          <hr style="border: 1px dashed #444;" />
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
            ${itemsHtml}
          </table>
          <hr style="border: 1px dashed #444;" />
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span><span>${getCurrency(sale.subtotal)}</span>
            </div>
            ${
              sale.discount > 0
                ? `<div style="display: flex; justify-content: space-between; color: #b91c1c;">
                     <span>Discount:</span><span>-${getCurrency(sale.discount)}</span>
                   </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 6px;">
              <span>TOTAL:</span><span>${getCurrency(sale.totalAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
              <span>Payment (${sale.paymentMethod.toUpperCase()}):</span>
              <span>${getCurrency(sale.amountTendered)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Change Due:</span><span>${getCurrency(sale.changeAmount)}</span>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 12px;">
            <p>Cashier: ${sale.cashierName}</p>
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS !== "web") {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content
          title={translate(language, "salesHistory")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton icon="refresh" iconColor={theme.colors.onPrimary} onPress={() => void loadSales()} />
      </Appbar.Header>

      {/* Summary KPI Cards */}
      <Surface style={[styles.kpiRow, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.colors.onSurfaceVariant }]}>Total Sales Revenue</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.primary }]}>{getCurrency(totalRevenue)}</Text>
        </View>
        <Divider style={{ width: 1, height: "80%" }} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.colors.onSurfaceVariant }]}>Total Orders</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.onSurface }]}>{filteredSales.length}</Text>
        </View>
        <Divider style={{ width: 1, height: "80%" }} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.colors.onSurfaceVariant }]}>Units Sold</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.secondary }]}>{totalItemsSold}</Text>
        </View>
      </Surface>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {["All", "cash", "card", "e_wallet"].map((m) => (
          <Chip
            key={m}
            compact
            selected={filterPayment === m}
            onPress={() => setFilterPayment(m)}
            style={[styles.filterChip, filterPayment === m && { backgroundColor: theme.colors.primaryContainer }]}
          >
            {m === "All"
              ? "All Payments"
              : m === "cash"
              ? "Cash"
              : m === "card"
              ? "Card"
              : "E-Wallet"}
          </Chip>
        ))}
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedSaleId === item.id;
          const dateStr = new Date(item.timestamp).toLocaleString();

          return (
            <Card style={[styles.saleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content>
                <Pressable onPress={() => setExpandedSaleId(isExpanded ? null : item.id)}>
                  <View style={styles.saleHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.receiptNumber, { color: theme.colors.onSurface }]}>
                        {item.receiptNumber}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                        {dateStr} · {item.cashierName || "Staff"}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.saleAmount, { color: theme.colors.primary }]}>
                        {getCurrency(item.totalAmount)}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Chip compact style={{ height: 22 }}>
                          <Text style={{ fontSize: 10, textTransform: "uppercase" }}>{item.paymentMethod}</Text>
                        </Chip>
                        <MaterialCommunityIcons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </View>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.expandedSection}>
                    <Divider style={{ marginVertical: 8 }} />
                    <Text style={{ fontWeight: "700", fontSize: 12, marginBottom: 4, color: theme.colors.onSurface }}>
                      Items ({item.items.length}):
                    </Text>

                    {item.items.map((prod, idx) => (
                      <View key={idx} style={styles.itemLine}>
                        <Text style={{ flex: 1, fontSize: 13, color: theme.colors.onSurface }}>
                          {prod.productName} <Text style={{ color: theme.colors.onSurfaceVariant }}>x{prod.quantity}</Text>
                        </Text>
                        <Text style={{ fontWeight: "600", fontSize: 13, color: theme.colors.onSurface }}>
                          {getCurrency(prod.totalPrice)}
                        </Text>
                      </View>
                    ))}

                    <Divider style={{ marginVertical: 8 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>Subtotal</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>{getCurrency(item.subtotal)}</Text>
                    </View>

                    {item.discount > 0 ? (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                        <Text style={{ fontSize: 12, color: theme.colors.error }}>Discount</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.error }}>-{getCurrency(item.discount)}</Text>
                      </View>
                    ) : null}

                    {item.paymentMethod === "cash" ? (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>Change Due</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.secondary, fontWeight: "600" }}>
                          {getCurrency(item.changeAmount)}
                        </Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
                      <IconButton
                        icon="share-variant-outline"
                        size={18}
                        mode="contained-tonal"
                        onPress={() => handleShareReceipt(item)}
                      />
                    </View>
                  </View>
                ) : null}
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="receipt" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={{ marginTop: 12, fontSize: 15, color: theme.colors.onSurfaceVariant }}>
              {translate(language, "noSalesYet")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  kpiRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    elevation: 2,
  },
  kpiCard: { flex: 1, alignItems: "center" },
  kpiLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  kpiValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: { height: 32 },
  listContent: { padding: 12, paddingBottom: 40 },
  saleCard: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptNumber: { fontWeight: "800", fontSize: 15 },
  saleAmount: { fontWeight: "800", fontSize: 16, marginBottom: 2 },
  expandedSection: { paddingTop: 4 },
  itemLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
});

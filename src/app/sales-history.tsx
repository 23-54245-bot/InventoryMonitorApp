import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { Redirect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import {
    Appbar,
    Button,
    Card,
    Chip,
    Divider,
    IconButton,
    Surface,
    Text,
    useTheme,
} from "react-native-paper";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { getCurrency, type SaleTransaction } from "../data/freshmart";
import { translate } from "../lib/i18n";
import { createThermalReceiptHtml, getThermalReceiptPrintSize } from "../lib/receipt";

export default function SalesHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isReady } = useAuth();
  const { sales, loadSales, state } = useStore();
  const language = state.user.preferences.language ?? "English";

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [filterPayment, setFilterPayment] = useState<string>("All");

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

  const getReceiptHtml = (sale: SaleTransaction) => {
    return createThermalReceiptHtml(sale, {
      name: state.user.storeName,
      address: state.user.address,
      phone: state.user.phone,
      email: state.user.storeEmail,
    }, getCurrency);
  };

  const handlePrintReceipt = async (sale: SaleTransaction) => {
    try {
      const html = getReceiptHtml(sale);
      await Print.printAsync({ html, ...getThermalReceiptPrintSize(sale) });
    } catch {
      // Ignore print failures silently; they are non-blocking for the sales flow.
    }
  };

  const handleDownloadReceipt = async (sale: SaleTransaction) => {
    try {
      const html = getReceiptHtml(sale);
      if (Platform.OS === "web") {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${sale.receiptNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { uri } = await Print.printToFileAsync({ html, ...getThermalReceiptPrintSize(sale), base64: false });
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Download Receipt ${sale.receiptNumber}`,
        });
      }
    } catch {
      // Ignore download failures silently; the receipt action remains optional.
    }
  };

  const handleShareReceipt = async (sale: SaleTransaction) => {
    try {
      const html = getReceiptHtml(sale);
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: `Receipt ${sale.receiptNumber}`,
            text: `Receipt ${sale.receiptNumber} - Total: ${getCurrency(sale.totalAmount)}`,
          });
        } else {
          await Print.printAsync({ html });
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, ...getThermalReceiptPrintSize(sale), base64: false });
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Share Receipt ${sale.receiptNumber}`,
        });
      }
    } catch {
      // Ignore share failures silently; receipt sharing is best-effort.
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleRefreshSales = async () => {
    try {
      await loadSales();
    } catch (error) {
      Alert.alert(
        "Sales could not be refreshed",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  if (!isReady) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={handleBack} />
        <Appbar.Content
          title={translate(language, "salesHistory")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton icon="refresh" iconColor={theme.colors.onPrimary} onPress={() => void handleRefreshSales()} />
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
        {(["All", "cash", "card", "e_wallet", "credit", "split"] as const).map((m) => {
          const isSelected = filterPayment === m;
          const label = m === "All"
            ? translate(language, "allSales")
            : m === "cash"
              ? translate(language, "cashSaleFilter")
              : m === "card"
                ? translate(language, "cardFilter")
                : m === "e_wallet"
                  ? translate(language, "eWalletFilter")
                  : m === "credit"
                    ? translate(language, "creditFilter")
                    : translate(language, "splitPayment");
          return (
            <Chip
              key={m}
              compact
              selected={isSelected}
              onPress={() => setFilterPayment(m)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                  borderWidth: 1,
                },
              ]}
              textStyle={{
                color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface,
                fontWeight: isSelected ? "700" : "500",
                fontSize: 13,
              }}
              selectedColor={theme.colors.onPrimary}
            >
              {label}
            </Chip>
          );
        })}
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={styles.paymentBadge}>
                          <Text style={styles.paymentBadgeText}>
                            {item.paymentMethod === "e_wallet" ? "E-WALLET" : item.paymentMethod.replace("_", " ").toUpperCase()}
                          </Text>
                        </View>
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
                        <Text numberOfLines={2} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0, marginRight: 8, fontSize: 13, color: theme.colors.onSurface }}>
                          {prod.productName} <Text style={{ color: theme.colors.onSurfaceVariant }}>x{prod.quantity}</Text>
                        </Text>
                        <Text style={{ fontWeight: "600", fontSize: 13, color: theme.colors.onSurface, flexShrink: 0 }}>
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

                    {/* TOTAL row */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.onSurface }}>TOTAL</Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.primary }}>{getCurrency(item.totalAmount)}</Text>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.receiptActionRow}>
                      <Button
                        mode="contained"
                        icon="printer"
                        buttonColor={theme.colors.primary}
                        textColor={theme.colors.onPrimary}
                        onPress={() => handlePrintReceipt(item)}
                        style={styles.receiptBtn}
                        contentStyle={styles.receiptBtnContent}
                        labelStyle={styles.receiptBtnLabel}
                      >
                        Print
                      </Button>
                      <Button
                        mode="outlined"
                        icon="download"
                        textColor={theme.colors.primary}
                        onPress={() => handleDownloadReceipt(item)}
                        style={[styles.receiptBtn, { borderColor: theme.colors.outline }]}
                        contentStyle={styles.receiptBtnContent}
                        labelStyle={styles.receiptBtnLabel}
                      >
                        Download
                      </Button>
                      <Button
                        mode="contained-tonal"
                        icon="share-variant"
                        textColor={theme.colors.onSurface}
                        onPress={() => handleShareReceipt(item)}
                        style={styles.receiptBtn}
                        contentStyle={styles.receiptBtnContent}
                        labelStyle={styles.receiptBtnLabel}
                      >
                        Share
                      </Button>
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
  filterChip: { borderRadius: 8 },
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
    minWidth: 0,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  receiptActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  receiptBtn: {
    flex: 1,
    borderRadius: 10,
  },
  receiptBtnContent: {
    height: 38,
  },
  receiptBtnLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.3,
  },
});

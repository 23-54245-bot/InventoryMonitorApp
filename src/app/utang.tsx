import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { Redirect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Appbar,
  Button,
  Chip,
  Divider,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import { CreditCustomerModal } from "../components/credit/CreditCustomerModal";
import { CreditPaymentModal } from "../components/credit/CreditPaymentModal";
import { CreditRecordModal } from "../components/credit/CreditRecordModal";
import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import {
  getCurrency,
  type Customer,
  type CustomerRiskStatus,
  type Debt,
  type DebtPayment,
} from "../data/freshmart";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { translate } from "../lib/i18n";

type FilterTab =
  | "all"
  | "unpaid"
  | "overdue"
  | "settled"
  | "customers"
  | "ledger";
type LedgerEntry = {
  id: string;
  kind: "credit" | "payment";
  customerName: string;
  createdAt: string;
  amount: number;
  description?: string;
  paymentMethod?: DebtPayment["paymentMethod"];
  referenceNumber?: string;
  recordedBy?: string;
};

export default function UtangScreen() {
  const router = useRouter();
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint !== "mobile";
  const { session, isReady } = useAuth();
  const {
    state,
    debts,
    debtPayments,
    customers,
    addCustomer,
    updateCustomer,
    addDebt,
    getCustomerOutstandingDebt,
    recordDebtPayment,
  } = useStore();
  const language = state.user.preferences?.language ?? "English";

  const [activeTab, setActiveTab] = useState<FilterTab>("unpaid");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Recording Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // New Credit / Utang Modal State
  const [newUtangModalVisible, setNewUtangModalVisible] = useState(false);

  // Customer Management / Edit Modal State
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // KPI calculations
  const totalReceivables = useMemo(() => {
    return debts
      .filter((d) => d.status !== "paid")
      .reduce((sum, d) => sum + d.balance, 0);
  }, [debts]);

  const unpaidCount = useMemo(() => {
    return debts.filter((d) => d.status !== "paid").length;
  }, [debts]);

  const todayStr = new Date().toISOString().split("T")[0];

  const overdueCount = useMemo(() => {
    return debts.filter(
      (d) => d.status !== "paid" && d.dueDate && d.dueDate < todayStr,
    ).length;
  }, [debts, todayStr]);

  const settledCount = useMemo(() => {
    return debts.filter((d) => d.status === "paid").length;
  }, [debts]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return debts.filter((debt) => {
      // Tab filter
      if (activeTab === "unpaid" && debt.status === "paid") return false;
      if (activeTab === "settled" && debt.status !== "paid") return false;
      if (
        activeTab === "overdue" &&
        (debt.status === "paid" || !debt.dueDate || debt.dueDate >= todayStr)
      ) {
        return false;
      }

      // Query filter
      if (!q) return true;
      const matchName = debt.customerName.toLowerCase().includes(q);
      const matchPhone = debt.customerPhone
        ? debt.customerPhone.includes(q)
        : false;
      const matchNote = debt.note ? debt.note.toLowerCase().includes(q) : false;
      const matchItems = debt.itemsSummary
        ? debt.itemsSummary.toLowerCase().includes(q)
        : false;
      return matchName || matchPhone || matchNote || matchItems;
    });
  }, [debts, activeTab, searchQuery, todayStr]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [customers, searchQuery]);

  const ledgerEntries = useMemo(() => {
    const entries: LedgerEntry[] = [
      ...debts.map((debt) => ({
        id: `credit-${debt.id}`,
        kind: "credit" as const,
        customerName: debt.customerName,
        createdAt: debt.createdAt,
        amount: debt.amount,
        description: debt.itemsSummary || debt.note,
      })),
      ...debtPayments.map((payment) => {
        const debt = debts.find((item) => item.id === payment.debtId);
        const customer = customers.find(
          (item) => item.id === payment.customerId,
        );
        return {
          id: `payment-${payment.id}`,
          kind: "payment" as const,
          customerName:
            debt?.customerName ??
            customer?.name ??
            translate(language, "unknownCustomer"),
          createdAt: payment.createdAt,
          amount: payment.amount,
          description: payment.note,
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          recordedBy: payment.recordedBy,
        };
      }),
    ];
    const query = searchQuery.trim().toLowerCase();
    return entries
      .filter(
        (entry) =>
          !query ||
          [
            entry.customerName,
            entry.description,
            entry.paymentMethod,
            entry.referenceNumber,
            entry.recordedBy,
          ].some((value) => value?.toLowerCase().includes(query)),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  }, [debts, debtPayments, customers, searchQuery, language]);

  // Open Payment modal
  const handleOpenPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentModalVisible(true);
  };

  // Send friendly reminder via SMS or Share
  const handleSendReminder = async (debt: Debt) => {
    const storeName = state.user.storeName || "StockTrack Store";
    const storeNumber =
      state.user.storeQRs?.gcashNumber || state.user.phone || "";
    const paymentInfo = storeNumber ? ` (GCash/Maya: ${storeNumber})` : "";
    const dueDateFormatted = debt.dueDate
      ? `sa ${debt.dueDate}`
      : "sa lalong madaling panahon";

    const reminderMessage =
      `Magandang araw po ${debt.customerName}!\n\n` +
      `Magalang na paalala lang po mula sa ${storeName}: may natitira po kayong utang/balanse na ${getCurrency(debt.balance)} na nakatakdang bayaran ${dueDateFormatted}.${paymentInfo}\n\n` +
      `Maaari po itong bayaran sa tindahan o via digital payment. Maraming salamat po sa inyong tiwala at suporta! 🙏`;

    if (debt.customerPhone) {
      const smsUrl = `sms:${debt.customerPhone}?body=${encodeURIComponent(reminderMessage)}`;
      const canOpen = await Linking.canOpenURL(smsUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        return;
      }
    }

    // Fallback to Share sheet
    await Share.share({
      message: reminderMessage,
      title: `Paalala sa Utang - ${storeName}`,
    });
  };

  // Open customer edit
  const handleOpenCustomerEdit = (cust: Customer) => {
    if (session?.role === "Staff") {
      Alert.alert(
        translate(language, "permissionDeniedTitle"),
        translate(language, "staffEditLimitDenied"),
      );
      return;
    }
    setSelectedCustomer(cust);
    setCustomerModalVisible(true);
  };

  // Export ledger to PDF
  const handleExportLedger = async () => {
    const storeName = state.user.storeName || "StockTrack Store";
    const dateStr = new Date().toLocaleDateString();

    const rowsHtml = debts
      .map(
        (d) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #ddd;">${d.customerName}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${d.customerPhone || "-"}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${getCurrency(d.amount)}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${getCurrency(d.balance)}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${d.status.toUpperCase()}</td>
        <td style="padding: 6px; border: 1px solid #ddd;">${d.dueDate || "-"}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background: #2856D7; color: white; padding: 8px; border: 1px solid #ddd; text-align: left; }
            .header { text-align: center; margin-bottom: 20px; }
            .totals { margin-top: 20px; font-size: 14px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${storeName}</h2>
            <h3>Customer Credit Ledger Report</h3>
            <p>Generated: ${dateStr}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th style="text-align: right;">Credit Issued</th>
                <th style="text-align: right;">Balance</th>
                <th style="text-align: center;">Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="totals">
            <p>Total Collectible Receivables: ${getCurrency(totalReceivables)}</p>
            <p>Unpaid Accounts: ${unpaidCount}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Credit Ledger",
      });
    } catch {
      Alert.alert("Export Error", "Failed to generate printable PDF ledger.");
    }
  };

  const getRiskChip = (status: CustomerRiskStatus) => {
    switch (status) {
      case "good":
        return {
          label: translate(language, "standingGood"),
          bg: "#DCFCE7",
          text: "#166534",
        };
      case "warning":
        return {
          label: translate(language, "statusWarning"),
          bg: "#FEF3C7",
          text: "#92400E",
        };
      case "blacklisted":
        return {
          label: translate(language, "statusBlacklisted"),
          bg: "#FEE2E2",
          text: "#991B1B",
        };
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  if (!isReady) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content
          title={translate(language, "utangTitle") || "Credit Tracker"}
          subtitle={
            translate(language, "utangSubtitle") ||
            "Customer Credit & Receivables"
          }
          titleStyle={{ fontWeight: "700" }}
        />
        <Appbar.Action icon="download-outline" onPress={handleExportLedger} />
        <Appbar.Action
          icon="account-plus-outline"
          onPress={() => setNewUtangModalVisible(true)}
        />
      </Appbar.Header>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <Surface
          style={[styles.kpiCard, { backgroundColor: "#EEF2FF" }]}
          elevation={1}
        >
          <Text style={styles.kpiLabel}>
            {translate(language, "collectibleReceivables")}
          </Text>
          <Text style={[styles.kpiValue, { color: "#2563EB" }]}>
            {getCurrency(totalReceivables)}
          </Text>
        </Surface>
        <Surface
          style={[styles.kpiCard, { backgroundColor: "#FEF2F2" }]}
          elevation={1}
        >
          <Text style={styles.kpiLabel}>
            {translate(language, "overdueTab")}
          </Text>
          <Text style={[styles.kpiValue, { color: "#DC2626" }]}>
            {overdueCount}
          </Text>
        </Surface>
        <Surface
          style={[styles.kpiCard, { backgroundColor: "#F0FDF4" }]}
          elevation={1}
        >
          <Text style={styles.kpiLabel}>
            {translate(language, "settledTab")}
          </Text>
          <Text style={[styles.kpiValue, { color: "#16A34A" }]}>
            {settledCount}
          </Text>
        </Surface>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={[
            styles.searchInput,
            { backgroundColor: theme.colors.surface },
          ]}
          placeholder={translate(language, "searchUtangPlaceholder")}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <IconButton
            icon="close-circle"
            size={18}
            onPress={() => setSearchQuery("")}
            style={styles.clearSearch}
          />
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsScroll}
      >
        <Chip
          selected={activeTab === "unpaid"}
          onPress={() => setActiveTab("unpaid")}
          style={[
            styles.tabChip,
            activeTab === "unpaid" && { backgroundColor: theme.colors.primary },
          ]}
          textStyle={{
            color: activeTab === "unpaid" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "unpaidTab")} ({unpaidCount})
        </Chip>
        <Chip
          selected={activeTab === "overdue"}
          onPress={() => setActiveTab("overdue")}
          style={[
            styles.tabChip,
            activeTab === "overdue" && { backgroundColor: "#DC2626" },
          ]}
          textStyle={{
            color: activeTab === "overdue" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "overdueTab")} ({overdueCount})
        </Chip>
        <Chip
          selected={activeTab === "settled"}
          onPress={() => setActiveTab("settled")}
          style={[
            styles.tabChip,
            activeTab === "settled" && { backgroundColor: "#16A34A" },
          ]}
          textStyle={{
            color: activeTab === "settled" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "settledTab")} ({settledCount})
        </Chip>
        <Chip
          selected={activeTab === "all"}
          onPress={() => setActiveTab("all")}
          style={[
            styles.tabChip,
            activeTab === "all" && { backgroundColor: theme.colors.primary },
          ]}
          textStyle={{
            color: activeTab === "all" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "allRecordsTab")} ({debts.length})
        </Chip>
        <Chip
          selected={activeTab === "ledger"}
          onPress={() => setActiveTab("ledger")}
          style={[
            styles.tabChip,
            activeTab === "ledger" && { backgroundColor: theme.colors.primary },
          ]}
          textStyle={{
            color: activeTab === "ledger" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "creditLedgerTab")} ({ledgerEntries.length})
        </Chip>
        <Chip
          selected={activeTab === "customers"}
          onPress={() => setActiveTab("customers")}
          style={[
            styles.tabChip,
            activeTab === "customers" && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          textStyle={{
            color: activeTab === "customers" ? "#FFF" : theme.colors.onSurface,
          }}
        >
          {translate(language, "customersTab")} ({customers.length})
        </Chip>
      </ScrollView>

      {/* Content List */}
      {activeTab === "customers" ? (
        <FlatList
          data={filteredCustomers}
          style={styles.list}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const risk = getRiskChip(item.riskStatus);
            const outstandingDebt = getCustomerOutstandingDebt(item.id);
            return (
              <Surface style={styles.card} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle}>{item.name}</Text>
                    <Text style={styles.customerPhone}>
                      📞 {item.phone || translate(language, "notProvided")}
                    </Text>
                  </View>
                  <View
                    style={[styles.riskBadge, { backgroundColor: risk.bg }]}
                  >
                    <Text style={[styles.riskText, { color: risk.text }]}>
                      {risk.label}
                    </Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.customerStatsRow}>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>
                      {translate(language, "currentDebtLabel")}
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        { color: outstandingDebt > 0 ? "#DC2626" : "#16A34A" },
                      ]}
                    >
                      {getCurrency(outstandingDebt)}
                    </Text>
                  </View>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>
                      {translate(language, "creditLimitLabel")}
                    </Text>
                    <Text style={styles.statValue}>
                      {getCurrency(item.creditLimit)}
                    </Text>
                  </View>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>
                      {translate(language, "Loyalty Points") || "Loyalty Pts"}
                    </Text>
                    <Text style={[styles.statValue, { color: "#7C3AED" }]}>
                      ⭐ {item.loyaltyPoints}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActionRow}>
                  <Button
                    mode="outlined"
                    compact
                    icon="account-edit-outline"
                    onPress={() => handleOpenCustomerEdit(item)}
                  >
                    {translate(language, "editStanding")}
                  </Button>
                </View>
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={48}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {translate(language, "noCustomersFound")}
              </Text>
            </View>
          }
        />
      ) : activeTab === "ledger" ? (
        <FlatList
          data={ledgerEntries}
          style={styles.list}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPayment = item.kind === "payment";
            return (
              <Surface style={styles.card} elevation={1}>
                <View style={styles.ledgerHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle}>
                      {item.customerName}
                    </Text>
                    <Text style={styles.customerPhone}>
                      {translate(
                        language,
                        isPayment ? "ledgerPaymentLabel" : "ledgerCreditLabel",
                      )}{" "}
                      · {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      { color: isPayment ? "#15803D" : "#B91C1C" },
                    ]}
                  >
                    {isPayment ? "-" : "+"}
                    {getCurrency(item.amount)}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={styles.itemsSummaryText}>
                    {item.description}
                  </Text>
                ) : null}
                {isPayment ? (
                  <Text style={styles.customerPhone}>
                    {translate(language, "paymentMethodLabel")}:{" "}
                    {item.paymentMethod?.toUpperCase()}
                    {item.referenceNumber
                      ? ` · ${translate(language, "paymentReference")}: ${item.referenceNumber}`
                      : ""}
                    {item.recordedBy ? ` · ${item.recordedBy}` : ""}
                  </Text>
                ) : null}
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="book-open-page-variant-outline"
                size={48}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {translate(language, "creditLedgerEmpty")}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredDebts}
          style={styles.list}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOverdue =
              item.status !== "paid" && item.dueDate && item.dueDate < todayStr;
            return (
              <Surface
                style={[styles.card, isOverdue && styles.overdueBorder]}
                elevation={1}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle}>
                      {item.customerName}
                    </Text>
                    <Text style={styles.customerPhone}>
                      📞{" "}
                      {item.customerPhone || translate(language, "notProvided")}{" "}
                      · {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === "paid"
                            ? "#DCFCE7"
                            : isOverdue
                              ? "#FEE2E2"
                              : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            item.status === "paid"
                              ? "#166534"
                              : isOverdue
                                ? "#991B1B"
                                : "#92400E",
                        },
                      ]}
                    >
                      {item.status === "paid"
                        ? translate(language, "statusPaid")
                        : isOverdue
                          ? translate(language, "statusOverdue")
                          : translate(language, "statusUnpaid")}
                    </Text>
                  </View>
                </View>

                {item.itemsSummary ? (
                  <Text style={styles.itemsSummaryText} numberOfLines={2}>
                    📦 {item.itemsSummary}
                  </Text>
                ) : null}

                <Divider style={{ marginVertical: 10 }} />

                <View style={styles.amountBreakdown}>
                  <View>
                    <Text style={styles.balanceLabel}>
                      {translate(language, "balanceDueLabel")}
                    </Text>
                    <Text
                      style={[
                        styles.balanceValue,
                        { color: item.balance > 0 ? "#DC2626" : "#16A34A" },
                      ]}
                    >
                      {getCurrency(item.balance)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.statLabel}>
                      {translate(language, "originalLabel")}:{" "}
                      {getCurrency(item.amount)}
                    </Text>
                    {item.dueDate ? (
                      <Text
                        style={[
                          styles.dueDateText,
                          isOverdue && { color: "#DC2626", fontWeight: "700" },
                        ]}
                      >
                        {translate(language, "dueDateLabel")}: {item.dueDate}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.cardActionRow}>
                  <Button
                    mode="outlined"
                    compact
                    icon="message-text-outline"
                    onPress={() => handleSendReminder(item)}
                    style={{ marginRight: 8 }}
                  >
                    {translate(language, "smsReminder")}
                  </Button>
                  {item.status !== "paid" ? (
                    <Button
                      mode="contained"
                      compact
                      icon="cash-multiple"
                      onPress={() => handleOpenPayment(item)}
                    >
                      {translate(language, "payButton")}
                    </Button>
                  ) : null}
                </View>
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="book-open-page-variant-outline"
                size={48}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {translate(language, "noDebtsInView")}
              </Text>
            </View>
          }
        />
      )}

      {/* Record Payment Modal */}
      <CreditPaymentModal
        key={
          paymentModalVisible && selectedDebt
            ? `payment-open:${selectedDebt.id}`
            : "payment-closed"
        }
        visible={paymentModalVisible}
        debt={selectedDebt}
        isDesktop={isDesktop}
        language={language}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={recordDebtPayment}
        getCurrency={getCurrency}
      />

      {/* New Credit / Utang Modal */}
      <CreditRecordModal
        key={newUtangModalVisible ? "record-open" : "record-closed"}
        visible={newUtangModalVisible}
        customers={customers}
        getCustomerOutstandingDebt={getCustomerOutstandingDebt}
        isDesktop={isDesktop}
        language={language}
        onClose={() => setNewUtangModalVisible(false)}
        onCreated={() => {
          setActiveTab("unpaid");
          setSearchQuery("");
        }}
        addCustomer={addCustomer}
        addDebt={addDebt}
        getCurrency={getCurrency}
      />

      {/* Customer Edit Modal */}
      <CreditCustomerModal
        key={
          customerModalVisible && selectedCustomer
            ? `customer-open:${selectedCustomer.id}`
            : "customer-closed"
        }
        visible={customerModalVisible}
        customer={selectedCustomer}
        isDesktop={isDesktop}
        language={language}
        onClose={() => setCustomerModalVisible(false)}
        onSave={async (id, updates) => {
          await updateCustomer(id, updates);
        }}
        getCurrency={getCurrency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  kpiContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  searchSection: {
    paddingHorizontal: 16,
    position: "relative",
    justifyContent: "center",
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1E293B",
  },
  clearSearch: {
    position: "absolute",
    right: 20,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabsScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabChip: {
    height: 34,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 4,
    gap: 12,
    justifyContent: "flex-start",
  },
  list: { flex: 1 },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  overdueBorder: {
    borderColor: "#FCA5A5",
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  customerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  customerPhone: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  itemsSummaryText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
  },
  amountBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  dueDateText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: "700",
  },
  customerStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 4,
  },
  customerStatCol: {
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94A3B8",
  },
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
    boxShadow: "0px 4px 20px rgba(0,0,0,0.15)",
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
  },
  customerSelectChip: {
    marginRight: 6,
  },
});

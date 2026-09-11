import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    TextInput,
    View
} from "react-native";
import {
    Appbar,
    Button,
    Chip,
    Divider,
    IconButton,
    Surface,
    Text,
    useTheme
} from "react-native-paper";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import {
    getCurrency,
    type Customer,
    type CustomerRiskStatus,
    type Debt
} from "../data/freshmart";
import { translate } from "../lib/i18n";

type FilterTab = "all" | "unpaid" | "overdue" | "settled" | "customers";

export default function UtangScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session } = useAuth();
  const { state, debts, customers, addCustomer, updateCustomer, addDebt, recordDebtPayment } = useStore();
  const language = state.user.preferences?.language ?? "English";

  const [activeTab, setActiveTab] = useState<FilterTab>("unpaid");
  const [searchQuery, setSearchQuery] = useState("");

  // Payment Recording Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "maya">("cash");
  const [paymentRefNumber, setPaymentRefNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // New Credit / Utang Modal State
  const [newUtangModalVisible, setNewUtangModalVisible] = useState(false);
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

  // Customer Management / Edit Modal State
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editLimitStr, setEditLimitStr] = useState("");
  const [editRiskStatus, setEditRiskStatus] = useState<CustomerRiskStatus>("good");

  // KPI calculations
  const totalReceivables = useMemo(() => {
    return debts.filter((d) => d.status !== "paid").reduce((sum, d) => sum + d.balance, 0);
  }, [debts]);

  const unpaidCount = useMemo(() => {
    return debts.filter((d) => d.status !== "paid").length;
  }, [debts]);

  const todayStr = new Date().toISOString().split("T")[0];

  const overdueCount = useMemo(() => {
    return debts.filter((d) => d.status !== "paid" && d.dueDate && d.dueDate < todayStr).length;
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
      if (activeTab === "overdue" && (debt.status === "paid" || !debt.dueDate || debt.dueDate >= todayStr)) {
        return false;
      }

      // Query filter
      if (!q) return true;
      const matchName = debt.customerName.toLowerCase().includes(q);
      const matchPhone = debt.customerPhone ? debt.customerPhone.includes(q) : false;
      const matchNote = debt.note ? debt.note.toLowerCase().includes(q) : false;
      const matchItems = debt.itemsSummary ? debt.itemsSummary.toLowerCase().includes(q) : false;
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

  // Open Payment modal
  const handleOpenPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmountStr(String(debt.balance));
    setPaymentMethod("cash");
    setPaymentRefNumber("");
    setPaymentNote("");
    setPaymentModalVisible(true);
  };

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!selectedDebt) return;
    const amount = Number(paymentAmountStr);
    if (!amount || amount <= 0) {
      Alert.alert(translate(language, "warningLabel") || "Warning", "Please enter a valid payment amount.");
      return;
    }
    if (amount > selectedDebt.balance) {
      Alert.alert(translate(language, "warningLabel") || "Warning", "Payment amount cannot exceed balance due.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const success = await recordDebtPayment({
        debtId: selectedDebt.id,
        customerId: selectedDebt.customerId,
        amount,
        paymentMethod,
        referenceNumber: paymentRefNumber.trim() || undefined,
        note: paymentNote.trim() || undefined,
      });

      if (success) {
        setPaymentModalVisible(false);
        Alert.alert(
          translate(language, "paymentSuccess") || "Payment Recorded",
          `Recorded ₱${amount.toFixed(2)} payment for ${selectedDebt.customerName}. Remaining: ₱${Math.max(0, selectedDebt.balance - amount).toFixed(2)}`
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to record payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Send friendly reminder via SMS or Share
  const handleSendReminder = async (debt: Debt) => {
    const storeName = state.user.storeName || "StockTrack Store";
    const storeNumber = state.user.storeQRs?.gcashNumber || state.user.phone || "";
    const paymentInfo = storeNumber ? ` (GCash/Maya: ${storeNumber})` : "";
    const dueDateFormatted = debt.dueDate ? `sa ${debt.dueDate}` : "sa lalong madaling panahon";

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

  // Create new utang/credit record
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
        // Credit limit check
        if (existing.totalDebt + amount > existing.creditLimit) {
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Credit Limit Exceeded",
              `${existing.name}'s credit limit is ${getCurrency(existing.creditLimit)}. Current debt is ${getCurrency(existing.totalDebt)}. Adding ${getCurrency(amount)} will exceed the limit. Proceed anyway?`,
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

    setNewUtangModalVisible(false);
    setSelectedCustomerId("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewUtangAmountStr("");
    setNewUtangNote("");
    Alert.alert("Success", `Recorded utang of ${getCurrency(amount)} for ${customerName}.`);
  };

  // Open customer edit
  const handleOpenCustomerEdit = (cust: Customer) => {
    if (session?.role === "Staff") {
      Alert.alert("Permission Denied", "Staff members cannot edit customer credit limits or credit standings. Only Store Owner or Manager can perform this action.");
      return;
    }
    setSelectedCustomer(cust);
    setEditLimitStr(String(cust.creditLimit));
    setEditRiskStatus(cust.riskStatus);
    setCustomerModalVisible(true);
  };

  // Save customer edits
  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;
    const limit = Number(editLimitStr) || 1000;
    await updateCustomer(selectedCustomer.id, {
      creditLimit: limit,
      riskStatus: editRiskStatus,
    });
    setCustomerModalVisible(false);
    Alert.alert("Updated", `Customer ${selectedCustomer.name} profile updated.`);
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
    `
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
            <h3>Customer Credit (Utang) Ledger Report</h3>
            <p>Generated: ${dateStr}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th style="text-align: right;">Total Utang</th>
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
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share Utang Ledger" });
    } catch {
      Alert.alert("Export Error", "Failed to generate printable PDF ledger.");
    }
  };

  const getRiskChip = (status: CustomerRiskStatus) => {
    switch (status) {
      case "good":
        return { label: "Good Standing", bg: "#DCFCE7", text: "#166534" };
      case "warning":
        return { label: "Warning", bg: "#FEF3C7", text: "#92400E" };
      case "blacklisted":
        return { label: "Blacklisted", bg: "#FEE2E2", text: "#991B1B" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Appbar */}
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={translate(language, "utangTitle") || "Utang Tracker"}
          subtitle={translate(language, "utangSubtitle") || "Customer Credit & Receivables"}
          titleStyle={{ fontWeight: "700" }}
        />
        <Appbar.Action icon="download-outline" onPress={handleExportLedger} />
        <Appbar.Action icon="account-plus-outline" onPress={() => setNewUtangModalVisible(true)} />
      </Appbar.Header>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <Surface style={[styles.kpiCard, { backgroundColor: "#EEF2FF" }]} elevation={1}>
          <Text style={styles.kpiLabel}>Collectible Receivables</Text>
          <Text style={[styles.kpiValue, { color: "#2563EB" }]}>{getCurrency(totalReceivables)}</Text>
        </Surface>
        <Surface style={[styles.kpiCard, { backgroundColor: "#FEF2F2" }]} elevation={1}>
          <Text style={styles.kpiLabel}>Overdue</Text>
          <Text style={[styles.kpiValue, { color: "#DC2626" }]}>{overdueCount}</Text>
        </Surface>
        <Surface style={[styles.kpiCard, { backgroundColor: "#F0FDF4" }]} elevation={1}>
          <Text style={styles.kpiLabel}>Settled</Text>
          <Text style={[styles.kpiValue, { color: "#16A34A" }]}>{settledCount}</Text>
        </Surface>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.colors.surface }]}
          placeholder="Search customer name, phone, or items..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <IconButton icon="close-circle" size={18} onPress={() => setSearchQuery("")} style={styles.clearSearch} />
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        <Chip
          selected={activeTab === "unpaid"}
          onPress={() => setActiveTab("unpaid")}
          style={[styles.tabChip, activeTab === "unpaid" && { backgroundColor: theme.colors.primary }]}
          textStyle={{ color: activeTab === "unpaid" ? "#FFF" : theme.colors.onSurface }}
        >
          Unpaid ({unpaidCount})
        </Chip>
        <Chip
          selected={activeTab === "overdue"}
          onPress={() => setActiveTab("overdue")}
          style={[styles.tabChip, activeTab === "overdue" && { backgroundColor: "#DC2626" }]}
          textStyle={{ color: activeTab === "overdue" ? "#FFF" : theme.colors.onSurface }}
        >
          Overdue ({overdueCount})
        </Chip>
        <Chip
          selected={activeTab === "settled"}
          onPress={() => setActiveTab("settled")}
          style={[styles.tabChip, activeTab === "settled" && { backgroundColor: "#16A34A" }]}
          textStyle={{ color: activeTab === "settled" ? "#FFF" : theme.colors.onSurface }}
        >
          Settled ({settledCount})
        </Chip>
        <Chip
          selected={activeTab === "all"}
          onPress={() => setActiveTab("all")}
          style={[styles.tabChip, activeTab === "all" && { backgroundColor: theme.colors.primary }]}
          textStyle={{ color: activeTab === "all" ? "#FFF" : theme.colors.onSurface }}
        >
          All Records ({debts.length})
        </Chip>
        <Chip
          selected={activeTab === "customers"}
          onPress={() => setActiveTab("customers")}
          style={[styles.tabChip, activeTab === "customers" && { backgroundColor: theme.colors.primary }]}
          textStyle={{ color: activeTab === "customers" ? "#FFF" : theme.colors.onSurface }}
        >
          Customers ({customers.length})
        </Chip>
      </ScrollView>

      {/* Content List */}
      {activeTab === "customers" ? (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const risk = getRiskChip(item.riskStatus);
            return (
              <Surface style={styles.card} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle}>{item.name}</Text>
                    <Text style={styles.customerPhone}>📞 {item.phone || "No phone"}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.riskText, { color: risk.text }]}>{risk.label}</Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.customerStatsRow}>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>Current Debt</Text>
                    <Text style={[styles.statValue, { color: item.totalDebt > 0 ? "#DC2626" : "#16A34A" }]}>
                      {getCurrency(item.totalDebt)}
                    </Text>
                  </View>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>Credit Limit</Text>
                    <Text style={styles.statValue}>{getCurrency(item.creditLimit)}</Text>
                  </View>
                  <View style={styles.customerStatCol}>
                    <Text style={styles.statLabel}>Loyalty Pts</Text>
                    <Text style={[styles.statValue, { color: "#7C3AED" }]}>⭐ {item.loyaltyPoints}</Text>
                  </View>
                </View>
                <View style={styles.cardActionRow}>
                  <Button mode="outlined" compact icon="account-edit-outline" onPress={() => handleOpenCustomerEdit(item)}>
                    Edit Standing
                  </Button>
                </View>
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No customers found.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredDebts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOverdue = item.status !== "paid" && item.dueDate && item.dueDate < todayStr;
            return (
              <Surface style={[styles.card, isOverdue && styles.overdueBorder]} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerTitle}>{item.customerName}</Text>
                    <Text style={styles.customerPhone}>
                      📞 {item.customerPhone || "No contact"} · {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === "paid" ? "#DCFCE7" : isOverdue ? "#FEE2E2" : "#FEF3C7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            item.status === "paid" ? "#166534" : isOverdue ? "#991B1B" : "#92400E",
                        },
                      ]}
                    >
                      {item.status === "paid" ? "PAID" : isOverdue ? "OVERDUE" : "UNPAID"}
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
                    <Text style={styles.balanceLabel}>Balance Due</Text>
                    <Text style={[styles.balanceValue, { color: item.balance > 0 ? "#DC2626" : "#16A34A" }]}>
                      {getCurrency(item.balance)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.statLabel}>Original Utang: {getCurrency(item.amount)}</Text>
                    {item.dueDate ? (
                      <Text style={[styles.dueDateText, isOverdue && { color: "#DC2626", fontWeight: "700" }]}>
                        Due: {item.dueDate}
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
                    Paalala (SMS)
                  </Button>
                  {item.status !== "paid" ? (
                    <Button
                      mode="contained"
                      compact
                      icon="cash-multiple"
                      onPress={() => handleOpenPayment(item)}
                    >
                      Magbayad
                    </Button>
                  ) : null}
                </View>
              </Surface>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No debts found in this view.</Text>
            </View>
          }
        />
      )}

      {/* Record Payment Modal ("Magbayad ng Utang") */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Magbayad ng Utang</Text>
              <IconButton icon="close" size={20} onPress={() => setPaymentModalVisible(false)} />
            </View>

            {selectedDebt ? (
              <ScrollView>
                <Surface style={styles.debtSummaryBanner} elevation={0}>
                  <Text style={{ fontWeight: "700", fontSize: 16 }}>{selectedDebt.customerName}</Text>
                  <Text style={{ color: "#64748B", marginVertical: 2 }}>
                    Original: {getCurrency(selectedDebt.amount)} · Paid: {getCurrency(selectedDebt.amountPaid)}
                  </Text>
                  <Text style={{ fontWeight: "800", color: "#DC2626", fontSize: 18 }}>
                    Balance: {getCurrency(selectedDebt.balance)}
                  </Text>
                </Surface>

                <Text style={styles.inputLabel}>Halaga ng Bayad (₱)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  keyboardType="decimal-pad"
                  value={paymentAmountStr}
                  onChangeText={setPaymentAmountStr}
                  placeholder="0.00"
                />

                <View style={styles.quickChipsRow}>
                  <Chip compact onPress={() => setPaymentAmountStr(String(selectedDebt.balance))}>
                    Full Balance ({getCurrency(selectedDebt.balance)})
                  </Chip>
                  {selectedDebt.balance > 100 && (
                    <Chip compact onPress={() => setPaymentAmountStr(String(Math.floor(selectedDebt.balance / 2)))}>
                      Half ({getCurrency(Math.floor(selectedDebt.balance / 2))})
                    </Chip>
                  )}
                </View>

                <Text style={styles.inputLabel}>Paraan ng Pagbayad</Text>
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
                    <Text style={styles.inputLabel}>Reference Number / Ref No.</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="e.g. 100293847583"
                      value={paymentRefNumber}
                      onChangeText={setPaymentRefNumber}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Note (Opsyonal)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Additional remarks..."
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                />

                <Button
                  mode="contained"
                  onPress={handleSubmitPayment}
                  loading={isProcessingPayment}
                  style={{ marginTop: 16 }}
                >
                  Kumpirmahin ang Bayad
                </Button>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Utang / Credit Modal */}
      <Modal visible={newUtangModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Magtala ng Bagong Utang</Text>
              <IconButton icon="close" size={20} onPress={() => setNewUtangModalVisible(false)} />
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

      {/* Customer Edit Modal */}
      <Modal visible={customerModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Credit Standing & Limit</Text>
              <IconButton icon="close" size={20} onPress={() => setCustomerModalVisible(false)} />
            </View>

            {selectedCustomer ? (
              <ScrollView>
                <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>{selectedCustomer.name}</Text>
                <Text style={{ color: "#64748B", marginBottom: 14 }}>Phone: {selectedCustomer.phone}</Text>

                <Text style={styles.inputLabel}>Credit Limit (₱)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  keyboardType="numeric"
                  value={editLimitStr}
                  onChangeText={setEditLimitStr}
                />

                <Text style={styles.inputLabel}>Risk Status / Credit Standing</Text>
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
                  I-save ang Pagbabago
                </Button>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tabChip: {
    height: 34,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
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

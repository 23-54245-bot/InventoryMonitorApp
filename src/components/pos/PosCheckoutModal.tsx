import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Badge, Button, Chip, IconButton, Surface, Text, type MD3Theme } from "react-native-paper";

import type { Customer, PaymentMethod } from "../../data/freshmart";
import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

interface Props {
  visible: boolean;
  isDesktop: boolean;
  language: AppLanguage;
  theme: MD3Theme;
  cartSubtotal: number;
  cartGrandTotal: number;
  discountVal: number;
  discountStr: string;
  setDiscountStr: (v: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  amountTenderedStr: string;
  setAmountTenderedStr: (v: string) => void;
  changeDue: number;
  refNumber: string;
  setRefNumber: (v: string) => void;
  eWalletType: "gcash" | "maya";
  setEWalletType: (t: "gcash" | "maya") => void;
  splitCashStr: string;
  setSplitCashStr: (v: string) => void;
  splitOtherMethod: "e_wallet" | "credit";
  setSplitOtherMethod: (m: "e_wallet" | "credit") => void;
  creditDueDate: string;
  setCreditDueDate: (d: string) => void;
  customers: Customer[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  newCustName: string;
  setNewCustName: (n: string) => void;
  newCustPhone: string;
  setNewCustPhone: (p: string) => void;
  redeemPoints: number;
  setRedeemPoints: (pts: number) => void;
  isProcessing: boolean;
  storeQRs?: {
    gcashName?: string;
    gcashNumber?: string;
    gcashQrUri?: string;
    mayaName?: string;
    mayaNumber?: string;
    mayaQrUri?: string;
  };
  onClose: () => void;
  onCompleteSale: () => void;
  onNavigateToProfile: () => void;
  getCurrency: (val: number) => string;
}

export function PosCheckoutModal({
  visible,
  isDesktop,
  language,
  theme,
  cartSubtotal,
  cartGrandTotal,
  discountVal,
  discountStr,
  setDiscountStr,
  paymentMethod,
  setPaymentMethod,
  amountTenderedStr,
  setAmountTenderedStr,
  changeDue,
  refNumber,
  setRefNumber,
  eWalletType,
  setEWalletType,
  splitCashStr,
  setSplitCashStr,
  splitOtherMethod,
  setSplitOtherMethod,
  creditDueDate,
  setCreditDueDate,
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  newCustName,
  setNewCustName,
  newCustPhone,
  setNewCustPhone,
  redeemPoints,
  setRedeemPoints,
  isProcessing,
  storeQRs,
  onClose,
  onCompleteSale,
  onNavigateToProfile,
  getCurrency,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View
          style={[
            styles.checkoutModalCard,
            { backgroundColor: theme.colors.surface },
            isDesktop && styles.desktopModalCard,
          ]}
        >
          <View style={styles.cartModalHeader}>
            <Text style={[styles.cartModalTitle, { color: theme.colors.onSurface }]}>
              {translate(language, "paymentMethod")}
            </Text>
            <IconButton icon="close" size={20} onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Payment Methods */}
            <View style={styles.paymentMethodRow}>
              {([
                { key: "cash", label: translate(language, "cash"), icon: "cash" },
                { key: "e_wallet", label: "GCash / Maya", icon: "cellphone-check" },
                { key: "credit", label: translate(language, "utang") || "Credit", icon: "book-account-outline" },
                { key: "split", label: translate(language, "splitPayment") || "Split", icon: "call-split" },
                { key: "card", label: translate(language, "card"), icon: "credit-card-outline" },
                { key: "other", label: translate(language, "other"), icon: "dots-horizontal-circle-outline" },
              ] as const).map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setPaymentMethod(m.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Payment method: ${m.label}`}
                  accessibilityState={{ selected: paymentMethod === m.key }}
                  style={[
                    styles.paymentMethodCard,
                    {
                      backgroundColor:
                        paymentMethod === m.key ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                      borderColor: paymentMethod === m.key ? theme.colors.primary : "transparent",
                    },
                  ]}
                >
                  <View style={styles.paymentMethodIconWrap}>
                    <MaterialCommunityIcons
                      name={m.icon as any}
                      size={26}
                      color={paymentMethod === m.key ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    {paymentMethod === m.key ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.primary}
                        style={styles.paymentMethodCheck}
                      />
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.paymentMethodText,
                      { color: paymentMethod === m.key ? theme.colors.primary : theme.colors.onSurface },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Discount field */}
            <View style={styles.formRow}>
              <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                {translate(language, "discountLabel")} (₱)
              </Text>
              <TextInput
                keyboardType="numeric"
                value={discountStr}
                onChangeText={setDiscountStr}
                style={[
                  styles.textInput,
                  { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                ]}
              />
            </View>

            {/* Customer Selector / Loyalty Points Redemption */}
            <View
              style={[
                styles.formRow,
                { backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: 10, marginBottom: 14 },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface, fontWeight: "700", marginBottom: 0 }]}>
                  Customer / Loyalty Points
                </Text>
                {selectedCustomerId ? (
                  <Pressable onPress={() => { setSelectedCustomerId(""); setRedeemPoints(0); }}>
                    <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: "600" }}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <Chip
                  selected={selectedCustomerId === ""}
                  onPress={() => { setSelectedCustomerId(""); setRedeemPoints(0); }}
                  style={{ marginRight: 6 }}
                >
                  Walk-in Customer
                </Chip>
                {customers.map((c) => (
                  <Chip
                    key={c.id}
                    selected={selectedCustomerId === c.id}
                    onPress={() => setSelectedCustomerId(c.id)}
                    style={{ marginRight: 6 }}
                  >
                    {c.name} {c.loyaltyPoints > 0 ? `(⭐${c.loyaltyPoints} pts)` : ""}
                  </Chip>
                ))}
              </ScrollView>

              {(() => {
                const cust = customers.find((c) => c.id === selectedCustomerId);
                if (!cust || cust.loyaltyPoints <= 0) return null;
                const maxPts = Math.min(cust.loyaltyPoints, Math.floor(cartSubtotal - discountVal));
                return (
                  <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#00000015" }}>
                    <Text style={{ fontSize: 12, color: "#d97706", fontWeight: "700", marginBottom: 6 }}>
                      ⭐ {cust.name} has {cust.loyaltyPoints} points available (1 pt = ₱1 discount)
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      <Chip compact selected={redeemPoints === 0} onPress={() => setRedeemPoints(0)}>
                        Use 0 pts
                      </Chip>
                      {cust.loyaltyPoints >= 20 && maxPts >= 20 ? (
                        <Chip compact selected={redeemPoints === 20} onPress={() => setRedeemPoints(20)}>
                          Use 20 pts (-₱20)
                        </Chip>
                      ) : null}
                      {cust.loyaltyPoints >= 50 && maxPts >= 50 ? (
                        <Chip compact selected={redeemPoints === 50} onPress={() => setRedeemPoints(50)}>
                          Use 50 pts (-₱50)
                        </Chip>
                      ) : null}
                      {maxPts > 0 ? (
                        <Chip compact selected={redeemPoints === maxPts} onPress={() => setRedeemPoints(maxPts)}>
                          Use Max ({maxPts} pts)
                        </Chip>
                      ) : null}
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* Amount Tendered (for cash) */}
            {paymentMethod === "cash" ? (
              <View style={styles.formRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                  {translate(language, "amountTendered")} (₱)
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={amountTenderedStr}
                  onChangeText={setAmountTenderedStr}
                  style={[
                    styles.textInput,
                    { fontSize: 20, fontWeight: "700", color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                  ]}
                />

                <View style={styles.quickCashRow}>
                  <Chip
                    compact
                    onPress={() => setAmountTenderedStr(String(cartGrandTotal))}
                    style={styles.quickCashChip}
                  >
                    {translate(language, "exact")}
                  </Chip>
                  {[20, 50, 100, 200, 500, 1000].map((preset) => (
                    <Chip
                      key={preset}
                      compact
                      onPress={() => setAmountTenderedStr(String(preset))}
                      style={styles.quickCashChip}
                    >
                      ₱{preset}
                    </Chip>
                  ))}
                </View>
              </View>
            ) : null}
            {/* E-Wallet GCash / Maya Screen */}
            {paymentMethod === "e_wallet" ? (
              <View style={[styles.paymentDetailBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <Chip
                    selected={eWalletType === "gcash"}
                    onPress={() => setEWalletType("gcash")}
                    style={{ flex: 1 }}
                    textStyle={{ fontWeight: "700" }}
                  >
                    GCash
                  </Chip>
                  <Chip
                    selected={eWalletType === "maya"}
                    onPress={() => setEWalletType("maya")}
                    style={{ flex: 1 }}
                    textStyle={{ fontWeight: "700" }}
                  >
                    Maya
                  </Chip>
                </View>

                {(() => {
                  const isGcash = eWalletType === "gcash";
                  const qrUri = isGcash ? storeQRs?.gcashQrUri : storeQRs?.mayaQrUri;
                  const accName = isGcash ? storeQRs?.gcashName : storeQRs?.mayaName;
                  const accNumber = isGcash ? storeQRs?.gcashNumber : storeQRs?.mayaNumber;
                  return (
                    <View style={{ alignItems: "center", marginBottom: 12 }}>
                      {qrUri ? (
                        <Image
                          source={{ uri: qrUri }}
                          style={{ width: 280, height: 280, borderRadius: 8, marginBottom: 8, backgroundColor: "#FFFFFF" }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      ) : null}
                      {accName ? (
                        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.onSurfaceVariant }}>
                          {accName}
                        </Text>
                      ) : null}
                      {accNumber ? (
                        <Text
                          selectable
                          style={{ fontSize: 16, fontWeight: "800", color: theme.colors.primary, marginTop: 2 }}
                        >
                          {accNumber}
                        </Text>
                      ) : null}
                      {!qrUri && !accNumber ? (
                        <View style={{ alignItems: "center", paddingVertical: 6 }}>
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, textAlign: "center", fontStyle: "italic", paddingHorizontal: 12, marginBottom: 8 }}>
                            No {isGcash ? "GCash" : "Maya"} QR uploaded yet. You can upload it in Profile &gt; Store.
                          </Text>
                          <Button
                            compact
                            mode="outlined"
                            icon="qrcode-plus"
                            onPress={() => {
                              onClose();
                              onNavigateToProfile();
                            }}
                          >
                            Upload Store QR in Profile
                          </Button>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}

                <View style={styles.formRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                    {translate(language, "paymentRefNumber") || "Payment Reference Number (Optional)"}
                  </Text>
                  <TextInput
                    placeholder="e.g. 10098234857"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={refNumber}
                    onChangeText={setRefNumber}
                    style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                  />
                </View>
              </View>
            ) : null}

            {/* Credit / Utang Section */}
            {paymentMethod === "credit" ? (
              <View style={[styles.paymentDetailBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface, fontWeight: "700", marginBottom: 8 }]}>
                  Select Customer (Credit Ledger)
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <Chip
                    selected={selectedCustomerId === ""}
                    onPress={() => setSelectedCustomerId("")}
                    style={{ marginRight: 6 }}
                    textStyle={{ fontWeight: "700" }}
                  >
                    + New Customer
                  </Chip>
                  {customers.map((c) => (
                    <Chip
                      key={c.id}
                      selected={selectedCustomerId === c.id}
                      onPress={() => setSelectedCustomerId(c.id)}
                      style={{ marginRight: 6 }}
                    >
                      {c.name} {c.totalDebt > 0 ? `(₱${c.totalDebt.toFixed(0)})` : ""}
                    </Chip>
                  ))}
                </ScrollView>

                {selectedCustomerId ? (
                  (() => {
                    const cust = customers.find((c) => c.id === selectedCustomerId);
                    if (!cust) return null;
                    const isExceeded = (cust.totalDebt + cartGrandTotal) > cust.creditLimit;
                    return (
                      <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.colors.surface, marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontWeight: "800", color: theme.colors.onSurface, fontSize: 14 }}>{cust.name}</Text>
                          <Badge style={{ backgroundColor: cust.riskStatus === "good" ? "#16a34a" : cust.riskStatus === "warning" ? "#d97706" : "#dc2626", color: "#fff" }}>
                            {cust.riskStatus.toUpperCase()}
                          </Badge>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                          Phone: {cust.phone || "None"}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                          Current Debt: {getCurrency(cust.totalDebt)} / Limit: {getCurrency(cust.creditLimit)}
                        </Text>
                        {isExceeded ? (
                          <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700", marginTop: 4 }}>
                            ⚠️ This purchase exceeds the customer&apos;s credit limit!
                          </Text>
                        ) : null}
                      </View>
                    );
                  })()
                ) : (
                  <View style={{ marginBottom: 12 }}>
                    <View style={styles.formRow}>
                      <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>Customer Name *</Text>
                      <TextInput
                        placeholder="e.g. Maria Santos"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        value={newCustName}
                        onChangeText={setNewCustName}
                        style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                    <View style={styles.formRow}>
                      <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>Phone Number (for SMS reminders)</Text>
                      <TextInput
                        placeholder="0917xxxxxxx"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        keyboardType="phone-pad"
                        value={newCustPhone}
                        onChangeText={setNewCustPhone}
                        style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                  </View>
                )}

                {/* Due Date Presets */}
                <View style={styles.formRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                    Due Date: <Text style={{ fontWeight: "700", color: theme.colors.primary }}>{creditDueDate}</Text>
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                    {[7, 15, 30].map((days) => (
                      <Chip
                        key={days}
                        compact
                        onPress={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + days);
                          setCreditDueDate(d.toISOString().split("T")[0]);
                        }}
                      >
                        +{days} Days
                      </Chip>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Split Payment Section */}
            {paymentMethod === "split" ? (
              <View style={[styles.paymentDetailBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.onSurface, fontWeight: "700", marginBottom: 8 }]}>
                  {translate(language, "splitPayment") || "Split Payment"}
                </Text>

                <View style={styles.formRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>Cash Portion (₱)</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="numeric"
                    value={splitCashStr}
                    onChangeText={setSplitCashStr}
                    style={[styles.textInput, { fontSize: 18, fontWeight: "700", color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                  />
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                    <Chip
                      compact
                      onPress={() => setSplitCashStr(String(Math.floor(cartGrandTotal / 2)))}
                    >
                      50% Cash (₱{Math.floor(cartGrandTotal / 2)})
                    </Chip>
                  </View>
                </View>

                {/* Remaining Balance display */}
                <View style={{ padding: 10, borderRadius: 8, backgroundColor: theme.colors.surface, marginBottom: 12 }}>
                  <View style={styles.summaryLine}>
                    <Text style={{ fontWeight: "600", color: theme.colors.onSurfaceVariant }}>Remaining Balance:</Text>
                    <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.primary }}>
                      {getCurrency(Math.max(0, cartGrandTotal - (Number(splitCashStr) || 0)))}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.onSurface, marginBottom: 6 }]}>
                  Pay Remaining Balance With:
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <Chip
                    selected={splitOtherMethod === "e_wallet"}
                    onPress={() => setSplitOtherMethod("e_wallet")}
                    icon="cellphone-check"
                    style={{ flex: 1 }}
                    textStyle={{ fontWeight: "700" }}
                  >
                    GCash / Maya
                  </Chip>
                  <Chip
                    selected={splitOtherMethod === "credit"}
                    onPress={() => setSplitOtherMethod("credit")}
                    icon="book-account-outline"
                    style={{ flex: 1 }}
                    textStyle={{ fontWeight: "700" }}
                  >
                    Credit / Utang
                  </Chip>
                </View>

                {splitOtherMethod === "e_wallet" ? (
                  <View>
                    <View style={styles.formRow}>
                      <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                        E-Wallet Reference No.
                      </Text>
                      <TextInput
                        placeholder="e.g. 10098234857"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        value={refNumber}
                        onChangeText={setRefNumber}
                        style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={[styles.inputLabel, { color: theme.colors.onSurface, fontWeight: "600", marginBottom: 6 }]}>
                      Select Customer for Remaining Credit:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      <Chip
                        selected={selectedCustomerId === ""}
                        onPress={() => setSelectedCustomerId("")}
                        style={{ marginRight: 6 }}
                      >
                        + New Customer
                      </Chip>
                      {customers.map((c) => (
                        <Chip
                          key={c.id}
                          selected={selectedCustomerId === c.id}
                          onPress={() => setSelectedCustomerId(c.id)}
                          style={{ marginRight: 6 }}
                        >
                          {c.name}
                        </Chip>
                      ))}
                    </ScrollView>
                    {!selectedCustomerId ? (
                      <View style={styles.formRow}>
                        <TextInput
                          placeholder="Customer Name *"
                          placeholderTextColor={theme.colors.onSurfaceVariant}
                          value={newCustName}
                          onChangeText={setNewCustName}
                          style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                        />
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}
            {/* Totals Breakdown */}
            <Surface style={[styles.checkoutSummaryCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.summaryLine}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{translate(language, "subtotalLabel")}</Text>
                <Text style={{ color: theme.colors.onSurface }}>{getCurrency(cartSubtotal)}</Text>
              </View>
              {discountVal > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={{ color: theme.colors.error }}>{translate(language, "discountLabel")}</Text>
                  <Text style={{ color: theme.colors.error }}>-{getCurrency(discountVal)}</Text>
                </View>
              ) : null}
              {redeemPoints > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={{ color: "#d97706", fontWeight: "600" }}>⭐ Points Discount</Text>
                  <Text style={{ color: "#d97706", fontWeight: "700" }}>-{getCurrency(redeemPoints)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryLine}>
                <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.onSurface }}>
                  {translate(language, "totalLabel")}
                </Text>
                <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.primary }}>
                  {getCurrency(cartGrandTotal)}
                </Text>
              </View>

              {paymentMethod === "cash" ? (
                <View style={[styles.summaryLine, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#00000018" }]}>
                  <Text style={{ fontWeight: "700", color: theme.colors.secondary }}>
                    {translate(language, "changeDue")}
                  </Text>
                  <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.secondary }}>
                    {getCurrency(changeDue)}
                  </Text>
                </View>
              ) : paymentMethod === "split" ? (
                <View style={[styles.summaryLine, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#00000018" }]}>
                  <Text style={{ fontWeight: "700", color: theme.colors.secondary }}>
                    Cash Paid / Remaining:
                  </Text>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.secondary }}>
                    {getCurrency(Number(splitCashStr) || 0)} / {getCurrency(Math.max(0, cartGrandTotal - (Number(splitCashStr) || 0)))}
                  </Text>
                </View>
              ) : paymentMethod === "credit" ? (
                <View style={[styles.summaryLine, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#00000018" }]}>
                  <Text style={{ fontWeight: "700", color: "#d97706" }}>
                    Added to Credit:
                  </Text>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: "#d97706" }}>
                    {getCurrency(cartGrandTotal)}
                  </Text>
                </View>
              ) : null}
            </Surface>

            <Button
              mode="contained"
              loading={isProcessing}
              disabled={isProcessing}
              buttonColor={theme.colors.primary}
              onPress={onCompleteSale}
              style={{ marginTop: 20 }}
              labelStyle={{ paddingVertical: 4, fontWeight: "700", fontSize: 16 }}
            >
              {translate(language, "completeSale")} ({getCurrency(cartGrandTotal)})
            </Button>
          </ScrollView>
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
  checkoutModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  cartModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  paymentMethodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  paymentMethodCard: {
    width: "30.5%",
    aspectRatio: 1.15,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  paymentMethodIconWrap: {
    position: "relative",
    marginBottom: 4,
  },
  paymentMethodCheck: {
    position: "absolute",
    top: -4,
    right: -8,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  formRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  quickCashRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  quickCashChip: {
    height: 32,
  },
  paymentDetailBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  checkoutSummaryCard: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
});

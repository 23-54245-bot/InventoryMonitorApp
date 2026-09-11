import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    Vibration,
    View,
} from "react-native";
import {
    Appbar,
    Badge,
    Button,
    Chip,
    Divider,
    IconButton,
    Surface,
    Text,
    useTheme
} from "react-native-paper";

import { useStore } from "../context/store";
import { findProductBySku, getCurrency, type CartItem, type PaymentMethod, type Product, type SaleTransaction } from "../data/freshmart";
import { translate } from "../lib/i18n";

const BARCODE_TYPES = ["ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "qr"] as const;

export default function PosScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state, customers, addCustomer, processCheckout } = useStore();
  const language = state.user.preferences?.language ?? "English";

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerActive, setScannerActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartExpanded, setCartExpanded] = useState(false);

  // Feedback flash banner
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; price: number } | null>(null);
  const scanCooldownRef = useRef(false);

  // Checkout modal state
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountTenderedStr, setAmountTenderedStr] = useState("");
  const [discountStr, setDiscountStr] = useState("0");
  const [isProcessing, setIsProcessing] = useState(false);

  // Advanced E-Wallet, Utang & Split Payment State
  const [eWalletType, setEWalletType] = useState<"gcash" | "maya">("gcash");
  const [refNumber, setRefNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [creditDueDate, setCreditDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [splitCashStr, setSplitCashStr] = useState("");
  const [splitOtherMethod, setSplitOtherMethod] = useState<"e_wallet" | "credit">("e_wallet");
  const [redeemPoints, setRedeemPoints] = useState(0);

  // Completed Receipt Dialog state
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);

  const categories = useMemo(() => {
    const list = ["All", ...new Set(state.products.map((p) => p.category))];
    return list;
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.products.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [state.products, searchQuery, selectedCategory]);

  const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const discountVal = Number(discountStr) || 0;
  const cartGrandTotal = Math.max(0, cartSubtotal - discountVal - redeemPoints);
  const amountTenderedVal = Number(amountTenderedStr) || 0;
  const changeDue = Math.max(0, amountTenderedVal - cartGrandTotal);

  // Add or increment product in cart
  const addToCart = (product: Product) => {
    const currentStock = product.currentStock;
    if (currentStock <= 0) {
      Alert.alert(translate(language, "outOfStock"), `${product.name} has 0 stock available.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + 1 > currentStock) {
        Alert.alert(translate(language, "lowStock"), `${translate(language, "insufficientStockWarning")} (${currentStock} ${product.unitType})`);
        return prev;
      }

      const sellingPrice = product.srpPrice && product.srpPrice > 0 ? product.srpPrice : product.unitPrice;

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, price: sellingPrice }];
    });

    setLastScannedItem({
      name: product.name,
      price: product.srpPrice && product.srpPrice > 0 ? product.srpPrice : product.unitPrice,
    });
    setTimeout(() => setLastScannedItem(null), 2500);

    if (Platform.OS !== "web") {
      Vibration.vibrate(60);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.currentStock) {
            Alert.alert(translate(language, "lowStock"), `${translate(language, "insufficientStockWarning")} (${item.product.currentStock} max)`);
            return item;
          }
          return { ...item, quantity: nextQty };
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scanCooldownRef.current) return;
    scanCooldownRef.current = true;
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 1200);

    const product = findProductBySku(data, state.products);
    if (product) {
      addToCart(product);
    } else {
      if (Platform.OS !== "web") {
        Vibration.vibrate([0, 100, 50, 100]);
      }
      Alert.alert("Barcode Not Found", `No product found matching barcode/SKU: ${data}`);
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setAmountTenderedStr(String(cartGrandTotal));
    // Auto-generate a TXN reference for e-wallet payments
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    setRefNumber(`TXN-${datePart}-${randPart}`);
    setCheckoutVisible(true);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === "cash" && amountTenderedVal < cartGrandTotal) {
      Alert.alert("Incomplete Payment", `Amount tendered (${getCurrency(amountTenderedVal)}) is less than total amount due (${getCurrency(cartGrandTotal)}).`);
      return;
    }

    let customerIdToUse = selectedCustomerId;
    let customerNameToUse = "";
    let customerPhoneToUse = "";

    const isCredit = paymentMethod === "credit";
    const isSplitCredit = paymentMethod === "split" && splitOtherMethod === "credit";

    if (isCredit || isSplitCredit) {
      if (!customerIdToUse) {
        if (!newCustName.trim()) {
          Alert.alert("Customer Required", "Please select an existing customer or enter a customer name for credit/utang purchase.");
          return;
        }
        const created = await addCustomer({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || "N/A",
          creditLimit: 1000,
          riskStatus: "good",
        });
        customerIdToUse = created.id;
        customerNameToUse = created.name;
        customerPhoneToUse = created.phone;
      } else {
        const existing = customers.find((c) => c.id === customerIdToUse);
        if (existing) {
          customerNameToUse = existing.name;
          customerPhoneToUse = existing.phone;
          const portion = isCredit ? cartGrandTotal : Math.max(0, cartGrandTotal - (Number(splitCashStr) || 0));
          if (existing.totalDebt + portion > existing.creditLimit) {
            const proceed = await new Promise<boolean>((resolve) => {
              Alert.alert(
                "Credit Limit Exceeded",
                `${existing.name}'s credit limit is ${getCurrency(existing.creditLimit)}. Current debt is ${getCurrency(existing.totalDebt)}. Adding ${getCurrency(portion)} exceeds limit. Proceed anyway?`,
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
                `${existing.name} is blacklisted for credit! Proceed anyway?`,
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
    }

    if (paymentMethod === "split") {
      const cashPortion = Number(splitCashStr) || 0;
      if (cashPortion <= 0 || cashPortion >= cartGrandTotal) {
        Alert.alert("Split Payment Error", `Cash portion must be greater than ₱0 and less than total amount (${getCurrency(cartGrandTotal)}).`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const result = await processCheckout({
        items: cart,
        paymentMethod,
        amountTendered: paymentMethod === "cash" ? amountTenderedVal : cartGrandTotal,
        discount: discountVal + redeemPoints,
        redeemedPoints: redeemPoints,
        customerId: (isCredit || isSplitCredit) ? customerIdToUse : (selectedCustomerId || undefined),
        customerName: customerNameToUse || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : undefined),
        customerPhone: customerPhoneToUse || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.phone : undefined),
        dueDate: (isCredit || isSplitCredit) ? creditDueDate : undefined,
        referenceNumber: paymentMethod === "e_wallet" || (paymentMethod === "split" && splitOtherMethod === "e_wallet") ? refNumber.trim() || undefined : undefined,
        splitCashAmount: paymentMethod === "split" ? (Number(splitCashStr) || 0) : undefined,
        splitOtherAmount: paymentMethod === "split" ? Math.max(0, cartGrandTotal - (Number(splitCashStr) || 0)) : undefined,
        splitOtherMethod: paymentMethod === "split" ? splitOtherMethod : undefined,
      });

      if (result.success && result.sale) {
        setCheckoutVisible(false);
        setCart([]);
        setRefNumber("");
        setSelectedCustomerId("");
        setNewCustName("");
        setNewCustPhone("");
        setSplitCashStr("");
        setRedeemPoints(0);
        setCompletedSale(result.sale);
      } else {
        Alert.alert("Checkout Error", result.error ?? "Failed to process sale.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintOrShareReceipt = async () => {
    if (!completedSale) return;
    const storeName = state.user.storeName || "StockTrack Store";
    const dateStr = new Date(completedSale.timestamp).toLocaleString();

    const itemsHtml = completedSale.items
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
            <p style="margin: 2px 0; font-size: 11px;">Receipt: ${completedSale.receiptNumber}</p>
            <p style="margin: 2px 0; font-size: 11px;">${dateStr}</p>
          </div>
          <hr style="border: 1px dashed #444;" />
          <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
            ${itemsHtml}
          </table>
          <hr style="border: 1px dashed #444;" />
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span><span>${getCurrency(completedSale.subtotal)}</span>
            </div>
            ${
              completedSale.discount > 0
                ? `<div style="display: flex; justify-content: space-between; color: #b91c1c;">
                     <span>Discount:</span><span>-${getCurrency(completedSale.discount)}</span>
                   </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 6px;">
              <span>TOTAL:</span><span>${getCurrency(completedSale.totalAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
              <span>Payment:</span>
              <span>${completedSale.paymentMethod.toUpperCase()}</span>
            </div>
            ${
              completedSale.referenceNumber
                ? `<div style="display: flex; justify-content: space-between;">
                     <span>Ref No:</span><span>${completedSale.referenceNumber}</span>
                   </div>`
                : ""
            }
            ${
              completedSale.customerName
                ? `<div style="display: flex; justify-content: space-between;">
                     <span>Customer:</span><span>${completedSale.customerName}</span>
                   </div>`
                : ""
            }
            ${
              completedSale.splitCashAmount
                ? `<div style="display: flex; justify-content: space-between; font-size: 11px; color: #555;">
                     <span>Split:</span><span>Cash ${getCurrency(completedSale.splitCashAmount)} + ${completedSale.splitOtherMethod?.toUpperCase()} ${getCurrency(completedSale.splitOtherAmount ?? 0)}</span>
                   </div>`
                : ""
            }
            ${
              completedSale.paymentMethod === "cash"
                ? `<div style="display: flex; justify-content: space-between;">
                     <span>Tendered:</span><span>${getCurrency(completedSale.amountTendered)}</span>
                   </div>
                   <div style="display: flex; justify-content: space-between;">
                     <span>Change Due:</span><span>${getCurrency(completedSale.changeAmount)}</span>
                   </div>`
                : ""
            }
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 12px;">
            <p>Cashier: ${completedSale.cashierName}</p>
            <p>Maraming Salamat Po!</p>
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
      Alert.alert("Notice", "Receipt preview is ready.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.BackAction color={theme.colors.onPrimary} onPress={() => router.back()} />
        <Appbar.Content
          title={translate(language, "posTitle")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton
          icon={scannerActive ? "camera-off" : "barcode-scan"}
          iconColor={theme.colors.onPrimary}
          onPress={() => {
            if (!cameraPermission?.granted) {
              requestCameraPermission();
            }
            setScannerActive((prev) => !prev);
          }}
        />
        <IconButton
          icon="history"
          iconColor={theme.colors.onPrimary}
          onPress={() => router.push("/sales-history" as any)}
        />
      </Appbar.Header>

      {/* Camera Barcode Viewport (collapsible) */}
      {scannerActive ? (
        <View style={styles.cameraBox}>
          {cameraPermission?.granted ? (
            <CameraView
              style={styles.camera}
              facing={"back" as CameraType}
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.cameraReticleContainer}>
                <View style={styles.cameraReticle} />
                <Text style={styles.cameraPrompt}>{translate(language, "scanPrompt")}</Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionFallback}>
              <Text style={{ color: "#fff", marginBottom: 8 }}>Camera permission needed to scan barcodes.</Text>
              <Button mode="contained" onPress={requestCameraPermission}>Grant Permission</Button>
            </View>
          )}
        </View>
      ) : null}

      {/* Scanned Flash Notification */}
      {lastScannedItem ? (
        <View style={[styles.scannedBadge, { backgroundColor: theme.colors.secondary }]}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
          <Text style={styles.scannedBadgeText}>
            Added: {lastScannedItem.name} · {getCurrency(lastScannedItem.price)}
          </Text>
        </View>
      ) : null}

      {/* Search & Category Filter */}
      <View style={[styles.filterSection, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          placeholder={translate(language, "searchPlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              compact
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.catChip, selectedCategory === cat && { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ fontSize: 12 }}
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Product Catalog Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => {
          const sellingPrice = item.srpPrice && item.srpPrice > 0 ? item.srpPrice : item.unitPrice;
          const cartItem = cart.find((c) => c.product.id === item.id);
          const isLow = item.currentStock <= item.lowStockThreshold && item.currentStock > 0;
          const isOut = item.currentStock <= 0;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.productCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => addToCart(item)}
            >
              <View style={styles.productIconWrap}>
                <Text style={styles.productIcon}>{item.icon || "📦"}</Text>
                {cartItem ? (
                  <Badge style={[styles.cartBadge, { backgroundColor: theme.colors.primary }]}>
                    {cartItem.quantity}
                  </Badge>
                ) : null}
              </View>

              <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.productName, { color: theme.colors.onSurface }]}>
                {item.name}
              </Text>

              <View style={styles.priceStockRow}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.productPrice, { color: theme.colors.primary }]}>
                  {getCurrency(sellingPrice)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stockBadge,
                    {
                      color: isOut ? theme.colors.error : isLow ? theme.colors.tertiary : theme.colors.onSurfaceVariant,
                      flexShrink: 0,
                    },
                  ]}
                >
                  {isOut ? "Out" : `${item.currentStock} left`}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="tag-off-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No matching items found</Text>
          </View>
        }
      />

      {/* Bottom Cart Drawer Bar */}
      <Surface style={[styles.cartBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <Pressable style={styles.cartBarInfo} onPress={() => setCartExpanded((prev) => !prev)}>
          <View style={styles.cartBarCount}>
            <MaterialCommunityIcons name="cart-outline" size={24} color={theme.colors.primary} />
            <Badge style={[styles.cartBarBadge, { backgroundColor: theme.colors.primary }]}>
              {cartTotalItems}
            </Badge>
          </View>
          <View>
            <Text style={[styles.cartBarTotal, { color: theme.colors.onSurface }]}>
              {getCurrency(cartGrandTotal)}
            </Text>
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
              {cartTotalItems} {translate(language, "itemsCount")} · Tap to view cart
            </Text>
          </View>
        </Pressable>

        <Button
          mode="contained"
          disabled={cart.length === 0}
          buttonColor={theme.colors.primary}
          onPress={openCheckout}
          style={styles.checkoutBtn}
          labelStyle={{ fontWeight: "700" }}
        >
          {translate(language, "checkoutButton")}
        </Button>
      </Surface>

      {/* Expanded Cart Modal */}
      <Modal visible={cartExpanded} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.cartModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cartModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="cart" size={22} color={theme.colors.primary} />
                <Text style={[styles.cartModalTitle, { color: theme.colors.onSurface }]}>
                  {translate(language, "cartTitle")} ({cartTotalItems})
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {cart.length > 0 ? (
                  <Button compact textColor={theme.colors.error} onPress={clearCart}>
                    {translate(language, "clearCart")}
                  </Button>
                ) : null}
                <IconButton icon="close" size={20} onPress={() => setCartExpanded(false)} />
              </View>
            </View>

            <Divider />

            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id}
              style={styles.cartList}
              renderItem={({ item }) => (
                <View style={styles.cartItemRow}>
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.cartItemName, { color: theme.colors.onSurface }]}>
                      {item.product.name}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {getCurrency(item.price)} each · {item.product.sku}
                    </Text>
                  </View>

                  <View style={styles.stepperWrap}>
                    <IconButton
                      icon="minus"
                      size={18}
                      mode="contained-tonal"
                      onPress={() => updateCartQuantity(item.product.id, -1)}
                    />
                    <Text style={[styles.stepperQty, { color: theme.colors.onSurface }]}>
                      {item.quantity}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={18}
                      mode="contained-tonal"
                      onPress={() => updateCartQuantity(item.product.id, 1)}
                    />
                  </View>

                  <Text style={[styles.cartItemLineTotal, { color: theme.colors.onSurface }]}>
                    {getCurrency(item.price * item.quantity)}
                  </Text>

                  <IconButton
                    icon="trash-can-outline"
                    iconColor={theme.colors.error}
                    size={18}
                    onPress={() => removeFromCart(item.product.id)}
                  />
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {translate(language, "cartEmpty")}
                  </Text>
                </View>
              }
            />

            <Divider />

            <View style={styles.cartSummaryBox}>
              <View style={styles.summaryLine}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{translate(language, "subtotalLabel")}</Text>
                <Text style={{ fontWeight: "600", color: theme.colors.onSurface }}>{getCurrency(cartSubtotal)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.onSurface }}>
                  {translate(language, "totalLabel")}
                </Text>
                <Text style={{ fontWeight: "800", fontSize: 20, color: theme.colors.primary }}>
                  {getCurrency(cartGrandTotal)}
                </Text>
              </View>

              <Button
                mode="contained"
                disabled={cart.length === 0}
                buttonColor={theme.colors.primary}
                onPress={() => {
                  setCartExpanded(false);
                  openCheckout();
                }}
                style={{ marginTop: 12 }}
              >
                {translate(language, "checkoutButton")} ({getCurrency(cartGrandTotal)})
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Checkout / Payment Modal */}
      <Modal visible={checkoutVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.checkoutModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cartModalHeader}>
              <Text style={[styles.cartModalTitle, { color: theme.colors.onSurface }]}>
                {translate(language, "paymentMethod")}
              </Text>
              <IconButton icon="close" size={20} onPress={() => setCheckoutVisible(false)} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Payment Methods */}
              <View style={styles.paymentMethodRow}>
                {([
                  { key: "cash", label: translate(language, "cash"), icon: "cash" },
                  { key: "e_wallet", label: "GCash / Maya", icon: "cellphone-check" },
                  { key: "credit", label: translate(language, "utang") || "Utang", icon: "book-account-outline" },
                  { key: "split", label: translate(language, "splitPayment") || "Split", icon: "call-split" },
                  { key: "card", label: translate(language, "card"), icon: "credit-card-outline" },
                  { key: "other", label: translate(language, "other"), icon: "dots-horizontal-circle-outline" },
                ] as const).map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setPaymentMethod(m.key)}
                    style={[
                      styles.paymentMethodCard,
                      {
                        backgroundColor:
                          paymentMethod === m.key ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                        borderColor: paymentMethod === m.key ? theme.colors.primary : "transparent",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={m.icon as any}
                      size={24}
                      color={paymentMethod === m.key ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text
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
                  style={[styles.textInput, { color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                />
              </View>

              {/* Customer Selector / Loyalty Points Redemption */}
              <View style={[styles.formRow, { backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: 10, marginBottom: 14 }]}>
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
                        <Chip
                          compact
                          selected={redeemPoints === 0}
                          onPress={() => setRedeemPoints(0)}
                        >
                          Use 0 pts
                        </Chip>
                        {cust.loyaltyPoints >= 20 && maxPts >= 20 ? (
                          <Chip
                            compact
                            selected={redeemPoints === 20}
                            onPress={() => setRedeemPoints(20)}
                          >
                            Use 20 pts (-₱20)
                          </Chip>
                        ) : null}
                        {cust.loyaltyPoints >= 50 && maxPts >= 50 ? (
                          <Chip
                            compact
                            selected={redeemPoints === 50}
                            onPress={() => setRedeemPoints(50)}
                          >
                            Use 50 pts (-₱50)
                          </Chip>
                        ) : null}
                        {maxPts > 0 ? (
                          <Chip
                            compact
                            selected={redeemPoints === maxPts}
                            onPress={() => setRedeemPoints(maxPts)}
                          >
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
                    style={[styles.textInput, { fontSize: 20, fontWeight: "700", color: theme.colors.onSurface, borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                  />

                  {/* Preset quick cash chips */}
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
                    const qrUri = isGcash ? state.user.storeQRs?.gcashQrUri : state.user.storeQRs?.mayaQrUri;
                    const accName = isGcash ? state.user.storeQRs?.gcashName : state.user.storeQRs?.mayaName;
                    const accNumber = isGcash ? state.user.storeQRs?.gcashNumber : state.user.storeQRs?.mayaNumber;
                    return (
                      <View style={{ alignItems: "center", marginBottom: 12 }}>
                        {qrUri ? (
                          <Image
                            source={{ uri: qrUri }}
                            style={{ width: 140, height: 140, borderRadius: 8, marginBottom: 8 }}
                            resizeMode="contain"
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
                          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, textAlign: "center", fontStyle: "italic", paddingHorizontal: 12 }}>
                            No {isGcash ? "GCash" : "Maya"} QR uploaded yet. Go to Profile {">"} Store to configure. You can still accept payment and enter the reference number below.
                          </Text>
                        ) : null}
                      </View>
                    );
                  })()}

                  <View style={styles.formRow}>
                    <Text style={[styles.inputLabel, { color: theme.colors.onSurface }]}>
                      {translate(language, "paymentRefNumber") || "Payment Reference Number"}
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

              {/* Utang / Customer Credit Section */}
              {paymentMethod === "credit" ? (
                <View style={[styles.paymentDetailBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.onSurface, fontWeight: "700", marginBottom: 8 }]}>
                    Select Customer (Utang Ledger)
                  </Text>

                  {/* Customer List Chips */}
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
                              ⚠️ This purchase exceeds the customer's credit limit!
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
                      Utang / Credit
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
                        Select Customer for Remaining Utang:
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
                      Added to Utang:
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
                onPress={handleCompleteSale}
                style={{ marginTop: 20 }}
                labelStyle={{ paddingVertical: 4, fontWeight: "700", fontSize: 16 }}
              >
                {translate(language, "completeSale")} ({getCurrency(cartGrandTotal)})
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt & Success Dialog */}
      <Modal visible={!!completedSale} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.receiptHeader}>
              <MaterialCommunityIcons name="check-circle" size={48} color={theme.colors.secondary} />
              <Text style={[styles.receiptTitle, { color: theme.colors.onSurface }]}>
                {translate(language, "saleSuccess")}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                {completedSale?.receiptNumber}
              </Text>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <ScrollView style={{ maxHeight: 220 }}>
              {completedSale?.items.map((i, idx) => (
                <View key={idx} style={styles.receiptLineItem}>
                  <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Text numberOfLines={2} ellipsizeMode="tail" style={{ fontWeight: "600", color: theme.colors.onSurface }}>{i.productName}</Text>
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
                  {getCurrency(completedSale?.totalAmount ?? 0)}
                </Text>
              </View>
              {completedSale?.paymentMethod === "cash" ? (
                <View style={styles.summaryLine}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Change Due:</Text>
                  <Text style={{ fontWeight: "700", color: theme.colors.secondary }}>
                    {getCurrency(completedSale?.changeAmount ?? 0)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.receiptActions}>
              <Button
                mode="outlined"
                icon="share-variant-outline"
                onPress={handlePrintOrShareReceipt}
                style={{ flex: 1 }}
              >
                Print / Share
              </Button>
              <Button
                mode="contained"
                buttonColor={theme.colors.primary}
                onPress={() => setCompletedSale(null)}
                style={{ flex: 1 }}
              >
                {translate(language, "newSale")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { elevation: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  cameraBox: { height: 180, width: "100%", backgroundColor: "#000", position: "relative" },
  camera: { flex: 1 },
  cameraReticleContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraReticle: {
    width: 220,
    height: 100,
    borderWidth: 2,
    borderColor: "#00ffcc",
    borderRadius: 8,
    backgroundColor: "rgba(0,255,204,0.06)",
  },
  cameraPrompt: {
    color: "#fff",
    fontSize: 11,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  permissionFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scannedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scannedBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  filterSection: { padding: 12, paddingBottom: 6 },
  searchInput: {
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  categoryScroll: { flexDirection: "row", marginBottom: 4 },
  catChip: { marginRight: 6 },
  productList: { padding: 8, paddingBottom: 100 },
  productCard: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  productIconWrap: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  productIcon: { fontSize: 32 },
  cartBadge: { position: "absolute", top: 0, right: 0 },
  productName: { fontWeight: "700", fontSize: 13, marginTop: 6, minHeight: 34, flexShrink: 1 },
  priceStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
    minWidth: 0,
  },
  productPrice: { fontWeight: "800", fontSize: 14, flexShrink: 1 },
  stockBadge: { fontSize: 11, flexShrink: 0 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 15 },
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    elevation: 8,
  },
  cartBarInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartBarCount: { position: "relative" },
  cartBarBadge: { position: "absolute", top: -4, right: -8 },
  cartBarTotal: { fontSize: 17, fontWeight: "800" },
  checkoutBtn: { borderRadius: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  cartModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  cartModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cartModalTitle: { fontSize: 18, fontWeight: "800" },
  cartList: { maxHeight: 320, paddingHorizontal: 16 },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#00000015",
    minWidth: 0,
  },
  cartItemName: { fontWeight: "700", fontSize: 14, flexShrink: 1 },
  stepperWrap: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  stepperQty: { fontWeight: "700", fontSize: 14, minWidth: 20, textAlign: "center" },
  cartItemLineTotal: { fontWeight: "700", fontSize: 14, minWidth: 55, textAlign: "right", flexShrink: 0 },
  cartSummaryBox: { paddingHorizontal: 16, paddingTop: 12 },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  checkoutModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 28,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  paymentMethodCard: {
    flex: 1,
    width: "30%",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  paymentMethodText: { fontSize: 11, fontWeight: "700", marginTop: 4, textAlign: "center" },
  paymentDetailBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  formRow: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  quickCashRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  quickCashChip: { marginVertical: 2 },
  checkoutSummaryCard: { padding: 12, borderRadius: 10, marginTop: 8 },
  receiptModalCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    alignSelf: "center",
    width: "90%",
    maxWidth: 400,
  },
  receiptHeader: { alignItems: "center" },
  receiptTitle: { fontSize: 20, fontWeight: "800", marginTop: 8 },
  receiptLineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 0,
  },
  receiptTotals: { marginVertical: 8 },
  receiptActions: { flexDirection: "row", gap: 8, marginTop: 16 },
});

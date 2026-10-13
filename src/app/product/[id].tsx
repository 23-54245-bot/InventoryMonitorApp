import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Chip, Text, useTheme } from "react-native-paper";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { PriceTagModal } from "../../components/print/PriceTagModal";
import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import type { Product } from "../../data/freshmart";
import { getCurrency, getExpiryStatus, getProductStatus } from "../../data/freshmart";
import { generateProductSku } from "../../lib/barcode";
import { translate } from "../../lib/i18n";

const statusColors = {
  healthy: { background: "#dcfce7", color: "#16a34a" },
  warning: { background: "#fef3c7", color: "#d97706" },
  critical: { background: "#fee2e2", color: "#dc2626" },
};

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const { state, getProduct, updateProduct, deleteProduct } = useStore();
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const product = params.id ? getProduct(String(params.id)) : undefined;

  const stockPercentSafe = product ? Math.round(Math.min(product.currentStock / Math.max(product.maxStock, 1), 1) * 100) : 0;
  const stockFillWidth = useSharedValue(0);

  useEffect(() => {
    stockFillWidth.value = withTiming(stockPercentSafe, { duration: 600 });
  }, [stockFillWidth, stockPercentSafe]);

  const stockFillStyle = useAnimatedStyle(() => ({
    width: `${stockFillWidth.value}%`,
  }));

  if (!product) {
    return (
      <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}> 
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Product not found</Text>
        <Button mode="contained" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  const status = getProductStatus(product);
  const stockRatio = Math.min(product.currentStock / Math.max(product.maxStock, 1), 1);
  const stockPercent = Math.round(stockRatio * 100);
  const margin = product.srpPrice ? product.srpPrice - product.unitPrice : 0;
  const marginPercent = product.srpPrice ? Math.round((margin / product.srpPrice) * 100) : 0;
  const expiry = getExpiryStatus(product);
  const daysUntilExpiry = expiry.daysLeft;

  const closeProduct = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/inventory" as Href));

  const removeProduct = () => {
    if (session?.role === "Staff") {
      Alert.alert("Permission Denied", "Staff members cannot delete products. Only Store Owner or Manager can perform this action.");
      return;
    }
    deleteProduct(product.id);
    closeProduct();
  };

  const openBarcodeLabel = () => {
    const sku = product.sku.trim() || generateProductSku();
    if (!product.sku.trim()) updateProduct(product.id, { sku });
    setLabelProduct({ ...product, sku });
  };

  const actionButtonTint = stockPercent > 50 ? "#16a34a" : stockPercent > 20 ? "#f59e0b" : "#dc2626";
  const warningTone = daysUntilExpiry !== null && daysUntilExpiry <= 30;
  const warningColor = daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "#dc2626" : "#d97706";
  const warningBg = daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "#fee2e2" : "#fef3c7";
  const statusVisual = theme.dark
    ? { healthy: { background: "#1a2d4a", color: "#22c55e" }, warning: { background: "#5a3b0a", color: "#fbbf24" }, critical: { background: "#59212a", color: "#f87171" } }
    : statusColors;

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <TouchableOpacity style={styles.headerButton} onPress={closeProduct}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>Product Details</Text>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.colors.surface }]} onPress={() => router.push({ pathname: "/add-product", params: { id: product.id } } as any)}>
          <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)} style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.heroRow}>
            <View style={styles.imageWrap}>
              {product.imageUri ? (
                <Image source={{ uri: product.imageUri }} style={styles.productImage} contentFit="cover" />
              ) : (
                <MaterialCommunityIcons name="package-variant-closed" size={30} color={theme.colors.primary} />
              )}
            </View>

            <View style={styles.heroInfo}>
              <Text style={[styles.productName, { color: theme.colors.onSurface }]}>{product.name}</Text>
              <Text style={[styles.productCategory, { color: theme.colors.onSurfaceVariant }]}>{product.category}</Text>
              <View style={styles.badgeRow}>
                <Chip
                  style={{
                    backgroundColor: statusVisual[status.tone as keyof typeof statusVisual]?.background ?? theme.colors.surfaceVariant,
                    borderRadius: 999,
                  }}
                  textStyle={{
                    color: statusVisual[status.tone as keyof typeof statusVisual]?.color ?? theme.colors.onSurface,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {status.label}
                </Chip>
                <Text style={[styles.skuText, { color: theme.colors.onSurfaceVariant }]}>SKU: {product.sku}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.stockCard, { backgroundColor: theme.colors.surfaceVariant }]}> 
            <View style={styles.stockHeader}>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurface }]}>Current Stock Level</Text>
              <Text style={[styles.stockValue, { color: theme.colors.primary }]}> 
                {product.currentStock} <Text style={[styles.stockUnit, { color: theme.colors.onSurfaceVariant }]}>/ {product.maxStock} {product.unitType}</Text>
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, stockFillStyle, { backgroundColor: actionButtonTint }]} />
            </View>

            <View style={styles.stockMeta}>
              <Text style={styles.metaText}>Min: {product.lowStockThreshold}</Text>
              <Text style={styles.metaText}>{stockPercent}% filled</Text>
              <Text style={styles.metaText}>Max: {product.maxStock}</Text>
            </View>
          </View>

          <View style={styles.priceGrid}>
            <View style={[styles.priceBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.priceLabel}>Cost Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{getCurrency(product.unitPrice)}</Text>
            </View>
            <View style={[styles.priceBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{product.srpPrice ? getCurrency(product.srpPrice) : "Not set"}</Text>
            </View>
            <View style={[styles.priceBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.priceLabel}>Margin</Text>
              <Text style={[styles.priceValue, { color: "#7c3aed" }]}>{product.srpPrice ? `${marginPercent}%` : "-"}</Text>
            </View>
          </View>
        </Animated.View>

        {warningTone && (
          <View style={[styles.warningCard, { backgroundColor: warningBg, borderColor: warningColor + "50" }]}> 
            <MaterialCommunityIcons name={daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "calendar-alert" : "calendar-clock"} size={18} color={warningColor} />
            <View style={styles.warningTextWrap}>
              <Text style={[styles.warningTitle, { color: warningColor }]}> 
                {daysUntilExpiry !== null && daysUntilExpiry <= 0 ? "Expired!" : `Expires in ${daysUntilExpiry} days`}
              </Text>
              <Text style={[styles.warningBody, { color: warningColor }]}>Expiry date: {product.expiryDate}</Text>
            </View>
          </View>
        )}

        <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <InfoRow icon="barcode" label="Barcode" value={product.sku} theme={theme} />
          <InfoRow icon="tag" label="Category" value={product.category} theme={theme} />
          <InfoRow icon="map-marker" label="Storage Location" value="Not set" theme={theme} />
          <InfoRow icon="account" label="Supplier" value="Not set" theme={theme} />
          <InfoRow icon="package-variant" label="Unit" value={product.unitType} theme={theme} />
          {product.manufacturingDate ? <InfoRow icon="calendar-clock" label="Manufacturing Date" value={product.manufacturingDate.slice(0, 10)} theme={theme} /> : null}
          {product.expiryDate ? <InfoRow icon="calendar" label="Expiry Date" value={product.expiryDate.slice(0, 10)} theme={theme} /> : null}
        </View>

        <Button mode="outlined" icon="barcode" onPress={openBarcodeLabel} style={styles.printLabelButton}>
          {translate(state.user.preferences?.language, "printBarcodeSkuLabel")}
        </Button>

        <View style={styles.actionRow}>
          <Button
            mode="contained"
            icon="arrow-up-right"
            onPress={() => router.push({ pathname: "/stock-movement", params: { type: "in", productId: product.id } } as Href)}
            style={[styles.actionButton, { flex: 1, backgroundColor: theme.colors.primary }]}
            labelStyle={styles.actionText}
            textColor={theme.colors.onPrimary}
          >
            Stock In
          </Button>

          <Button
            mode="contained"
            icon="arrow-down-right"
            onPress={() => router.push({ pathname: "/stock-movement", params: { type: "out", productId: product.id } } as Href)}
            style={[styles.actionButton, { flex: 1, backgroundColor: theme.colors.primary }]}
            labelStyle={styles.actionText}
            textColor={theme.colors.onPrimary}
          >
            Stock Out
          </Button>
        </View>

        <Button
          mode="outlined"
          onPress={removeProduct}
          style={styles.deleteButton}
          textColor={theme.colors.error}
          icon="delete-outline"
        >
          Delete Product
        </Button>
      </ScrollView>
      <PriceTagModal product={labelProduct} visible={Boolean(labelProduct)} language={state.user.preferences?.language ?? "English"} onDismiss={() => setLabelProduct(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
  },
  heroRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  imageWrap: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: 82,
    height: 82,
  },
  productEmoji: {
    fontSize: 38,
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    flexShrink: 1,
  },
  productCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  skuText: {
    fontSize: 11,
  },
  stockCard: {
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
  },
  stockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stockLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  stockValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  stockUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.28)",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stockMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaText: {
    fontSize: 10,
  },
  priceGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  priceBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  warningCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  warningBody: {
    fontSize: 11,
    marginTop: 2,
  },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.22)",
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 11,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  actionText: {
    fontWeight: "700",
    fontSize: 14,
  },
  printLabelButton: { marginTop: 14 },
  deleteButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { memo, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Card, Chip, Divider, IconButton, ProgressBar, Searchbar, Text, useTheme } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useStore } from "../../context/store";
import { getCurrency, getExpiryStatus, getProductStatus, Product } from "../../data/freshmart";
import { translate } from "../../lib/i18n";


export default function InventoryScreen() {
  const router = useRouter();
  const { state } = useStore();
  const theme = useTheme();
  const isSplitView = false;

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const language = state.user.preferences?.language ?? "English";

  // Derive categories dynamically from real product data
  const categories = useMemo(() => {
    const set = new Set<string>();
    (state.products || []).forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [state.products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (state.products || [])
      .filter((product) => {
        if (!product) return false;
        const prodName = product.name || "";
        const prodSku = product.sku || "";
        const matchesCategory = activeCategory === "All" || product.category === activeCategory;
        const matchesQuery = !query || prodName.toLowerCase().includes(query) || prodSku.toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
      })
      .sort((left, right) => (left.name || "").localeCompare(right.name || ""));
  }, [activeCategory, searchQuery, state.products]);

  const selectedProduct = filteredProducts[0] ?? null;

  const selectedStatus = selectedProduct ? getProductStatus(selectedProduct) : null;
  const selectedExpiry = selectedProduct ? getExpiryStatus(selectedProduct) : null;
  const selectedProgress = selectedProduct && selectedProduct.maxStock
    ? Math.min(selectedProduct.currentStock / selectedProduct.maxStock, 1)
    : 0;
  const selectedMargin = selectedProduct && selectedProduct.srpPrice
    ? selectedProduct.srpPrice - selectedProduct.unitPrice
    : 0;
  const selectedMarginPercent = selectedProduct && selectedProduct.srpPrice && selectedProduct.srpPrice > 0
    ? Math.round((selectedMargin / selectedProduct.srpPrice) * 100)
    : 0;

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.Content
          title={translate(language, "inventoryTitle")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton icon="cash-register" iconColor={theme.colors.onPrimary} onPress={() => router.push("/pos")} />
        <IconButton icon="barcode-scan" iconColor={theme.colors.onPrimary} onPress={() => router.push("/scan-modal")} />
        <IconButton icon="plus" iconColor={theme.colors.onPrimary} onPress={() => router.push("/add-product")} />
      </Appbar.Header>

      <View style={[styles.body, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.mainLayout}>
          {/* Left / Main Column: List & Filters */}
          <View style={styles.listColumn}>
            <Searchbar
              placeholder={translate(language, "searchPlaceholder")}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {categories.map((category) => (
                <Chip
                  key={category}
                  mode="outlined"
                  compact
                  selected={activeCategory === category}
                  onPress={() => setActiveCategory(category)}
                  style={[styles.chip, activeCategory === category ? styles.activeChip : styles.inactiveChip]}
                  textStyle={activeCategory === category ? styles.activeChipText : styles.inactiveChipText}
                >
                  {category === "All" ? translate(language, "allFilter") : category}
                </Chip>
              ))}
            </ScrollView>

            <View style={[styles.resultBar, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.summaryText, { color: theme.colors.onSecondaryContainer }]}>
                {filteredProducts.length} {translate(language, "productsFound")}
              </Text>
              <Text style={[styles.stockSummary, { color: theme.colors.onSecondaryContainer }]}>
                {translate(language, "totalStock")}: {state.products.reduce((total, product) => total + product.currentStock, 0)} {translate(language, "units")}
              </Text>
            </View>

            <Animated.View entering={FadeInUp.duration(300)} style={styles.productList}>
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={(_, index) => ({ length: 128, offset: 128 * index, index })}
                contentContainerStyle={{ paddingBottom: 88 }}
                renderItem={({ item }) => (
                  <ProductRow
                    product={item}
                    language={language}
                    isSelected={false}
                    onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } } as Href)}
                  />
                )}
                ListEmptyComponent={<Text style={styles.empty}>{translate(language, "noInventoryItems")}</Text>}
              />
            </Animated.View>
          </View>

          {/* Right Column: Desktop Detail View */}
          {isSplitView ? (
            <View style={[styles.detailColumn, { borderLeftColor: theme.colors.outline }]}>
              {selectedProduct ? (
                <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  {/* Hero Card */}
                  <Card style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                    <Card.Content>
                      <View style={styles.detailHeader}>
                        {selectedProduct.imageUri ? (
                          <Image source={{ uri: selectedProduct.imageUri }} style={styles.detailImage} contentFit="cover" />
                        ) : (
                          <View style={[styles.detailIconBubble, { backgroundColor: `${theme.colors.primary}18` }]}>
                            <MaterialCommunityIcons name="package-variant-closed" size={36} color={theme.colors.primary} />
                          </View>
                        )}
                        <View style={styles.detailHeaderMeta}>
                          <Text style={[styles.detailTitle, { color: theme.colors.onSurface }]}>
                            {selectedProduct.name}
                          </Text>
                          <Text style={[styles.detailSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                            {selectedProduct.sku} · {selectedProduct.category}
                          </Text>
                          {selectedStatus ? (
                            <Chip
                              compact
                              style={[
                                styles.detailStatusChip,
                                {
                                  backgroundColor:
                                    selectedStatus.tone === "healthy"
                                      ? `${theme.colors.secondary}22`
                                      : selectedStatus.tone === "warning"
                                      ? `${theme.colors.tertiary}22`
                                      : `${theme.colors.error}22`,
                                },
                              ]}
                              textStyle={{
                                color:
                                  selectedStatus.tone === "healthy"
                                    ? theme.colors.secondary
                                    : selectedStatus.tone === "warning"
                                    ? theme.colors.tertiary
                                    : theme.colors.error,
                                fontWeight: "700",
                              }}
                            >
                              {selectedStatus.label}
                            </Chip>
                          ) : null}
                        </View>
                      </View>

                      <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.outline }} />

                      {/* Stock Level Progress */}
                      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Stock Levels</Text>
                      <View style={styles.stockLevelRow}>
                        <ProgressBar
                          progress={selectedProgress}
                          color={
                            selectedStatus?.tone === "healthy"
                              ? theme.colors.secondary
                              : selectedStatus?.tone === "warning"
                              ? theme.colors.tertiary
                              : theme.colors.error
                          }
                          style={styles.detailProgressBar}
                        />
                        <Text style={[styles.stockRatioText, { color: theme.colors.onSurface }]}>
                          {selectedProduct.currentStock} / {selectedProduct.maxStock} {selectedProduct.unitType}
                        </Text>
                      </View>
                      <Text style={[styles.thresholdNotice, { color: theme.colors.onSurfaceVariant }]}>
                        Low stock alert triggers at {selectedProduct.lowStockThreshold} units.
                      </Text>

                      <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.outline }} />

                      {/* Financials & SRP */}
                      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Pricing & Margins</Text>
                      <View style={styles.financialGrid}>
                        <View style={[styles.financialBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text style={[styles.financialLabel, { color: theme.colors.onSurfaceVariant }]}>Cost Price</Text>
                          <Text style={[styles.financialValue, { color: theme.colors.onSurface }]}>
                            {getCurrency(selectedProduct.unitPrice)}
                          </Text>
                        </View>
                        <View style={[styles.financialBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text style={[styles.financialLabel, { color: theme.colors.onSurfaceVariant }]}>Retail Price (SRP)</Text>
                          <Text style={[styles.financialValue, { color: theme.colors.primary }]}>
                            {selectedProduct.srpPrice ? getCurrency(selectedProduct.srpPrice) : "Not set"}
                          </Text>
                        </View>
                        <View style={[styles.financialBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text style={[styles.financialLabel, { color: theme.colors.onSurfaceVariant }]}>Gross Margin</Text>
                          <Text style={[styles.financialValue, { color: theme.colors.secondary }]}>
                            {selectedProduct.srpPrice ? `${getCurrency(selectedMargin)} (${selectedMarginPercent}%)` : "—"}
                          </Text>
                        </View>
                      </View>

                      {/* Dates */}
                      {selectedProduct.manufacturingDate || selectedProduct.expiryDate ? (
                        <>
                          <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.outline }} />
                          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Dates & Tracking</Text>
                          <View style={styles.dateRow}>
                            {selectedProduct.manufacturingDate ? (
                              <View style={styles.dateItem}>
                                <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>Mfg Date</Text>
                                <Text style={[styles.dateVal, { color: theme.colors.onSurface }]}>
                                  {selectedProduct.manufacturingDate.slice(0, 10)}
                                </Text>
                              </View>
                            ) : null}
                            {selectedProduct.expiryDate ? (
                              <View style={styles.dateItem}>
                                <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>Expiry Date</Text>
                                <Text style={[styles.dateVal, { color: theme.colors.onSurface }]}>
                                  {selectedProduct.expiryDate.slice(0, 10)} ({selectedExpiry?.label})
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </>
                      ) : null}

                      <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.outline }} />

                      {/* Quick Action Buttons */}
                      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, marginBottom: 10 }]}>Quick Actions</Text>
                      <View style={styles.actionButtonsRow}>
                        <Button
                          mode="contained"
                          icon="arrow-up-right"
                          buttonColor={theme.colors.primary}
                          onPress={() =>
                            router.push({
                              pathname: "/stock-movement",
                              params: { type: "in", productId: selectedProduct.id },
                            } as Href)
                          }
                          style={styles.actionBtn}
                        >
                          Stock In
                        </Button>
                        <Button
                          mode="contained"
                          icon="arrow-down-right"
                          buttonColor={theme.colors.primary}
                          onPress={() =>
                            router.push({
                              pathname: "/stock-movement",
                              params: { type: "out", productId: selectedProduct.id },
                            } as Href)
                          }
                          style={styles.actionBtn}
                        >
                          Stock Out
                        </Button>
                        <Button
                          mode="outlined"
                          icon="pencil-outline"
                          onPress={() =>
                            router.push({
                              pathname: "/add-product",
                              params: { id: selectedProduct.id },
                            } as Href)
                          }
                          style={styles.actionBtn}
                        >
                          Edit
                        </Button>
                        <Button
                          mode="outlined"
                          icon="open-in-new"
                          onPress={() =>
                            router.push({
                              pathname: "/product/[id]",
                              params: { id: selectedProduct.id },
                            } as Href)
                          }
                          style={styles.actionBtn}
                        >
                          Full Details
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                </ScrollView>
              ) : (
                <View style={styles.noDetailSelected}>
                  <MaterialCommunityIcons name="cursor-default-click-outline" size={48} color={theme.colors.onSurfaceVariant} />
                  <Text style={[styles.noDetailText, { color: theme.colors.onSurfaceVariant }]}>
                    Select a product to view details
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const ProductRow = memo(function ProductRow({
  product,
  language,
  isSelected,
  onPress,
}: {
  product: Product;
  language: string;
  isSelected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const status = getProductStatus(product);

  const statusBackground = (tone: string) =>
    tone === "healthy"
      ? `${theme.colors.secondary}22`
      : tone === "warning"
      ? `${theme.colors.tertiary}22`
      : `${theme.colors.error}22`;

  const statusColor = (tone: string) =>
    tone === "healthy"
      ? theme.colors.secondary
      : tone === "warning"
      ? theme.colors.tertiary
      : theme.colors.error;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}>
      <View
        style={[
          styles.card,
          { backgroundColor: isSelected ? (theme.dark ? `${theme.colors.primary}30` : "#EEF3FC") : theme.colors.surface },
          { borderBottomColor: theme.colors.outline },
          isSelected && { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.imageColumn}>
              <View style={styles.imageWrap}>
                {product.imageUri ? (
                  <Image source={{ uri: product.imageUri }} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={[styles.iconBubble, { backgroundColor: statusBackground(status.tone) }]}>
                    <MaterialCommunityIcons name="package-variant-closed" size={26} color={theme.colors.primary} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.productDetails}>
              <View style={styles.itemTopRow}>
                <Text style={[styles.itemName, { color: theme.colors.onSurface }]} numberOfLines={1} ellipsizeMode="tail">
                  {product.name}
                </Text>
                <Chip compact style={[styles.statusChip, { backgroundColor: statusBackground(status.tone) }]} textStyle={{ color: statusColor(status.tone) }}>
                  {status.label}
                </Chip>
              </View>
              <Text style={[styles.itemMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">
                {product.sku} · {product.category}
              </Text>
              <View style={styles.stockRow}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.stockText, { color: theme.colors.onSurface }]}>
                  {product.currentStock}/{product.maxStock} {product.unitType}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {},
  headerTitle: { fontWeight: "800" },
  body: { flex: 1, marginTop: -12, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  mainLayout: { flex: 1, minWidth: 0 },
  desktopLayout: { flexDirection: "row", gap: 16 },
  listColumn: { flex: 1, minWidth: 0 },
  tabletListColumn: { flexGrow: 0, flexShrink: 0, width: 340 },
  desktopListColumn: { flexGrow: 0, flexShrink: 0, width: 400 },
  detailColumn: { flex: 1, borderLeftWidth: 1, paddingLeft: 16, minWidth: 0 },
  detailScroll: { paddingBottom: 40 },
  detailCard: { borderRadius: 16, borderWidth: 1, elevation: 0 },
  detailHeader: { flexDirection: "row", gap: 16, alignItems: "center" },
  detailImage: { width: 72, height: 72, borderRadius: 16 },
  detailIconBubble: { width: 72, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  detailHeaderMeta: { flex: 1 },
  detailTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  detailSubtitle: { fontSize: 13, marginBottom: 8 },
  detailStatusChip: { alignSelf: "flex-start", borderRadius: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  stockLevelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailProgressBar: { flex: 1, height: 8, borderRadius: 999 },
  stockRatioText: { fontSize: 14, fontWeight: "700" },
  thresholdNotice: { fontSize: 12, marginTop: 4 },
  financialGrid: { flexDirection: "row", gap: 10 },
  financialBox: { flex: 1, padding: 10, borderRadius: 10 },
  financialLabel: { fontSize: 11, marginBottom: 4 },
  financialValue: { fontSize: 14, fontWeight: "700" },
  dateRow: { flexDirection: "row", gap: 20 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 11, marginBottom: 2 },
  dateVal: { fontSize: 13, fontWeight: "600" },
  actionButtonsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: { borderRadius: 8 },
  noDetailSelected: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noDetailText: { fontSize: 15, fontWeight: "600" },
  searchBar: { marginBottom: 12, elevation: 0 },
  searchInput: { fontSize: 14, minHeight: 0 },
  summaryBar: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 16, marginBottom: 12 },
  resultBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, marginHorizontal: -16, marginBottom: 0 },
  stockSummary: { fontSize: 13 },
  summaryText: { fontWeight: "600" },
  filterScroll: { flexGrow: 0, height: 52, marginBottom: 12 },
  filterRow: { flexDirection: "row", paddingBottom: 12, paddingLeft: 4, paddingRight: 4 },
  productList: { flex: 1, minHeight: 0 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  chip: { paddingHorizontal: 10, minHeight: 40, height: 40, marginRight: 8, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  activeChip: {},
  inactiveChip: { borderWidth: 1 },
  activeChipText: {},
  inactiveChipText: {},
  cardWrap: { height: 128, marginBottom: 0 },
  card: { borderBottomWidth: 1 },
  cardContent: { paddingVertical: 14, paddingHorizontal: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0, paddingRight: 8 },
  imageColumn: { width: 68, alignItems: "center" },
  imageWrap: { width: 56, height: 56, borderRadius: 16, overflow: "hidden" },
  image: { width: 56, height: 56, borderRadius: 16 },
  iconBubble: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  productDetails: { flex: 1, minWidth: 0 },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, minWidth: 0 },
  itemName: { fontSize: 15, fontWeight: "600", flex: 1, flexShrink: 1, marginRight: 4 },
  itemMeta: { fontSize: 13, marginTop: 2, marginBottom: 9 },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  stockText: { fontSize: 13, minWidth: 80, maxWidth: 118, flexShrink: 0, textAlign: "left" },
  statusChip: { borderRadius: 8, flexShrink: 0, alignSelf: "flex-start" },
  empty: { textAlign: "center", marginTop: 24 },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Chip, IconButton, ProgressBar, Searchbar, Text, useTheme } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useStore } from "../../context/store";
import { getProductStatus, Product } from "../../data/freshmart";
import { translate } from "../../lib/i18n";

const categories = ["All", "Grains & Rice", "Oil & Condiments", "Dairy", "Instant Foods", "Sugar & Sweeteners", "Canned Goods", "Snacks", "Beverages", "Frozen Goods", "Personal Care"];

export default function InventoryScreen() {
  const router = useRouter();
  const { state } = useStore();
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const language = state.user.preferences?.language ?? "English";

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
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.Content
          title={translate(language, "inventoryTitle")}
          titleStyle={[styles.headerTitle, { color: theme.colors.onPrimary }]}
        />
        <IconButton icon="cash-register" iconColor={theme.colors.onPrimary} onPress={() => router.push("/pos" as any)} />
        <IconButton icon="barcode-scan" iconColor={theme.colors.onPrimary} onPress={() => router.push("/scan-modal" as any)} />
        <IconButton icon="plus" iconColor={theme.colors.onPrimary} onPress={() => router.push("/add-product" as any)} />
      </Appbar.Header>

      <View style={[styles.body, { backgroundColor: theme.colors.surface }]}> 
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
          <Text style={[styles.summaryText, { color: theme.colors.onSecondaryContainer }]}>{filteredProducts.length} {translate(language, "productsFound")}</Text>
          <Text style={[styles.stockSummary, { color: theme.colors.onSecondaryContainer }]}>{translate(language, "totalStock")}: {state.products.reduce((total, product) => total + product.currentStock, 0)} {translate(language, "units")}</Text>
        </View>

        <Animated.View entering={FadeInUp.duration(300)} style={styles.productList}>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 28 }}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              language={language}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } } as any)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>{translate(language, "noInventoryItems")}</Text>}
        />
        </Animated.View>
      </View>
    </View>
  );
}

function ProductRow({ product, language, onPress }: { product: Product; language: string; onPress: () => void }) {
  const theme = useTheme();
  const status = getProductStatus(product);
  const progress = product.maxStock ? Math.min(product.currentStock / product.maxStock, 1) : 0;

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
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}> 
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
                <Text style={[styles.itemName, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
                <Chip compact style={[styles.statusChip, { backgroundColor: statusBackground(status.tone) }]} textStyle={{ color: statusColor(status.tone) }}>{status.label}</Chip>
              </View>
              <Text style={[styles.itemMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">{product.sku} · {product.category}</Text>
              <View style={styles.stockRow}><ProgressBar progress={progress} color={statusColor(status.tone)} style={styles.progress} /><Text style={[styles.stockText, { color: theme.colors.onSurface }]}>{product.currentStock}/{product.maxStock} {product.unitType}</Text></View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {},
  headerTitle: { fontWeight: "800" },
  body: { flex: 1, marginTop: -12, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  searchBar: { marginBottom: 12, elevation: 0 },
  searchInput: { fontSize: 14, minHeight: 0 },
  summaryBar: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 14, marginBottom: 12 },
  resultBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12, marginHorizontal: -16, marginBottom: 0 },
  stockSummary: { fontSize: 12 },
  summaryText: { fontWeight: "700" },
  search: { marginBottom: 12 },
  filterScroll: { flexGrow: 0, height: 52, marginBottom: 12 },
  filterRow: { flexDirection: "row", paddingBottom: 12, paddingLeft: 4, paddingRight: 4 },
  productList: { flex: 1, minHeight: 0 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  chip: { paddingHorizontal: 10, minHeight: 40, height: 40, marginRight: 8, alignItems: "center", justifyContent: "center" },
  activeChip: {},
  inactiveChip: { borderWidth: 1 },
  activeChipText: {},
  inactiveChipText: {},
  cardWrap: { marginBottom: 12 },
  card: { borderBottomWidth: 1 },
  cardContent: { paddingVertical: 14, paddingHorizontal: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  imageColumn: { width: 68, alignItems: "center" },
  imageWrap: { width: 56, height: 56, borderRadius: 18, overflow: "hidden" },
  image: { width: 56, height: 56, borderRadius: 18 },
  iconBubble: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 22 },
  productDetails: { flex: 1, minWidth: 0 },
  itemTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, minWidth: 0 },
  itemName: { fontWeight: "800", flex: 1, flexShrink: 1, marginRight: 4 },
  itemMeta: { marginTop: 2, marginBottom: 9 },
  stockRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progress: { height: 8, borderRadius: 999, flex: 1 },
  stockText: { fontSize: 12, minWidth: 95, flexShrink: 0 },
  statusChip: { borderRadius: 12, flexShrink: 0, alignSelf: "flex-start" },
  empty: { textAlign: "center", marginTop: 24 },
});

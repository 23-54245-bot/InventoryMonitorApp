import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, useTheme } from "react-native-paper";

import { useStore } from "../../context/store";
import { formatRelativeTime, getExpiringProducts, getExpiryStatus, getLowStockProducts, type Product } from "../../data/freshmart";
import { translate } from "../../lib/i18n";

const filters = ["All", "Unread", "Low Stock", "Expiry"] as const;

export default function AlertsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state, notifications, markAllNotificationsRead, markNotificationRead, deleteNotification, summary } = useStore();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>(filter === "Low Stock" ? "Low Stock" : filter === "Expiry" ? "Expiry" : "All");
  useEffect(() => {
    if (filter === "Low Stock" || filter === "Expiry") {
      setActiveFilter(filter);
    }
  }, [filter]);
  const language = state.user.preferences?.language ?? "English";
  const lowStockProducts = useMemo(() => getLowStockProducts(state.products), [state.products]);

  const visible = useMemo(() => {
    return notifications.filter((notification) => {
      if (activeFilter === "All") return true;
      if (activeFilter === "Unread") return !notification.isRead;
      if (activeFilter === "Low Stock") return notification.type === "low_stock";
      if (activeFilter === "Expiry") return notification.type === "expiry";
      return true;
    });
  }, [activeFilter, notifications]);

  const colorByType = {
    low_stock: { bg: `${theme.colors.error}18`, icon: "alert-outline", color: theme.colors.error },
    expiry: { bg: `${theme.colors.tertiary}18`, icon: "calendar-alert", color: theme.colors.tertiary },
    stock_received: { bg: `${theme.colors.primary}18`, icon: "arrow-up-circle-outline", color: theme.colors.primary },
    stock_out: { bg: `${theme.colors.secondary}18`, icon: "arrow-down-circle-outline", color: theme.colors.secondary },
    info: { bg: theme.colors.surfaceVariant, icon: "bell-outline", color: theme.colors.onSurfaceVariant },
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <View style={styles.statusBar}><Text style={[styles.statusTime, { color: theme.colors.onSurfaceVariant }]}>9:41 AM</Text><Text style={[styles.statusSignal, { color: theme.colors.onSurfaceVariant }]}>◒</Text></View>
      <View style={styles.content}>
        <View style={styles.headingRow}>
          <View style={styles.headingGroup}>
              <View style={styles.titleRow}>
                <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{activeFilter === "Low Stock" ? translate(language, "lowStockAlertsTitle") : activeFilter === "Expiry" ? translate(language, "expiryMonitoringTitle") : translate(language, "notificationsTitle")}</Text>
              {summary.unreadNotifications > 0 ? <View style={[styles.countBadge, { backgroundColor: theme.colors.error }]}><Text style={styles.countText}>{summary.unreadNotifications}</Text></View> : null}
            </View>
          </View>
          {activeFilter === "All" || activeFilter === "Unread" ? <Button compact textColor={theme.colors.primary} onPress={markAllNotificationsRead}>{translate(language, "markAllRead")}</Button> : null}
        </View>

        <View style={styles.filterRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === filter }}
              onPress={() => setActiveFilter(filter)}
              style={activeFilter === filter ? [styles.activeChip, { backgroundColor: theme.colors.primary }] : [styles.inactiveChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            >
              <Text style={activeFilter === filter ? [styles.activeChipText, { color: theme.colors.surface }] : [styles.inactiveChipText, { color: theme.colors.onSurface }]}>
                {filter === "All" ? translate(language, "filterAll") : filter === "Unread" ? translate(language, "filterUnread") : filter === "Low Stock" ? translate(language, "filterLowStock") : translate(language, "filterExpiry")}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeFilter === "Low Stock" ? (
          <LowStockPanel language={language} products={lowStockProducts} onRestock={(product) => router.push({ pathname: "/stock-movement", params: { type: "in", productId: product.id } } as any)} />
        ) : activeFilter === "Expiry" ? (
          <ExpiryPanel language={language} products={getExpiringProducts(state.products)} onView={(product) => router.push({ pathname: "/product/[id]", params: { id: product.id } } as any)} />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.notificationRow, !item.isRead && { backgroundColor: `${theme.colors.primary}06` }, { borderBottomColor: theme.colors.outline }]}>
                <View style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: colorByType[item.type].bg }]}>
                    <IconButton icon={colorByType[item.type].icon} iconColor={colorByType[item.type].color} size={21} style={styles.badgeIcon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
                    <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>{item.message}</Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>{formatRelativeTime(item.createdAt)}</Text>
                      <View style={styles.actionsRow}>
                        {!item.isRead ? <IconButton icon="check" iconColor={theme.colors.primary} size={18} onPress={() => markNotificationRead(item.id)} /> : null}
                        <IconButton icon="trash-can-outline" iconColor={theme.colors.onSurfaceVariant} size={18} onPress={() => deleteNotification(item.id)} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{translate(language, "noNotificationsFilter")}</Text>}
          />
        )}
      </View>
    </View>
  );
}

function LowStockPanel({ language, products, onRestock }: { language: string; products: Product[]; onRestock: (product: Product) => void }) {
  const theme = useTheme();
  const outOfStock = products.filter((product) => product.currentStock <= 0);
  const lowStock = products.filter((product) => product.currentStock > 0);

  return (
    <FlatList
      data={lowStock}
      keyExtractor={(product) => product.id}
      style={styles.list}
      contentContainerStyle={styles.lowStockContent}
      ListHeaderComponent={
        <View>
          <View style={styles.lowStockStats}>
            <LowStockStat value={lowStock.length} label={translate(language, "lowStockLabel")} color={theme.colors.tertiary} />
            <LowStockStat value={outOfStock.length} label={translate(language, "outOfStockLabel")} color={theme.colors.error} />
            <LowStockStat value={products.length} label={translate(language, "totalAlertsLabel")} color={theme.colors.primary} />
          </View>
          {outOfStock.length > 0 ? <Text style={[styles.groupTitle, { color: theme.colors.onSurface }]}>{translate(language, "outOfStockLabel")}</Text> : null}
          {outOfStock.map((product) => <LowStockItem key={product.id} language={language} product={product} outOfStock onRestock={onRestock} />)}
          {lowStock.length > 0 ? <Text style={[styles.groupTitle, { color: theme.colors.onSurface }]}>{translate(language, "lowStockLabel")}</Text> : null}
        </View>
      }
      renderItem={({ item }) => <LowStockItem language={language} product={item} onRestock={onRestock} />}
      ListEmptyComponent={<Text style={styles.empty}>{translate(language, "noLowStockProducts")}</Text>}
    />
  );
}

function LowStockStat({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={styles.lowStockStat}><Text style={[styles.lowStockValue, { color }]}>{value}</Text><Text style={styles.lowStockLabel}>{label}</Text></View>;
}

function LowStockItem({ language, product, outOfStock = false, onRestock }: { language: string; product: Product; outOfStock?: boolean; onRestock: (product: Product) => void }) {
  const theme = useTheme();
  const needed = Math.max(product.lowStockThreshold - product.currentStock, 0);
  return (
    <Card style={[styles.lowStockCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Card.Content>
        <View style={styles.lowStockHeader}>
          <Text style={styles.productIcon}>{product.icon}</Text>
          <View style={styles.lowStockIdentity}>
            <View style={styles.productTitleRow}>
              <Text style={[styles.productTitle, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
              <Text style={[styles.stateBadge, { color: outOfStock ? theme.colors.error : theme.colors.tertiary }]}>{outOfStock ? "OUT" : "LOW"}</Text>
            </View>
            <Text style={[styles.productMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">{product.sku} · {product.category}</Text>
          </View>
        </View>
        <View style={styles.lowStockDetails}><View><Text style={[styles.remaining, { color: theme.colors.onSurface }]}>{product.currentStock} {product.unitType} {translate(language, "remainingLabel")}</Text><Text style={[styles.minimum, { color: theme.colors.onSurfaceVariant }]}>{outOfStock ? `${translate(language, "minRequiredLabel")}: ${product.lowStockThreshold}` : `Need ${needed} more to reach min`}</Text></View><Button compact mode="contained" buttonColor={theme.colors.primary} onPress={() => onRestock(product)}>{outOfStock ? translate(language, "restockLabel") : translate(language, "restockNowLabel")}</Button></View>
      </Card.Content>
    </Card>
  );
}

function ExpiryPanel({ language, products, onView }: { language: string; products: Product[]; onView: (product: Product) => void }) {
  const theme = useTheme();
  const expired = products.filter((product) => getExpiryStatus(product).tone === "critical");
  const urgent = products.filter((product) => getExpiryStatus(product).tone === "warning");
  const upcoming = products.filter((product) => getExpiryStatus(product).tone === "healthy");

  return (
    <FlatList
      data={products}
      keyExtractor={(product) => product.id}
      style={styles.list}
      contentContainerStyle={styles.lowStockContent}
      ListHeaderComponent={
        <View>
          <View style={styles.lowStockStats}>
            <LowStockStat value={expired.length} label={translate(language, "expiredLabel")} color={theme.colors.error} />
            <LowStockStat value={urgent.length} label={translate(language, "dueSoonLabel")} color={theme.colors.tertiary} />
            <LowStockStat value={products.length} label={translate(language, "totalItemsLabel")} color={theme.colors.primary} />
          </View>
          {expired.length > 0 ? <Text style={[styles.groupTitle, { color: theme.colors.onSurface }]}>{translate(language, "expiredLabel")}</Text> : null}
          {expired.map((product) => <ExpiryItem key={product.id} language={language} product={product} onView={onView} />)}
          {urgent.length > 0 ? <Text style={[styles.groupTitle, { color: theme.colors.onSurface }]}>{translate(language, "expiringSoonTitle")}</Text> : null}
        </View>
      }
      renderItem={({ item }) => upcoming.includes(item) ? <ExpiryItem language={language} product={item} onView={onView} /> : urgent.includes(item) ? <ExpiryItem language={language} product={item} onView={onView} /> : null}
      ListEmptyComponent={<Text style={styles.empty}>{translate(language, "noExpiringProducts")}</Text>}
    />
  );
}

function ExpiryItem({ language, product, onView }: { language: string; product: Product; onView: (product: Product) => void }) {
  const theme = useTheme();
  const expiry = getExpiryStatus(product);
  const statusColor = expiry.tone === "critical" ? theme.colors.error : expiry.tone === "warning" ? theme.colors.tertiary : theme.colors.secondary;
  return (
    <Card style={[styles.lowStockCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Card.Content>
        <View style={styles.lowStockHeader}>
          <View style={[styles.badge, { backgroundColor: `${statusColor}18` }]}><IconButton icon="calendar-alert" iconColor={statusColor} size={21} style={styles.badgeIcon} /></View>
          <View style={styles.lowStockIdentity}>
            <View style={styles.productTitleRow}>
              <Text style={[styles.productTitle, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{product.name}</Text>
              <Text style={[styles.stateBadge, { color: statusColor }]}>{expiry.label.toUpperCase()}</Text>
            </View>
            <Text style={[styles.productMeta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">{product.sku} · {product.category}</Text>
          </View>
        </View>
        <View style={styles.lowStockDetails}><View><Text style={[styles.remaining, { color: theme.colors.onSurface }]}>{translate(language, "expiryDateLabel")}</Text><Text style={[styles.minimum, { color: theme.colors.onSurfaceVariant }]}>{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : translate(language, "noExpiryDate")}</Text></View><Button compact mode="contained" buttonColor={theme.colors.primary} onPress={() => onView(product)}>{translate(language, "viewProductButton")}</Button></View>
      </Card.Content>
    </Card>
  );
}


const styles = StyleSheet.create({
  page: { flex: 1 },
  statusBar: { height: 28, paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  statusTime: { fontSize: 12, fontWeight: "700" },
  statusSignal: { fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 14, paddingBottom: 18 },
  headingGroup: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  countBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  countText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8, height: 44, paddingBottom: 12, alignItems: "center" },
  list: { flex: 1 },
  listContent: { paddingBottom: 28 },
  activeChip: { height: 30, minHeight: 30, paddingHorizontal: 12, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  inactiveChip: { height: 30, minHeight: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  activeChipText: { fontSize: 12, lineHeight: 14 },
  inactiveChipText: { fontSize: 12, lineHeight: 14 },
  notificationRow: { paddingVertical: 14, borderBottomWidth: 1 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badgeIcon: { margin: 0 },
  title: { fontWeight: "800", marginBottom: 3 },
  message: { lineHeight: 18, marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { fontSize: 12, marginTop: 2 },
  actionsRow: { flexDirection: "row", alignItems: "center", marginRight: -8, marginTop: -4, marginBottom: -8 },
  empty: { textAlign: "center", marginTop: 24 },
  lowStockContent: { paddingBottom: 28 },
  lowStockStats: { flexDirection: "row", gap: 8, marginBottom: 16 },
  lowStockStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(203,213,225,0.8)", padding: 10 },
  lowStockValue: { fontSize: 22, fontWeight: "800" },
  lowStockLabel: { fontSize: 10, color: "#475569", marginTop: 3 },
  groupTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8, marginTop: 4 },
  lowStockCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, elevation: 1 },
  lowStockHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  productIcon: { fontSize: 28, width: 42, textAlign: "center" },
  lowStockIdentity: { flex: 1, minWidth: 0 },
  productTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, minWidth: 0 },
  productTitle: { fontWeight: "800", flex: 1, flexShrink: 1, marginRight: 6 },
  stateBadge: { fontSize: 11, fontWeight: "800", flexShrink: 0, marginTop: 2 },
  productMeta: { fontSize: 12, marginTop: 3 },
  lowStockDetails: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14 },
  remaining: { fontWeight: "700" },
  minimum: { fontSize: 12, marginTop: 3 },
});

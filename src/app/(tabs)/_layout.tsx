import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Href } from "expo-router";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, Avatar, Badge, TouchableRipple, useTheme } from "react-native-paper";

import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { translate } from "../../lib/i18n";

const tabDefinitions = [
  { name: "index", titleKey: "tabHome", icon: "home-variant-outline", activeIcon: "home-variant", visible: true },
  { name: "inventory", titleKey: "tabInventory", icon: "warehouse", activeIcon: "warehouse", visible: true },
  { name: "reports", titleKey: "tabReports", icon: "chart-box-outline", activeIcon: "chart-box", visible: true },
  { name: "alerts", titleKey: "tabAlerts", icon: "alert-circle-outline", activeIcon: "alert-circle", visible: true },
  { name: "profile", titleKey: "tabProfile", icon: "account-circle-outline", activeIcon: "account-circle", visible: true },
];

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { height: viewportHeight } = useWindowDimensions();
  const breakpoint = useBreakpoint();
  const hasSidebar = breakpoint === "tablet" || breakpoint === "desktop";
  const [sidebarOpen, setSidebarOpen] = useState(() => breakpoint === "desktop");
  const [fabOpen, setFabOpen] = useState(false);
  const isCompactSidebar = false;

  const { session, isReady, getAllowedRoutes, getHomeRoute, hasRouteAccess } = useAuth();
  const { summary, state } = useStore();
  const language = state.user.preferences?.language ?? "English";

  if (!isReady) {
    return <ActivityIndicator animating color={theme.colors.primary} style={{ flex: 1 }} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  const currentRoute = pathname === "/" || pathname === "/index" ? "index" : pathname.replace(/^\//, "").split("/")[0];

  if (currentRoute && !hasRouteAccess(currentRoute, session.role)) {
    return <Redirect href={getHomeRoute(session.role) as Href} />;
  }

  const allowedRoutes = getAllowedRoutes(session.role);
  const visibleTabs = tabDefinitions.filter((definition) => {
    if (!allowedRoutes.includes(definition.name) || !definition.visible) {
      return false;
    }

    if (session.role === "Staff" && definition.name === "reports") {
      return false;
    }

    return true;
  });

  const roleQuickActions = session.role === "Staff"
    ? [
      { label: translate(language, "posTitle"), icon: "cash-register", route: "/pos", accent: theme.colors.primary },
      { label: translate(language, "salesHistory"), icon: "history", route: "/sales-history", accent: theme.colors.secondary },
    ]
    : [
      { label: translate(language, "posTitle"), icon: "cash-register", route: "/pos", accent: theme.colors.primary },
      { label: translate(language, "utangTitle"), icon: "book-account", route: "/utang", accent: theme.colors.tertiary },
      { label: translate(language, "purchaseOrdersAction"), icon: "clipboard-list-outline", route: "/purchase-order", accent: theme.colors.secondary },
      { label: translate(language, "stockInLabel"), icon: "package-down", route: { pathname: "/stock-movement", params: { type: "in" } }, accent: theme.colors.secondary },
      { label: translate(language, "stockOutLabel"), icon: "package-up", route: { pathname: "/stock-movement", params: { type: "out" } }, accent: theme.colors.tertiary },
      { label: translate(language, "productAddButton"), icon: "tag-plus-outline", route: "/add-product", accent: theme.colors.error },
    ];
  const quickActions = roleQuickActions.filter((action) => {
    const route = typeof action.route === "string" ? action.route : action.route.pathname;
    return allowedRoutes.includes(route.replace(/^\//, ""));
  });
  const adminActionSize = Math.min(52, Math.max(40, viewportHeight * 0.0325));
  const adminActionGap = Math.min(120, Math.max(adminActionSize + 4, viewportHeight * 0.072));
  const adminActionMenuHeight = adminActionSize + Math.max(0, quickActions.length - 1) * adminActionGap;
  const adminActionBottomOffset = 192;
  const adminActionMenuTop = Math.max(
    12,
    Math.min(viewportHeight * 0.53, viewportHeight - adminActionBottomOffset - adminActionMenuHeight),
  );

  const hasAdminNavigation = session.role === "Admin" || session.role === "Manager";

  const quickActionsContent = hasAdminNavigation
    ? !fabOpen ? (
      <Pressable
        accessibilityLabel="Quick actions"
        onPress={() => setFabOpen((open) => !open)}
        style={[styles.centerFab, { backgroundColor: theme.colors.primary }]}
      >
        <MaterialCommunityIcons name={fabOpen ? "close" : "plus"} size={32} color={theme.colors.onPrimary} />
      </Pressable>
    ) : null
    : (
      <Pressable
        accessibilityLabel={fabOpen ? "Close quick actions" : "Quick actions"}
        onPress={() => setFabOpen((open) => !open)}
        style={[styles.centerFab, { backgroundColor: theme.colors.primary }]}
      >
        <MaterialCommunityIcons name={fabOpen ? "close" : "plus"} size={32} color={theme.colors.onPrimary} />
      </Pressable>
    );

  return (
    <View style={[styles.shell, { flexDirection: hasSidebar ? "row" : "column" }]}>
      {hasSidebar && sidebarOpen ? (
        <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outline }]}>
          {/* Brand Header */}
          <View style={styles.brandRow}>
            <Image
              source={require("../../../assets/images/stocktrack-logo-transparent.png")}
              style={styles.sidebarLogo}
              resizeMode="contain"
            />
            <View style={[styles.brandTextWrap, isCompactSidebar && styles.hiddenSidebarText]}>
              <Text style={[styles.brandTitle, { color: theme.colors.primary }]}>StockTrack</Text>
              <Text numberOfLines={1} style={[styles.brandSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {state.user.storeName || "Inventory"}
              </Text>
            </View>
            <TouchableRipple
              onPress={() => setSidebarOpen(false)}
              style={styles.menuButton}
              borderless
              accessibilityLabel={translate(language, "closeNavigation")}
            >
              <MaterialCommunityIcons name="menu-open" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableRipple>
          </View>

          {/* Navigation Links */}
          <View style={styles.navSection}>
            {visibleTabs.map((item) => {
              const isSelected = currentRoute === item.name || (item.name === "index" && (pathname === "/" || pathname === "/index"));
              const iconName = isSelected ? item.activeIcon : item.icon;
              const hasAlertBadge = item.name === "alerts" && summary.unreadNotifications > 0;

              return (
                <TouchableRipple
                  key={item.name}
                  onPress={() => {
                    const targetRoute = item.name === "index" ? "/" : `/(tabs)/${item.name}`;
                    router.push(targetRoute as Href);
                  }}
                  style={[
                    styles.navItem,
                    isSelected && {
                      backgroundColor: theme.dark ? `${theme.colors.primary}33` : `${theme.colors.primary}14`,
                    },
                  ]}
                  borderless
                >
                  <View style={styles.navItemContent}>
                    <MaterialCommunityIcons
                      name={iconName as any}
                      size={20}
                      color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      accessibilityLabel={translate(language, item.titleKey)}
                      style={[
                        styles.navItemLabel,
                        isCompactSidebar && styles.hiddenSidebarText,
                        {
                          color: isSelected ? theme.colors.primary : theme.colors.onSurface,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {translate(language, item.titleKey)}
                    </Text>
                    {hasAlertBadge ? (
                      <Badge size={18} style={styles.navBadge}>
                        {summary.unreadNotifications}
                      </Badge>
                    ) : null}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          {/* User Profile & Settings Footer */}
          <View style={[styles.sidebarFooter, { borderTopColor: theme.colors.outline }]}>
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as Href)}
              style={[styles.userSection, isCompactSidebar && styles.compactUserSection]}
              accessibilityLabel={session?.name || "User"}
            >
              <Avatar.Text
                size={36}
                label={session?.name ? session.name.slice(0, 2).toUpperCase() : "ST"}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={[styles.userTextWrap, isCompactSidebar && styles.hiddenSidebarText]}>
                <Text numberOfLines={1} style={[styles.userName, { color: theme.colors.onSurface }]}>
                  {session?.name || "User"}
                </Text>
                <Text style={[styles.userRole, { color: theme.colors.onSurfaceVariant }]}>
                  {session?.role || "Staff"}
                </Text>
              </View>
            </Pressable>
            {allowedRoutes.includes("settings") ? (
              <TouchableRipple
                onPress={() => router.push("/settings" as Href)}
                style={styles.settingsIconBtn}
                accessibilityLabel={translate(language, "settingsTitle")}
                borderless
              >
                <MaterialCommunityIcons name="cog-outline" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableRipple>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasSidebar && !sidebarOpen ? (
        <TouchableRipple
          onPress={() => setSidebarOpen(true)}
          style={[styles.menuToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
          borderless
          accessibilityLabel={translate(language, "openNavigation")}
        >
          <MaterialCommunityIcons name="menu" size={22} color={theme.colors.primary} />
        </TouchableRipple>
      ) : null}

      <View style={styles.contentArea}>
        {!hasSidebar ? (
          <Tabs
            screenOptions={{
              headerShown: false,
              animation: "none",
              tabBarStyle: { display: "none" },
            }}
            tabBar={({ state }) => {
              const activeRouteName = state.routes[state.index]?.name ?? "index";

              return (
                <View style={[styles.mobileTabShell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                  {visibleTabs.map((item) => {
                    const isSelected = activeRouteName === item.name || (item.name === "index" && activeRouteName === "index");
                    const iconName = item.name === "profile" ? "account-circle" : item.icon;
                    const label = translate(language, item.titleKey);
                    const hasAlertBadge = item.name === "alerts" && summary.unreadNotifications > 0;

                    return (
                      <Pressable
                        key={item.name}
                        onPress={() => router.navigate((item.name === "index" ? "/(tabs)" : `/(tabs)/${item.name}`) as Href)}
                        style={styles.tabItem}
                      >
                        <View style={styles.tabItemIconWrap}>
                          <MaterialCommunityIcons
                            name={iconName as any}
                            size={22}
                            color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                          />
                          {hasAlertBadge ? <View style={[styles.tabBadge, { backgroundColor: theme.colors.error }]} /> : null}
                        </View>
                        <Text style={[styles.tabLabel, { color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            }}
          >
            {visibleTabs.map((definition) => (
              <Tabs.Screen
                key={definition.name}
                name={definition.name}
                options={{
                  title: translate(language, definition.titleKey),
                }}
              />
            ))}
          </Tabs>
        ) : (
          <Tabs
            screenOptions={{
              headerShown: false,
              animation: "none",
              tabBarStyle: { display: "none" },
            }}
          >
            {visibleTabs.map((definition) => (
              <Tabs.Screen
                key={definition.name}
                name={definition.name}
                options={{
                  title: translate(language, definition.titleKey),
                }}
              />
            ))}
          </Tabs>
        )}
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {!fabOpen ? <View style={styles.detachedFabWrap}>{quickActionsContent}</View> : null}
        </View>
        {!hasAdminNavigation && fabOpen ? (
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.staffQuickActionOverlay]}>
            <Pressable
              accessibilityLabel="Close quick actions"
              onPress={() => setFabOpen(false)}
              style={[
                styles.staffMenuBackdrop,
                { backgroundColor: theme.dark ? "rgba(8, 12, 18, 0.72)" : "rgba(20, 30, 40, 0.24)" },
              ]}
            />
            <View style={[styles.staffQuickActionMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              {quickActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityLabel={action.label}
                  onPress={() => {
                    setFabOpen(false);
                    router.push(action.route as Href);
                  }}
                  style={[styles.staffQuickActionRow, { backgroundColor: theme.colors.surfaceVariant }]}
                >
                  <View style={[styles.staffQuickActionIcon, { backgroundColor: action.accent }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={22} color={theme.colors.onPrimary} />
                  </View>
                  <Text style={[styles.staffQuickActionLabel, { color: theme.colors.onSurface }]}>{action.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              ))}
            </View>
            <View pointerEvents="box-none" style={styles.closeActionsPosition}>
              <Pressable
                accessibilityLabel="Close quick actions"
                onPress={() => setFabOpen(false)}
                style={[styles.closeActionsButton, { backgroundColor: theme.colors.primary }]}
              >
                <MaterialCommunityIcons name="close" size={28} color={theme.colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        ) : null}
        {hasAdminNavigation ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {fabOpen ? (
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                <Pressable
                  accessibilityLabel="Close quick actions"
                  onPress={() => setFabOpen(false)}
                  style={[
                    styles.adminMenuBackdrop,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(8, 12, 18, 0.84)"
                        : "rgba(246, 249, 251, 0.94)",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.adminQuickActionMenu,
                    {
                      top: adminActionMenuTop,
                      height: adminActionMenuHeight,
                    },
                  ]}
                >
                  {quickActions.map((action) => (
                    <Pressable
                      key={action.label}
                      accessibilityLabel={action.label}
                      onPress={() => {
                        setFabOpen(false);
                        router.push(action.route as Href);
                      }}
                      style={[styles.adminQuickActionRow, { height: adminActionSize }]}
                    >
                      <Text
                        style={[
                          styles.adminQuickActionLabel,
                          { color: theme.dark ? theme.colors.onSurface : "#183243" },
                        ]}
                      >
                        {action.label}
                      </Text>
                      <View
                        style={[
                          styles.adminQuickActionIcon,
                          {
                            backgroundColor: theme.dark ? theme.colors.surface : "#FFFFFF",
                            width: adminActionSize,
                            height: adminActionSize,
                            borderRadius: adminActionSize / 2,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name={action.icon as any} size={24} color={action.accent} />
                      </View>
                    </Pressable>
                  ))}
                </View>
                <View pointerEvents="box-none" style={styles.closeActionsPosition}>
                  <Pressable
                    accessibilityLabel="Close quick actions"
                    onPress={() => setFabOpen(false)}
                    style={[styles.closeActionsButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <MaterialCommunityIcons name="close" size={28} color={theme.colors.onPrimary} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
  },
  compactSidebar: {
    width: 72,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  hiddenSidebarText: {
    display: "none",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 4,
  },
  navItem: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  compactUserSection: {
    flex: 0,
  },
  navItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navItemLabel: {
    fontSize: 14,
    flex: 1,
  },
  navBadge: {
    alignSelf: "center",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
  },
  userRole: {
    fontSize: 11,
    fontWeight: "500",
  },
  settingsIconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
  },
  menuToggle: {
    position: "absolute",
    top: 72,
    left: 10,
    zIndex: 30,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  mobileTabShell: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    overflow: "visible",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 6,
    minWidth: 0,
  },
  tabItemIconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  tabBadge: {
    position: "absolute",
    right: -4,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 10,
  },
  detachedFabWrap: {
    position: "absolute",
    right: 40,
    bottom: 110,
    width: 64,
    height: 64,
    zIndex: 30,
  },
  centerFab: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  staffQuickActionOverlay: {
    zIndex: 40,
    elevation: 20,
  },
  staffMenuBackdrop: {
    ...StyleSheet.absoluteFill,
    bottom: 114,
  },
  staffQuickActionMenu: {
    position: "absolute",
    right: 40,
    bottom: 184,
    width: "82%",
    maxWidth: 360,
    padding: 10,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  staffQuickActionRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  staffQuickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  staffQuickActionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  adminMenuBackdrop: {
    ...StyleSheet.absoluteFill,
    bottom: 76,
  },
  adminQuickActionMenu: {
    position: "absolute",
    right: 40,
    width: "78%",
    maxWidth: 360,
    justifyContent: "space-between",
  },
  adminQuickActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 18,
  },
  adminQuickActionLabel: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
  },
  adminQuickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  closeActionsPosition: {
    position: "absolute",
    right: 40,
    bottom: 110,
    width: 64,
    height: 64,
  },
  closeActionsButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  contentArea: {
    flex: 1,
    position: "relative",
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { ColorValue, PanResponder, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { translate } from "../../lib/i18n";

function AnimatedTabIcon({ name, color, focused, size, activeColor }: { name: string; color: ColorValue; focused: boolean; size: number; activeColor: string }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1 : 0.92, { damping: 14, stiffness: 200 }) }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        focused
          ? {
              backgroundColor: activeColor,
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 4,
            }
          : undefined,
      ]}
    >
      <MaterialCommunityIcons name={name as any} color={color} size={focused ? 20 : size} />
    </Animated.View>
  );
}
const tabDefinitions = [
  { name: "index", titleKey: "tabHome", icon: "home-variant-outline", visible: true },
  { name: "inventory", titleKey: "tabInventory", icon: "warehouse", visible: true },
  { name: "reports", titleKey: "tabReports", icon: "chart-box-outline", visible: true },
  { name: "profit", titleKey: "tabProfit", icon: "cash-multiple", visible: true },
  { name: "alerts", titleKey: "tabAlerts", icon: "alert-circle-outline", visible: true },
  { name: "profile", titleKey: "tabProfile", icon: "account-circle-outline", visible: true },
];

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
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
    return <Redirect href={getHomeRoute(session.role) as any} />;
  }

  const allowedRoutes = getAllowedRoutes(session.role);
  const visibleTabs = tabDefinitions.filter((definition) => allowedRoutes.includes(definition.name) && definition.visible);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: "none",
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
            height: 72,
            paddingBottom: 10,
            paddingTop: 10,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
        }}
      >
        {visibleTabs
        .map((definition) => {
          const iconName = definition.name === "profile" ? "account-circle" : definition.icon;

          return (
            <Tabs.Screen
              key={definition.name}
              name={definition.name}
              options={{
                title: translate(language, definition.titleKey),
                tabBarBadge:
                  definition.name === "alerts" && summary.unreadNotifications > 0
                    ? summary.unreadNotifications
                    : undefined,
                tabBarIcon: ({ color, focused, size }) => (
                  <AnimatedTabIcon
                    name={iconName as string}
                    color={focused ? theme.colors.onPrimary : color}
                    focused={focused}
                    size={size ?? 22}
                    activeColor={theme.colors.primary}
                  />
                ),
              }}
            />
          );
        })}
      </Tabs>
    </View>
  );
}


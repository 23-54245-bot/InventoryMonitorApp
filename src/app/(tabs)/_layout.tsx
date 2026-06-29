import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: () => <SymbolView name="house.fill" size={22} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: () => <SymbolView name="shippingbox.fill" size={22} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: () => <SymbolView name="bell.badge.fill" size={22} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: () => <SymbolView name="doc.text.fill" size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => <SymbolView name="person.crop.circle.fill" size={22} />,
        }}
      />
        {/* Settings moved to Profile header */}
    </Tabs>
  );
}

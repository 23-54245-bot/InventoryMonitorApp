import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

type ScreenContainerProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
};

export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
}: ScreenContainerProps) {
  const theme = useTheme();

  if (!scrollable) {
    return <View style={[styles.page, { backgroundColor: theme.colors.background }, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: theme.colors.background }, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
});

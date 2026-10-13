import type { ReactNode } from "react";
import { View, StyleSheet } from "react-native";

import { useBreakpoint } from "../hooks/useBreakpoint";

type ResponsiveContainerProps = {
  children: ReactNode;
};

export function ResponsiveContainer({ children }: ResponsiveContainerProps) {
  const breakpoint = useBreakpoint();
  const maxWidth = breakpoint === "mobile" ? ("100%" as const) : breakpoint === "tablet" ? 720 : 1040;
  return <View style={[styles.wrap, { maxWidth }]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignSelf: "center" },
});


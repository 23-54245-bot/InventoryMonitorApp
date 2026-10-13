import { useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}


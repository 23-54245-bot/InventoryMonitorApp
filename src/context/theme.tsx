import { createContext, ReactNode, useContext, useMemo } from "react";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

import { useStore } from "./store";

export type ThemeMode = "light" | "dark";

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 18,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#183b56",
    onPrimary: "#ffffff",
    primaryContainer: "#dce7f0",
    onPrimaryContainer: "#183b56",
    secondary: "#159a72",
    onSecondary: "#ffffff",
    secondaryContainer: "#dcefe9",
    onSecondaryContainer: "#14533f",
    tertiary: "#d99000",
    tertiaryContainer: "#fff0c7",
    onTertiaryContainer: "#704700",
    background: "#eef2f6",
    surface: "#ffffff",
    surfaceVariant: "#e5ecf2",
    onSurface: "#19324a",
    onSurfaceVariant: "#6b7c8f",
    outline: "rgba(24, 59, 86, 0.14)",
    error: "#dc2626",
    onBackground: "#19324a",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 18,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#3979a8",
    onPrimary: "#ffffff",
    primaryContainer: "#1a2d4a",
    onPrimaryContainer: "#93c5fd",
    secondary: "#159a72",
    onSecondary: "#ffffff",
    secondaryContainer: "#173d3b",
    onSecondaryContainer: "#b7ead8",
    tertiary: "#d99000",
    tertiaryContainer: "#4b3712",
    onTertiaryContainer: "#ffe2a1",
    background: "#0d1526",
    surface: "#152035",
    surfaceVariant: "#1a2d4a",
    onSurface: "#dde8f7",
    onSurfaceVariant: "#6b8ebd",
    outline: "rgba(59, 130, 246, 0.25)",
    error: "#ef4444",
    onBackground: "#dde8f7",
  },
};

type ThemeContextValue = {
  themeMode: ThemeMode;
  theme: typeof lightTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { state, toggleDarkMode } = useStore();
  const themeMode: ThemeMode = state.user?.preferences?.darkMode ? "dark" : "light";

  const theme = useMemo(() => (themeMode === "dark" ? darkTheme : lightTheme), [themeMode]);

  return <ThemeContext.Provider value={{ themeMode, theme, toggleTheme: toggleDarkMode }}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }

  return context;
}

import { createContext, ReactNode, useContext, useMemo } from "react";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

import { useStore } from "./store";

export type ThemeMode = "light" | "dark";

export const lightColors = {
  primary: "#1E2761",
  onPrimary: "#FFFFFF",
  secondary: "#2F9E5C",
  onSecondary: "#F0FDF4",
  tertiary: "#D98C3D",
  onTertiary: "#3D2508",
  error: "#DC2626",
  onError: "#FEF2F2",
  background: "#EEF3FC",
  onBackground: "#161C4A",
  surface: "#FFFFFF",
  onSurface: "#161C4A",
  surfaceVariant: "#E7EEFA",
  onSurfaceVariant: "#5B6178",
  outline: "#D7E0F2",
};

export const darkColors = {
  primary: "#4F70E2",
  onPrimary: "#FFFFFF",
  secondary: "#10B981",
  onSecondary: "#052E16",
  tertiary: "#F59E0B",
  onTertiary: "#3D2508",
  error: "#EF4444",
  onError: "#FFFFFF",
  background: "#0F172A",
  onBackground: "#F1F5F9",
  surface: "#1E293B",
  onSurface: "#F1F5F9",
  surfaceVariant: "#334155",
  onSurfaceVariant: "#94A3B8",
  outline: "#334155",
};

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 18,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
    primaryContainer: lightColors.surfaceVariant,
    onPrimaryContainer: lightColors.primary,
    secondaryContainer: "#DCFCE7",
    onSecondaryContainer: "#166534",
    tertiaryContainer: "#FEF3C7",
    onTertiaryContainer: "#92400E",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 18,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
    primaryContainer: "#1E3A8A",
    onPrimaryContainer: "#BFDBFE",
    secondaryContainer: "#064E3B",
    onSecondaryContainer: "#A7F3D0",
    tertiaryContainer: "#78350F",
    onTertiaryContainer: "#FDE68A",
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

import { Slot } from "expo-router";
import { DefaultTheme, Provider as PaperProvider } from "react-native-paper";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#2563eb",
    accent: "#00bfa5",
    background: "#f3f4f6",
    surface: "#ffffff",
    text: "#111827",
  },
};

export default function Layout() {
  return (
    <PaperProvider theme={theme}>
      <Slot />
    </PaperProvider>
  );
}

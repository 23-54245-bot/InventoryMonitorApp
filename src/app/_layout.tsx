import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { Provider as PaperProvider, Snackbar } from "react-native-paper";
import { ThemeProvider, useThemeContext } from "../context/theme";

import { AuthProvider, useAuth } from "../context/auth";
import { StoreProvider } from "../context/store";

function AppShell() {
  const { theme } = useThemeContext();
  const { isReady } = useAuth();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" || __DEV__) {
      return;
    }

    void Updates.checkForUpdateAsync().then((update) => {
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    }).catch(() => undefined);
  }, []);

  const installUpdate = async () => {
    setUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setUpdating(false);
      setUpdateAvailable(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scan-modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="product/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="add-product" options={{ presentation: "modal" }} />
        <Stack.Screen name="stock-movement" options={{ presentation: "modal" }} />
        <Stack.Screen name="change-password" options={{ presentation: "modal" }} />
        <Stack.Screen name="pos" options={{ presentation: "modal" }} />
        <Stack.Screen name="sales-history" options={{ presentation: "modal" }} />
      </Stack>
      <Snackbar
        visible={updateAvailable}
        onDismiss={() => setUpdateAvailable(false)}
        duration={Snackbar.DURATION_MEDIUM}
        action={{
          label: updating ? "Updating..." : "Update",
          onPress: () => { void installUpdate(); },
          disabled: updating,
        }}
      >
        A new app update is available.
      </Snackbar>
      {!isReady ? (
        <View style={styles.brandSplash}>
          <Image source={require("../../assets/images/stocktrack-logo.png")} style={styles.brandSplashLogo} resizeMode="contain" />
          <Text style={styles.brandSplashName}>StockTrack</Text>
        </View>
      ) : null}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  brandSplash: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },
  brandSplashLogo: {
    width: 132,
    height: 132,
    marginBottom: 18,
  },
  brandSplashName: {
    color: "#2856D7",
    fontSize: 28,
    fontWeight: "800",
  },
});

export default function Layout() {
  return (
    <AuthProvider>
      <StoreProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  );
}

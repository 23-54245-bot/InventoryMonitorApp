import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Image, Platform, StyleSheet, Text, View } from "react-native";
import { Button, Provider as PaperProvider, Snackbar } from "react-native-paper";
import { ThemeProvider, useThemeContext } from "../context/theme";

import { AuthProvider, useAuth } from "../context/auth";
import { StoreProvider, useStore } from "../context/store";

/** Animated splash shown while auth + fonts load */
function AnimatedSplash({ backgroundColor, primaryColor }: { backgroundColor: string; primaryColor: string }) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Short pause then name slides up
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [logoOpacity, logoScale, textOpacity, textTranslateY]);

  return (
    <View style={[styles.brandSplash, { backgroundColor }]}>
      <Animated.Image
        source={require("../../assets/images/stocktrack-logo.png")}
        style={[styles.brandSplashLogo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
      <Animated.Text
        style={[
          styles.brandSplashName,
          { color: primaryColor, opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
        ]}
      >
        StockTrack
      </Animated.Text>
    </View>
  );
}

function AppShell() {
  const { theme } = useThemeContext();
  const { isReady, session } = useAuth();
  const { state, isStoreReady } = useStore();
  const [fontsLoaded] = useFonts({
    "material-community": require("../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf"),
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const previousAppState = useRef(AppState.currentState);
  const biometricEnabled = Platform.OS !== "web" && Boolean(session && state.user.preferences.biometricEnabled);

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometricEnabled) {
      setBiometricUnlocked(true);
      return;
    }

    setBiometricLoading(true);
    setBiometricError(null);
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !isEnrolled) {
        setBiometricError("Set up a fingerprint, Face ID, or other biometric in your device settings before unlocking StockTrack.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock StockTrack",
        promptDescription: "Confirm your identity to access your store data.",
        cancelLabel: "Cancel",
      });
      if (result.success) {
        setBiometricUnlocked(true);
      } else if (result.error !== "user_cancel" && result.error !== "system_cancel") {
        setBiometricError("Biometric authentication failed. Please try again.");
      }
    } catch {
      setBiometricError("Biometric authentication is unavailable right now. Please try again.");
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricEnabled]);

  useEffect(() => {
    queueMicrotask(() => {
      setBiometricUnlocked(false);
      setBiometricError(null);
    });
  }, [session?.email]);

  useEffect(() => {
    if (!isReady || !isStoreReady) return;
    if (!session || !biometricEnabled) return;
    if (!biometricUnlocked) {
      const timer = setTimeout(() => void unlockWithBiometrics(), 0);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, biometricUnlocked, isReady, isStoreReady, session, unlockWithBiometrics]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && previousAppState.current === "background" && biometricEnabled && session) {
        setBiometricUnlocked(false);
        setBiometricError(null);
      }
      previousAppState.current = nextState;
    });
    return () => subscription.remove();
  }, [biometricEnabled, session]);

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
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms-of-service" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="scan-modal" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="product/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="add-product" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="stock-movement" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="change-password" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="pos" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="sales-history" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="utang" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
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
      {isReady && isStoreReady && session && biometricEnabled && !biometricUnlocked ? (
        <View style={[styles.biometricLock, { backgroundColor: theme.colors.background }]}>
          <Image source={require("../../assets/images/stocktrack-logo.png")} style={styles.biometricLogo} resizeMode="contain" />
          <Text style={[styles.biometricTitle, { color: theme.colors.onSurface }]}>Unlock StockTrack</Text>
          <Text style={[styles.biometricMessage, { color: theme.colors.onSurfaceVariant }]}>Use your device biometric to access this signed-in account.</Text>
          {biometricError ? <Text style={[styles.biometricError, { color: theme.colors.error }]}>{biometricError}</Text> : null}
          <Button mode="contained" icon="fingerprint" loading={biometricLoading} disabled={biometricLoading} onPress={() => void unlockWithBiometrics()} style={styles.biometricButton}>
            Unlock with biometrics
          </Button>
        </View>
      ) : null}
      {!isReady || !fontsLoaded ? (
        <AnimatedSplash
          backgroundColor={theme.colors.surface}
          primaryColor={theme.colors.primary}
        />
      ) : null}
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  brandSplash: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  brandSplashLogo: {
    width: 132,
    height: 132,
    marginBottom: 18,
  },
  brandSplashName: {
    fontSize: 28,
    fontWeight: "800",
  },
  biometricLock: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  biometricLogo: { width: 100, height: 100, marginBottom: 22 },
  biometricTitle: { fontSize: 26, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  biometricMessage: { fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 320 },
  biometricError: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 16, maxWidth: 340 },
  biometricButton: { marginTop: 24, borderRadius: 14, minWidth: 240 },
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

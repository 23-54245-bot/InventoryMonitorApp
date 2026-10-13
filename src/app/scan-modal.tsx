import { CameraType, CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import type { Href } from "expo-router";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, Title, useTheme } from "react-native-paper";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { findProductBySku } from "../data/freshmart";
import { translate } from "../lib/i18n";

const barcodeTypes = ["ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "qr"] as const;

export default function ScanModal() {
  const router = useRouter();
  const { session } = useAuth();
  const { state } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanValue, setScanValue] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scanningRef = useRef(false);
  const theme = useTheme();
  const language = state.user.preferences.language;

  const matchedProduct = useMemo(() => (scanValue ? findProductBySku(scanValue, state.products) : undefined), [scanValue, state.products]);
  const scanLinePosition = useSharedValue(6);

  useEffect(() => {
    if (scanValue) {
      return;
    }

    scanLinePosition.value = withRepeat(withTiming(90, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [scanLinePosition, scanValue]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLinePosition.value}%`,
  }));

  if (!session) {
    return <Redirect href="/login" />;
  }

  const closeScanner = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/inventory" as Href));

  const handleScanned = ({ data }: BarcodeScanningResult) => {
    if (scanningRef.current) {
      return;
    }

    scanningRef.current = true;
    setScanValue(data);
  };

  if (!permission) {
    return (
      <View style={[styles.permissionState, { backgroundColor: theme.colors.background }]}> 
        <Text style={[styles.permissionText, { color: theme.colors.onSurface }]}>{translate(language, "preparingCamera")}</Text>
        <Button mode="contained" onPress={requestPermission}>{translate(language, "allowCamera")}</Button>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionState, { backgroundColor: theme.colors.background }]}> 
        <Text style={[styles.permissionText, { color: theme.colors.onSurface }]}>
          {Platform.OS === "web"
            ? "Camera permission is required for barcode scanning. If prompted, please allow camera access in your browser."
            : "Camera permission is required for scanning."}
        </Text>
        <Button mode="contained" onPress={requestPermission}>{translate(language, "allowCamera")}</Button>
        <Button textColor={theme.colors.onPrimary} onPress={closeScanner}>{translate(language, "cancelButton")}</Button>
      </View>
    );
  }

  if (cameraError) {
    return (
      <View style={[styles.permissionState, { backgroundColor: theme.colors.background }]}> 
        <Text style={[styles.permissionText, { color: theme.colors.onSurface }]}>{translate(language, "unableToStartCamera")}</Text>
        <Button mode="contained" onPress={() => setCameraError(false)}>{translate(language, "tryAgain")}</Button>
        <Button textColor={theme.colors.primary} onPress={closeScanner}>{translate(language, "cancelButton")}</Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <CameraView
        style={styles.camera}
        facing={"back" as CameraType}
        barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
        onBarcodeScanned={scanValue ? undefined : handleScanned}
        onMountError={() => setCameraError(true)}
      />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <Text style={[styles.overline, { color: theme.colors.onSurfaceVariant }]}>StockTrack scanner</Text>
          <IconButton icon="close" iconColor={theme.colors.onSurface} containerColor={theme.colors.surface} onPress={closeScanner} />
        </View>

        <View style={[styles.scanFrame, { borderColor: theme.colors.primary, backgroundColor: "transparent" }]}>
          <View style={[styles.cornerTopLeft, { borderColor: theme.colors.primary }]} />
          <View style={[styles.cornerTopRight, { borderColor: theme.colors.primary }]} />
          <View style={[styles.cornerBottomLeft, { borderColor: theme.colors.primary }]} />
          <View style={[styles.cornerBottomRight, { borderColor: theme.colors.primary }]} />
          {!scanValue ? <Animated.View style={[styles.scanLine, scanLineStyle, { backgroundColor: theme.colors.primary }]} /> : null}
        </View>

        <View style={styles.bottomPanel}>
          <Text style={[styles.bottomLabel, { color: theme.colors.onSurface }]}>{translate(language, "barcodeScanLabel")}</Text>
          <Text style={[styles.bottomText, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "barcodeScanHint")}</Text>

          {scanValue ? (
            <Animated.View entering={FadeIn.duration(250)}>
            <Card style={[styles.resultCard, { backgroundColor: theme.colors.surface }]}> 
              <Card.Content>
                <Text style={[styles.resultLabel, { color: theme.colors.primary }]}>{translate(language, "lastScanLabel")}</Text>
                <Title style={[styles.resultTitle, { color: theme.colors.onSurface }]} numberOfLines={2} ellipsizeMode="tail">{matchedProduct?.name ?? scanValue}</Title>
                <Text style={[styles.resultText, { color: theme.colors.onSurfaceVariant }]}>{matchedProduct ? `${matchedProduct.sku} · ${matchedProduct.category}` : `SKU: ${scanValue}`}</Text>
                {matchedProduct ? (
                  <Button mode="contained" buttonColor={theme.colors.primary} onPress={() => router.push({ pathname: "/product/[id]", params: { id: matchedProduct.id } } as Href)}>{translate(language, "viewProductButton")}</Button>
                ) : (
                  <>
                    <Text style={[styles.unlistedText, { color: theme.colors.tertiary }]}>{translate(language, "unlistedProductLabel")}</Text>
                    <Button mode="contained" icon="plus-box-outline" buttonColor={theme.colors.primary} onPress={() => router.push({ pathname: "/add-product", params: { sku: scanValue, name: "Unlisted Product" } } as Href)}>
                      {translate(language, "addItemToInventory")}
                    </Button>
                  </>
                )}
              </Card.Content>
            </Card>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#111827" },
  overlay: { flex: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 24, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  overline: { textTransform: "uppercase", letterSpacing: 1.4, fontSize: 12 },
  scanFrame: { alignSelf: "center", width: "82%", aspectRatio: 0.8, borderRadius: 16, borderWidth: 2 },
  scanLine: { position: "absolute", left: 8, right: 8, height: 2, borderRadius: 1, opacity: 0.85 },
  cornerTopLeft: { position: "absolute", top: 18, left: 18, width: 36, height: 36, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cornerTopRight: { position: "absolute", top: 18, right: 18, width: 36, height: 36, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cornerBottomLeft: { position: "absolute", bottom: 18, left: 18, width: 36, height: 36, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cornerBottomRight: { position: "absolute", bottom: 18, right: 18, width: 36, height: 36, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  bottomPanel: { gap: 12 },
  bottomLabel: { fontSize: 22, fontWeight: "800" },
  bottomText: { lineHeight: 20 },
  resultCard: { borderRadius: 16, elevation: 6, boxShadow: "0px 4px 12px rgba(0,0,0,0.15)", borderWidth: 0 },
  resultLabel: { textTransform: "uppercase", letterSpacing: 1.1, fontSize: 11, marginBottom: 4 },
  resultTitle: { fontSize: 17, fontWeight: "600", marginBottom: 6 },
  resultText: { fontSize: 13, marginBottom: 8 },
  unlistedText: { fontSize: 13, fontWeight: "600", marginBottom: 10 },
  permissionState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  permissionText: { textAlign: "center" },
});

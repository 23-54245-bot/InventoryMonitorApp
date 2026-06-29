import { Camera } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Chip, IconButton, ProgressBar, Searchbar, Text, Title } from "react-native-paper";

const products = [
  { name: "Jasmine Rice", sku: "RIC-001", category: "Grains", stock: 45, capacity: 200 },
  { name: "Cooking Oil", sku: "OIL-002", category: "Oils", stock: 8, capacity: 100 },
  { name: "Fresh Milk", sku: "MLK-003", category: "Dairy", stock: 22, capacity: 60 },
  { name: "Hand Soap", sku: "SOAP-004", category: "Cleaning", stock: 12, capacity: 50 },
];

export default function Inventory() {
  const [query, setQuery] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const cameraExport: any = Camera as any;
  const potentialCamera = cameraExport?.default ?? cameraExport?.Camera ?? cameraExport;
  const CameraComponent: any = typeof potentialCamera === "function" ? potentialCamera : null;
  const cameraType = (cameraExport?.Constants?.Type?.back ?? Camera?.Constants?.Type?.back) ?? "back";
  const barcodeTypes = cameraExport?.Constants?.BarCodeType
    ? [
        cameraExport.Constants.BarCodeType.qr,
        cameraExport.Constants.BarCodeType.ean13,
        cameraExport.Constants.BarCodeType.ean8,
        cameraExport.Constants.BarCodeType.code128,
        cameraExport.Constants.BarCodeType.code39,
      ]
    : undefined;

  useEffect(() => {
    (async () => {
      const requestFn = cameraExport?.requestCameraPermissionsAsync ?? Camera?.requestCameraPermissionsAsync;
      if (requestFn) {
        try {
          const { status } = await requestFn();
          setHasPermission(status === "granted");
        } catch (e) {
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
    })();
  }, []);

  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.sku.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    setScannedProduct(data);
    setQuery(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Title style={styles.title}>Inventory</Title>
        <IconButton
          icon="barcode-scan"
          size={28}
          onPress={() => setScanning((prev) => !prev)}
          accessibilityLabel="Scan barcode"
        />
      </View>
      <Searchbar
        placeholder="Search by name, SKU or category"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (scannedProduct) setScannedProduct(null);
        }}
        style={styles.search}
      />

      {hasPermission === null ? (
        <Text style={styles.permissionText}>Checking camera permissions...</Text>
      ) : hasPermission === false ? (
        <Text style={styles.permissionText}>Camera permission is required for barcode scanning.</Text>
      ) : null}

      {scanning ? (
        hasPermission === true ? (
        <View style={styles.scannerContainer}>
          {Platform.OS === "web" ? (
            <View style={[styles.scanner, { justifyContent: "center", alignItems: "center" }]}> 
              <Text>Barcode scanning is not available on web. Use a device or simulator with camera support.</Text>
            </View>
          ) : CameraComponent ? (
            <CameraComponent
              ref={(ref: any) => {
                cameraRef.current = ref;
              }}
              onBarCodeScanned={handleBarCodeScanned}
              style={styles.scanner}
              type={cameraType}
              barCodeScannerSettings={
                barcodeTypes ? { barCodeTypes: barcodeTypes } : undefined
              }
            />
          ) : (
            <View style={[styles.scanner, { justifyContent: "center", alignItems: "center" }]}> 
              <Text>Camera component unavailable on this platform.</Text>
            </View>
          )}
          <Chip style={styles.scannerChip} textStyle={styles.scannerChipText}>
            Scanning... point camera at barcode
          </Chip>
        </View>
      ) : (
          <Text style={styles.permissionText}>Request camera access to scan barcodes.</Text>
        )
      ) : null}

      {scannedProduct ? (
        <Card style={styles.scannedCard}>
          <Card.Content>
            <Text style={styles.scanResultLabel}>Scanned SKU</Text>
            <Text style={styles.scanResult}>{scannedProduct}</Text>
            <Chip style={styles.scanChip}>Showing matching product</Chip>
          </Card.Content>
        </Card>
      ) : null}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.sku}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const fill = item.stock / item.capacity;
          const status = item.stock <= 10 ? "Low" : item.stock <= 30 ? "Warning" : "Healthy";
          return (
            <TouchableOpacity activeOpacity={0.8}>
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.sku}>{item.sku} · {item.category}</Text>
                    </View>
                    <Chip style={status === "Low" ? styles.chipLow : status === "Warning" ? styles.chipWarning : styles.chipHealthy}>
                      {status}
                    </Chip>
                  </View>
                  <ProgressBar progress={fill} color={status === "Low" ? "#dc2626" : status === "Warning" ? "#f59e0b" : "#16a34a"} style={styles.progress} />
                  <Text style={styles.quantity}>{item.stock} of {item.capacity} units</Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#eef2ff" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  search: { marginBottom: 16 },
  permissionText: { color: "#dc2626", marginBottom: 12, textAlign: "center" },
  scannerContainer: { height: 240, borderRadius: 16, overflow: "hidden", marginBottom: 14 },
  scanner: { flex: 1 },
  scannerChip: { position: "absolute", bottom: 14, alignSelf: "center", backgroundColor: "rgba(15, 23, 42, 0.88)", color: "#ffffff" },
  scannedCard: { marginBottom: 14, backgroundColor: "#ffffff", elevation: 2 },
  scanResultLabel: { color: "#6b7280", marginBottom: 4 },
  scanResult: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  scanChip: { alignSelf: "flex-start", backgroundColor: "#e0f2fe" },
  scannerChipText: { color: "#ffffff" },
  list: { paddingBottom: 24 },
  card: { marginBottom: 14, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  name: { fontSize: 18, fontWeight: "600" },
  sku: { color: "#6b7280", marginTop: 4 },
  progress: { height: 10, borderRadius: 6, marginVertical: 10 },
  quantity: { color: "#4b5563" },
  chipLow: { backgroundColor: "#fee2e2" },
  chipWarning: { backgroundColor: "#fef3c7" },
  chipHealthy: { backgroundColor: "#dcfce7" },
});

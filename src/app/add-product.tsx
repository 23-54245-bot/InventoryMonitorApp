import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useStore } from "../context/store";
import { showAlert } from "../lib/alert";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { addProduct, updateProduct, getProduct } = useStore();
  const theme = useTheme();
  const product = params.id ? getProduct(String(params.id)) : undefined;
  const isEditMode = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unitType, setUnitType] = useState(product?.unitType ?? "pcs");
  const [currentStock, setCurrentStock] = useState(String(product?.currentStock ?? 0));
  const [maxStock, setMaxStock] = useState(String(product?.maxStock ?? 100));
  const [minStock, setMinStock] = useState(String(product?.lowStockThreshold ?? 10));
  const [costPrice, setCostPrice] = useState(String(product?.unitPrice ?? ""));
  const [srpPrice, setSrpPrice] = useState(String(product?.srpPrice ?? ""));
  const [location, setLocation] = useState("");
  const [supplier, setSupplier] = useState("");
  const [icon, setIcon] = useState(product?.icon ?? "📦");
  const [imageUri, setImageUri] = useState(product?.imageUri ?? undefined);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/inventory" as any));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert("Camera Access Needed", "Allow camera access in your phone settings to take a product photo.");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      showAlert("Camera Unavailable", "The camera could not be opened. Close and reopen Expo Go, then try again.");
    }
  };

  const onSave = () => {
    try {
      const nextName = name.trim() || "New Product";
      const nextCategory = category.trim() || "General";
      const nextUnit = unitType.trim() || "pcs";
      const nextSku = sku.trim() || `NEW-${Date.now()}`;
      const nextCostPrice = Number(costPrice) || 0;
      const nextSrpPrice = Number(srpPrice) || undefined;
      const nextCurrentStock = Number(currentStock) || 0;
      const nextMaxStock = Number(maxStock) || 100;
      const nextMinStock = Number(minStock) || 0;

      if (isEditMode && product) {
        updateProduct(product.id, {
          name: nextName,
          sku: nextSku,
          category: nextCategory,
          unitType: nextUnit,
          currentStock: nextCurrentStock,
          maxStock: nextMaxStock,
          lowStockThreshold: nextMinStock,
          unitPrice: nextCostPrice,
          srpPrice: nextSrpPrice,
          icon,
          imageUri,
          updatedAt: new Date().toISOString(),
        });
        goBack();
        return;
      }

      addProduct({
        id: generateUUID(),
        sku: nextSku,
        name: nextName,
        category: nextCategory,
        unitType: nextUnit,
        currentStock: nextCurrentStock,
        maxStock: nextMaxStock,
        lowStockThreshold: nextMinStock,
        unitPrice: nextCostPrice,
        srpPrice: nextSrpPrice,
        icon,
        imageUri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      goBack();
    } catch (err: any) {
      console.error("Save product error:", err);
      showAlert("Error Saving Product", err?.message ?? "An unexpected error occurred while saving.");
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}> 
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}> 
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>{isEditMode ? "Edit Product" : "Add Product"}</Text>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.colors.surface }]} onPress={onSave}>
          <MaterialCommunityIcons name="content-save" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.duration(350)} style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <View style={styles.avatarEditRow}>
            <View style={styles.imageWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.productImage} contentFit="cover" />
              ) : (
                <Text style={styles.productEmoji}>{icon}</Text>
              )}
            </View>
            <View style={styles.avatarActionsCol}>
              <Button mode="contained-tonal" icon="image-outline" compact onPress={pickImage} style={styles.avatarActionButton} labelStyle={styles.avatarActionLabel}>Upload Photo</Button>
              <Button mode="outlined" icon="camera-outline" compact onPress={takePhoto} style={styles.avatarActionButton} labelStyle={styles.avatarActionLabel}>Take Photo</Button>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Product Information</Text>

          <TextInput
            mode="outlined"
            label="Product Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor={theme.colors.outline}
            left={<TextInput.Icon icon="tag-text-outline" />}
          />
          <TextInput
            mode="outlined"
            label="SKU"
            value={sku}
            onChangeText={setSku}
            style={styles.input}
            outlineColor={theme.colors.outline}
            left={<TextInput.Icon icon="barcode" />}
          />
          <TextInput
            mode="outlined"
            label="Category"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
            outlineColor={theme.colors.outline}
            left={<TextInput.Icon icon="shape-outline" />}
          />
          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Unit"
              value={unitType}
              onChangeText={setUnitType}
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
            <TextInput
              mode="outlined"
              label="Supplier"
              value={supplier}
              onChangeText={setSupplier}
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
          </View>
        </Animated.View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Stock & Pricing</Text>

          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Current Stock"
              value={currentStock}
              onChangeText={setCurrentStock}
              keyboardType="numeric"
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
            <TextInput
              mode="outlined"
              label="Max Stock"
              value={maxStock}
              onChangeText={setMaxStock}
              keyboardType="numeric"
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
          </View>

          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Min Stock"
              value={minStock}
              onChangeText={setMinStock}
              keyboardType="numeric"
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
            <TextInput
              mode="outlined"
              label="Location"
              value={location}
              onChangeText={setLocation}
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
          </View>

          <View style={styles.fieldRow}>
            <TextInput
              mode="outlined"
              label="Cost Price"
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="decimal-pad"
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
            <TextInput
              mode="outlined"
              label="Selling Price"
              value={srpPrice}
              onChangeText={setSrpPrice}
              keyboardType="decimal-pad"
              style={[styles.input, styles.inlineInput]}
              outlineColor={theme.colors.outline}
            />
          </View>
        </View>

        <View style={styles.footerRow}>
          <Button mode="outlined" onPress={goBack} style={styles.cancelActionButton}>
            Cancel
          </Button>
          <Button mode="contained" onPress={onSave} style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]} labelStyle={styles.primaryButtonLabel}>
            {isEditMode ? "Save Changes" : "Save Product"}
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  form: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  avatarEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: 64,
    height: 64,
  },
  productEmoji: {
    fontSize: 30,
  },
  avatarActionsCol: {
    flex: 1,
    gap: 8,
  },
  avatarActionButton: {
    borderRadius: 10,
  },
  avatarActionLabel: {
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginTop: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
  },
  cancelActionButton: {
    flex: 1,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});

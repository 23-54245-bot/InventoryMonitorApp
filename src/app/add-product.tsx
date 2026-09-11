import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Chip, Divider, IconButton, Text, TextInput, useTheme } from "react-native-paper";
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

function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const [manufacturingDate, setManufacturingDate] = useState(product?.manufacturingDate ? product.manufacturingDate.slice(0, 10) : "");
  const [expiryDate, setExpiryDate] = useState(product?.expiryDate ? product.expiryDate.slice(0, 10) : "");
  const [datePickerTarget, setDatePickerTarget] = useState<"mfg" | "expiry" | null>(null);

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
          expiryDate: expiryDate.trim() ? expiryDate.trim() : undefined,
          manufacturingDate: manufacturingDate.trim() ? manufacturingDate.trim() : undefined,
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
        expiryDate: expiryDate.trim() ? expiryDate.trim() : undefined,
        manufacturingDate: manufacturingDate.trim() ? manufacturingDate.trim() : undefined,
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

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Manufacturing & Expiry Dates</Text>

          {/* Manufacturing Date */}
          <Text style={[styles.fieldSubLabel, { color: theme.colors.onSurface }]}>Manufacturing Date</Text>
          <TextInput
            mode="outlined"
            placeholder="YYYY-MM-DD (e.g. 2026-04-10)"
            value={manufacturingDate}
            onChangeText={setManufacturingDate}
            style={styles.input}
            outlineColor={theme.colors.outline}
            left={<TextInput.Icon icon="calendar-clock" />}
            right={
              <TextInput.Icon
                icon="calendar-month-outline"
                onPress={() => setDatePickerTarget("mfg")}
              />
            }
          />
          <View style={styles.quickDateRow}>
            <Chip compact style={styles.quickChip} onPress={() => setManufacturingDate(getTodayDate())}>Today</Chip>
            <Chip compact style={styles.quickChip} onPress={() => setManufacturingDate(getOffsetDate(-7))}>1 wk ago</Chip>
            <Chip compact style={styles.quickChip} onPress={() => setManufacturingDate(getOffsetDate(-30))}>1 mo ago</Chip>
            {manufacturingDate ? (
              <Chip compact icon="close" style={styles.quickChip} onPress={() => setManufacturingDate("")}>
                Clear
              </Chip>
            ) : null}
          </View>

          {/* Expiry Date */}
          <Text style={[styles.fieldSubLabel, { color: theme.colors.onSurface, marginTop: 14 }]}>Expiry Date</Text>
          <TextInput
            mode="outlined"
            placeholder="YYYY-MM-DD (e.g. 2026-10-15)"
            value={expiryDate}
            onChangeText={setExpiryDate}
            style={styles.input}
            outlineColor={theme.colors.outline}
            left={<TextInput.Icon icon="calendar-alert" />}
            right={
              <TextInput.Icon
                icon="calendar-month-outline"
                onPress={() => setDatePickerTarget("expiry")}
              />
            }
          />
          <View style={styles.quickDateRow}>
            <Chip compact style={styles.quickChip} onPress={() => setExpiryDate(getOffsetDate(90))}>+3 Mo</Chip>
            <Chip compact style={styles.quickChip} onPress={() => setExpiryDate(getOffsetDate(180))}>+6 Mo</Chip>
            <Chip compact style={styles.quickChip} onPress={() => setExpiryDate(getOffsetDate(365))}>+1 Yr</Chip>
            <Chip compact style={styles.quickChip} onPress={() => setExpiryDate(getOffsetDate(730))}>+2 Yrs</Chip>
            {expiryDate ? (
              <Chip compact icon="close" style={styles.quickChip} onPress={() => setExpiryDate("")}>
                No Expiry
              </Chip>
            ) : null}
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

      <DatePickerModal
        visible={Boolean(datePickerTarget)}
        title={datePickerTarget === "mfg" ? "Select Manufacturing Date" : "Select Expiry Date"}
        currentValue={datePickerTarget === "mfg" ? manufacturingDate : expiryDate}
        onSelectDate={(selected) => {
          if (datePickerTarget === "mfg") {
            setManufacturingDate(selected);
          } else if (datePickerTarget === "expiry") {
            setExpiryDate(selected);
          }
          setDatePickerTarget(null);
        }}
        onDismiss={() => setDatePickerTarget(null)}
      />
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
  fieldSubLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  quickDateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  quickChip: {
    marginRight: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dateModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 16,
    elevation: 6,
  },
  dateModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  dateNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  dateNavText: {
    fontSize: 15,
    fontWeight: "700",
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  calendarHeaderCell: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calendarCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    marginVertical: 2,
  },
  calendarCellSelected: {
    borderRadius: 19,
  },
  calendarCellText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateModalQuickActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
});

function DatePickerModal({
  visible,
  title,
  currentValue,
  onSelectDate,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  currentValue: string;
  onSelectDate: (dateStr: string) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  const initial = useMemo(() => {
    if (currentValue && /^\d{4}-\d{2}-\d{2}$/.test(currentValue)) {
      const [y, m, d] = currentValue.split("-").map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  }, [currentValue, visible]);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);

  useEffect(() => {
    if (visible) {
      setViewYear(initial.year);
      setViewMonth(initial.month);
      setSelectedDay(initial.day);
    }
  }, [visible, initial]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePickDay = (day: number) => {
    setSelectedDay(day);
    const mStr = String(viewMonth + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    onSelectDate(`${viewYear}-${mStr}-${dStr}`);
  };

  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={[styles.dateModalCard, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dateModalHeader}>
            <Text style={[styles.dateModalTitle, { color: theme.colors.onSurface }]}>{title}</Text>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>
          <Divider />

          {/* Month / Year Navigator */}
          <View style={styles.dateNavRow}>
            <IconButton icon="chevron-left" size={24} onPress={prevMonth} />
            <Text style={[styles.dateNavText, { color: theme.colors.onSurface }]}>
              {monthNames[viewMonth]} {viewYear}
            </Text>
            <IconButton icon="chevron-right" size={24} onPress={nextMonth} />
          </View>

          {/* Days of Week Header */}
          <View style={styles.calendarHeaderRow}>
            {dayHeaders.map((dh) => (
              <Text key={dh} style={[styles.calendarHeaderCell, { color: theme.colors.onSurfaceVariant }]}>
                {dh}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <View key={`blank-${idx}`} style={styles.calendarCell} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isSelected =
                day === selectedDay &&
                viewMonth === initial.month &&
                viewYear === initial.year &&
                Boolean(currentValue);

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.calendarCell,
                    isSelected && [styles.calendarCellSelected, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => handlePickDay(day)}
                >
                  <Text
                    style={[
                      styles.calendarCellText,
                      { color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Divider style={{ marginTop: 12, marginBottom: 8 }} />

          {/* Quick presets inside modal */}
          <View style={styles.dateModalQuickActions}>
            <Button
              compact
              mode="text"
              onPress={() => {
                onSelectDate(getTodayDate());
              }}
            >
              Set Today
            </Button>
            <Button
              compact
              mode="text"
              textColor={theme.colors.error}
              onPress={() => {
                onSelectDate("");
              }}
            >
              Clear Date
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

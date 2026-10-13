import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    Button,
    Card,
    Divider,
    IconButton,
    Surface,
    Switch,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import { useStore } from "../../context/store";
import { getCurrency, type Product } from "../../data/freshmart";
import { translate, type AppLanguage } from "../../lib/i18n";

export interface TingiConfigModalProps {
  visible: boolean;
  onDismiss: () => void;
  product: Product;
  language: AppLanguage;
  onSaved?: () => void;
}

export function TingiConfigModal({
  visible,
  onDismiss,
  product,
  language,
  onSaved,
}: TingiConfigModalProps) {
  const theme = useTheme();
  const { updateProduct } = useStore();

  const [hasTingi, setHasTingi] = useState(product.hasTingi ?? false);
  const [tingiUnit, setTingiUnit] = useState(product.tingiUnit ?? "stick");
  const [conversionRateStr, setConversionRateStr] = useState(
    product.tingiConversionRate ? String(product.tingiConversionRate) : "12"
  );
  const [tingiPriceStr, setTingiPriceStr] = useState(
    product.tingiPrice ? String(product.tingiPrice) : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const conversionRate = Number(conversionRateStr) || 0;
  const tingiPrice = Number(tingiPriceStr) || 0;
  const totalTingiUnits = Math.floor(product.currentStock * conversionRate);
  const fullPackTingiRevenue = conversionRate * tingiPrice;
  const packPrice = product.srpPrice && product.srpPrice > 0 ? product.srpPrice : product.unitPrice;
  const extraProfit = fullPackTingiRevenue - packPrice;

  const handleSave = async () => {
    if (hasTingi) {
      if (!tingiUnit.trim()) {
        Alert.alert(
          translate(language, "warningLabel") || "Warning",
          "Please specify a tingi unit name (e.g. stick, sachet)."
        );
        return;
      }
      if (conversionRate <= 0) {
        Alert.alert(
          translate(language, "warningLabel") || "Warning",
          "Units per pack must be greater than zero."
        );
        return;
      }
      if (tingiPrice <= 0) {
        Alert.alert(
          translate(language, "warningLabel") || "Warning",
          "Please enter a valid price per tingi unit."
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      updateProduct(product.id, {
        hasTingi,
        tingiUnit: hasTingi ? tingiUnit.trim() : undefined,
        tingiConversionRate: hasTingi ? conversionRate : undefined,
        tingiPrice: hasTingi ? tingiPrice : undefined,
      });

      Alert.alert(
        "Tingi Settings Saved",
        hasTingi
          ? `Tingi selling enabled: ${conversionRate} ${tingiUnit}s per ${product.unitType} at ${getCurrency(tingiPrice)} each.`
          : "Tingi selling disabled for this item."
      );
      onDismiss();
      if (onSaved) onSaved();
    } catch (err: any) {
      Alert.alert(
        translate(language, "errorLabel") || "Error",
        err?.message || "Failed to update tingi configuration."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Surface
          style={[
            styles.container,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Tingi / Fractional Selling
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                {product.icon} {product.name}
              </Text>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <ScrollView style={styles.scrollContent}>
            {/* Info callout */}
            <Surface
              style={[
                styles.infoBox,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
                💡 <Text style={{ fontWeight: "700" }}>Tingi Mode</Text> allows sari-sari stores to break down bulk items (boxes, packs, cartons) into individual retail units (sticks, sachets, cups).
              </Text>
            </Surface>

            {/* Toggle Switch */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 15, color: theme.colors.onSurface }}>
                  Enable Tingi for this Product
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Allow cashiers to sell by the piece or sachet in POS
                </Text>
              </View>
              <Switch
                value={hasTingi}
                onValueChange={setHasTingi}
                color={theme.colors.primary}
              />
            </View>

            {hasTingi ? (
              <View style={{ gap: 12, marginTop: 8 }}>
                <TextInput
                  label="Tingi Unit Name *"
                  mode="outlined"
                  placeholder="e.g. stick, sachet, piece, cup"
                  value={tingiUnit}
                  onChangeText={setTingiUnit}
                  style={{ backgroundColor: theme.colors.surface }}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    label={`Units per ${product.unitType || "Pack"} *`}
                    mode="outlined"
                    placeholder="e.g. 20"
                    value={conversionRateStr}
                    onChangeText={setConversionRateStr}
                    keyboardType="numeric"
                    style={{ flex: 1, backgroundColor: theme.colors.surface }}
                  />

                  <TextInput
                    label="Price per Unit (₱) *"
                    mode="outlined"
                    placeholder="0.00"
                    value={tingiPriceStr}
                    onChangeText={setTingiPriceStr}
                    keyboardType="numeric"
                    left={<TextInput.Affix text="₱ " />}
                    style={{ flex: 1, backgroundColor: theme.colors.surface }}
                  />
                </View>

                {/* Live Profit & Inventory Calculation */}
                {conversionRate > 0 && tingiPrice > 0 ? (
                  <Card style={{ backgroundColor: theme.colors.surfaceVariant, marginTop: 4 }}>
                    <Card.Content style={{ gap: 6 }}>
                      <Text style={{ fontWeight: "700", fontSize: 13, color: theme.colors.onSurface }}>
                        📊 Tingi Economics:
                      </Text>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Total Tingi Stock Available:</Text>
                        <Text style={[styles.calcValue, { color: theme.colors.primary }]}>
                          {totalTingiUnits} {tingiUnit}s ({product.currentStock} {product.unitType}s)
                        </Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Full Pack Retail Price:</Text>
                        <Text style={styles.calcValue}>{getCurrency(packPrice)}</Text>
                      </View>
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Full Pack Sold as Tingi:</Text>
                        <Text style={styles.calcValue}>{getCurrency(fullPackTingiRevenue)}</Text>
                      </View>
                      <Divider style={{ marginVertical: 2 }} />
                      <View style={styles.calcRow}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.onSurface }}>
                          Extra Profit per {product.unitType || "Pack"}:
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "800",
                            color: extraProfit >= 0 ? "#15803D" : "#DC2626",
                          }}
                        >
                          {extraProfit >= 0 ? `+${getCurrency(extraProfit)}` : getCurrency(extraProfit)}
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <Divider style={{ marginVertical: 12 }} />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              textColor="#FFFFFF"
              onPress={handleSave}
              loading={isSubmitting}
              style={{ flex: 1 }}
            >
              Save Configuration
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  container: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    maxHeight: 400,
  },
  infoBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  calcValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
});


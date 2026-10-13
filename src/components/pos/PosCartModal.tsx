import React from "react";
import { FlatList, Modal, StyleSheet, View } from "react-native";
import { Button, Divider, IconButton, Text, type MD3Theme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { CartItem } from "../../data/freshmart";
import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

interface Props {
  visible: boolean;
  cart: CartItem[];
  cartTotalItems: number;
  cartSubtotal: number;
  cartGrandTotal: number;
  isDesktop: boolean;
  language: AppLanguage;
  theme: MD3Theme;
  onClose: () => void;
  onClearCart: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => void;
  getCurrency: (val: number) => string;
}

export function PosCartModal({
  visible,
  cart,
  cartTotalItems,
  cartSubtotal,
  cartGrandTotal,
  isDesktop,
  language,
  theme,
  onClose,
  onClearCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onCheckout,
  getCurrency,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalBackdrop, isDesktop && styles.desktopModalBackdrop]}>
        <View
          style={[
            styles.cartModalCard,
            { backgroundColor: theme.colors.surface },
            isDesktop && styles.desktopModalCard,
          ]}
        >
          <View style={styles.cartModalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="cart" size={22} color={theme.colors.primary} />
              <Text style={[styles.cartModalTitle, { color: theme.colors.onSurface }]}>
                {translate(language, "cartTitle")} ({cartTotalItems})
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {cart.length > 0 ? (
                <Button compact textColor={theme.colors.error} onPress={onClearCart}>
                  {translate(language, "clearCart")}
                </Button>
              ) : null}
              <IconButton icon="close" size={20} onPress={onClose} />
            </View>
          </View>

          <Divider />

          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            style={styles.cartList}
            renderItem={({ item }) => (
              <View style={styles.cartItemRow}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.cartItemName, { color: theme.colors.onSurface }]}
                  >
                    {item.product.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                  >
                    {getCurrency(item.price)} each · {item.product.sku}
                  </Text>
                </View>

                <View style={styles.stepperWrap}>
                  <IconButton
                    icon="minus"
                    size={18}
                    mode="contained-tonal"
                    onPress={() => onUpdateQuantity(item.product.id, -1)}
                  />
                  <Text style={[styles.stepperQty, { color: theme.colors.onSurface }]}>
                    {item.quantity}
                  </Text>
                  <IconButton
                    icon="plus"
                    size={18}
                    mode="contained-tonal"
                    onPress={() => onUpdateQuantity(item.product.id, 1)}
                  />
                </View>

                <Text style={[styles.cartItemLineTotal, { color: theme.colors.onSurface }]}>
                  {getCurrency(item.price * item.quantity)}
                </Text>

                <IconButton
                  icon="trash-can-outline"
                  iconColor={theme.colors.error}
                  size={18}
                  onPress={() => onRemoveFromCart(item.product.id)}
                />
              </View>
            )}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {translate(language, "cartEmpty")}
                </Text>
              </View>
            }
          />

          <Divider />

          <View style={styles.cartSummaryBox}>
            <View style={styles.summaryLine}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {translate(language, "subtotalLabel")}
              </Text>
              <Text style={{ fontWeight: "600", color: theme.colors.onSurface }}>
                {getCurrency(cartSubtotal)}
              </Text>
            </View>
            <View style={styles.summaryLine}>
              <Text style={{ fontWeight: "800", fontSize: 18, color: theme.colors.onSurface }}>
                {translate(language, "totalLabel")}
              </Text>
              <Text style={{ fontWeight: "800", fontSize: 20, color: theme.colors.primary }}>
                {getCurrency(cartGrandTotal)}
              </Text>
            </View>

            <Button
              mode="contained"
              disabled={cart.length === 0}
              buttonColor={theme.colors.primary}
              onPress={() => {
                onClose();
                onCheckout();
              }}
              style={{ marginTop: 12 }}
            >
              {translate(language, "checkoutButton")} ({getCurrency(cartGrandTotal)})
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  desktopModalBackdrop: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  desktopModalCard: {
    maxWidth: 580,
    width: "100%",
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  cartModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  cartModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cartList: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#00000015",
  },
  cartItemName: {
    fontWeight: "600",
    fontSize: 14,
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginRight: 8,
  },
  stepperQty: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 14,
  },
  cartItemLineTotal: {
    fontWeight: "700",
    fontSize: 14,
    minWidth: 64,
    textAlign: "right",
  },
  cartSummaryBox: {
    padding: 16,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
});

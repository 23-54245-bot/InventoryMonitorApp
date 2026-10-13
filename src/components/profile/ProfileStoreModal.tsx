import React from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Modal, Portal, Text, TextInput, type MD3Theme } from "react-native-paper";

import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

interface Props {
  visible: boolean;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  businessHours: string;
  permitNumber: string;
  keyboardOffset: number;
  setStoreName: (v: string) => void;
  setStoreAddress: (v: string) => void;
  setStorePhone: (v: string) => void;
  setStoreEmail: (v: string) => void;
  setBusinessHours: (v: string) => void;
  setPermitNumber: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  language: AppLanguage;
  theme: MD3Theme;
}

export function ProfileStoreModal({
  visible,
  storeName,
  storeAddress,
  storePhone,
  storeEmail,
  businessHours,
  permitNumber,
  keyboardOffset,
  setStoreName,
  setStoreAddress,
  setStorePhone,
  setStoreEmail,
  setBusinessHours,
  setPermitNumber,
  onSave,
  onClose,
  language,
  theme,
}: Props) {
  const windowHeight = Dimensions.get("window").height;
  const maxHeight = Math.min(windowHeight * 0.88, windowHeight - keyboardOffset - 40);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface, marginBottom: keyboardOffset, maxHeight },
        ]}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderTitleRow}>
            <IconButton icon="store-cog" size={24} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>
              {translate(language, "editStoreInfo")}
            </Text>
          </View>
          <IconButton icon="close" size={20} onPress={onClose} style={{ margin: 0 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.modalScroll}
        >
          <TextInput label={translate(language, "storeNameLabel")} value={storeName} onChangeText={setStoreName} mode="outlined" style={styles.input} />
          <TextInput label={translate(language, "storeAddressLabel")} value={storeAddress} onChangeText={setStoreAddress} mode="outlined" style={styles.input} />
          <TextInput label={translate(language, "storePhoneLabel")} value={storePhone} onChangeText={setStorePhone} mode="outlined" style={styles.input} keyboardType="phone-pad" />
          <TextInput label={translate(language, "storeEmailLabel")} value={storeEmail} onChangeText={setStoreEmail} mode="outlined" style={styles.input} keyboardType="email-address" />
          <TextInput label={translate(language, "businessHours")} value={businessHours} onChangeText={setBusinessHours} mode="outlined" style={styles.input} />
          <TextInput label={translate(language, "businessPermitNo")} value={permitNumber} onChangeText={setPermitNumber} mode="outlined" style={styles.input} />
        </ScrollView>

        <View style={styles.editActionRow}>
          <Button mode="outlined" onPress={onClose} style={styles.editActionButton}>
            {translate(language, "cancelButton")}
          </Button>
          <Button mode="contained" onPress={onSave} style={styles.editActionButton}>
            {translate(language, "saveButton")}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    marginTop: "auto",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalHeaderTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalScroll: { flexGrow: 0 },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
  input: { marginBottom: 14, backgroundColor: "transparent" },
  editActionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  editActionButton: { flex: 1, borderRadius: 16 },
});

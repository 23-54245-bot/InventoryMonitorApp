import { Image } from "expo-image";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Button, Chip, IconButton, Modal, Portal, Text, TextInput, type MD3Theme } from "react-native-paper";

import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

interface Props {
  visible: boolean;
  gcashName: string;
  gcashNumber: string;
  gcashQrUri?: string;
  mayaName: string;
  mayaNumber: string;
  mayaQrUri?: string;
  keyboardOffset: number;
  setGcashName: (v: string) => void;
  setGcashNumber: (v: string) => void;
  setMayaName: (v: string) => void;
  setMayaNumber: (v: string) => void;
  onPickGCashQR: () => void;
  onPickMayaQR: () => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  language: AppLanguage;
  theme: MD3Theme;
}

export function ProfileQrModal({
  visible,
  gcashName,
  gcashNumber,
  gcashQrUri,
  mayaName,
  mayaNumber,
  mayaQrUri,
  keyboardOffset,
  setGcashName,
  setGcashNumber,
  setMayaName,
  setMayaNumber,
  onPickGCashQR,
  onPickMayaQR,
  saving,
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
            <IconButton icon="qrcode-edit" size={24} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>
              {translate(language, "digitalPaymentQrs")}
            </Text>
          </View>
          <IconButton icon="close" size={20} onPress={onClose} style={{ margin: 0 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
          <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant, marginBottom: 16 }]}>
            {translate(language, "digitalPaymentHelper")}
          </Text>

          {/* GCash Section */}
          <View style={[styles.walletSection, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <View style={styles.walletSectionHeader}>
              <Text style={[styles.walletTitle, { color: "#007DFE" }]}>{translate(language, "gcashAccountQr")}</Text>
              {gcashQrUri ? (
                <Chip compact style={{ backgroundColor: "#DCFCE7" }} textStyle={{ color: "#166534", fontSize: 10 }}>
                  {translate(language, "qrAttached")}
                </Chip>
              ) : null}
            </View>
            <TextInput
              label={translate(language, "accountNameLabel")}
              value={gcashName}
              onChangeText={setGcashName}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              placeholder={translate(language, "exampleNamePlaceholder")}
            />
            <TextInput
              label={translate(language, "mobileNumberLabel")}
              value={gcashNumber}
              onChangeText={setGcashNumber}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              keyboardType="phone-pad"
              placeholder={translate(language, "phonePlaceholderPh")}
            />
            <View style={styles.qrRow}>
              {gcashQrUri ? (
                <Image
                  source={{ uri: gcashQrUri }}
                  style={styles.qrPreview}
                  contentFit="contain"
                />
              ) : null}
              <Button mode="contained-tonal" icon="image-outline" compact onPress={onPickGCashQR}>
                {gcashQrUri ? translate(language, "changeQrImage") : translate(language, "uploadGcashQr")}
              </Button>
            </View>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {translate(language, "qrScanningHint")}
            </Text>
          </View>

          {/* Maya Section */}
          <View style={[styles.walletSection, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
            <View style={styles.walletSectionHeader}>
              <Text style={[styles.walletTitle, { color: "#16A34A" }]}>{translate(language, "mayaAccountQr")}</Text>
              {mayaQrUri ? (
                <Chip compact style={{ backgroundColor: "#DCFCE7" }} textStyle={{ color: "#166534", fontSize: 10 }}>
                  {translate(language, "qrAttached")}
                </Chip>
              ) : null}
            </View>
            <TextInput
              label={translate(language, "accountNameLabel")}
              value={mayaName}
              onChangeText={setMayaName}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              placeholder={translate(language, "exampleNamePlaceholder")}
            />
            <TextInput
              label={translate(language, "mobileNumberLabel")}
              value={mayaNumber}
              onChangeText={setMayaNumber}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              keyboardType="phone-pad"
              placeholder={translate(language, "phonePlaceholderPh")}
            />
            <View style={styles.qrRow}>
              {mayaQrUri ? (
                <Image
                  source={{ uri: mayaQrUri }}
                  style={styles.qrPreview}
                  contentFit="contain"
                />
              ) : null}
              <Button mode="contained-tonal" icon="image-outline" compact onPress={onPickMayaQR}>
                {mayaQrUri ? translate(language, "changeQrImage") : translate(language, "uploadMayaQr")}
              </Button>
            </View>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {translate(language, "qrScanningHint")}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.editActionRow}>
          <Button mode="outlined" onPress={onClose} style={styles.editActionButton}>
            {translate(language, "cancelButton")}
          </Button>
          <Button mode="contained" onPress={onSave} loading={saving} style={styles.editActionButton}>
            {translate(language, "saveQrsButton")}
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
  helperText: { marginBottom: 12, lineHeight: 20 },
  walletSection: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  walletSectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  walletTitle: { fontWeight: "700", fontSize: 15, flex: 1 },
  input: { marginBottom: 14 },
  qrRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  qrPreview: { width: 140, height: 140, borderRadius: 8, backgroundColor: "#FFFFFF" },
  hint: { fontSize: 11, marginTop: 8 },
  editActionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  editActionButton: { flex: 1, borderRadius: 16 },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, IconButton, Switch, Text, TouchableRipple, useTheme } from "react-native-paper";

import { ExportFormatDialog } from "../components/export-format-dialog";
import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { showAlert } from "../lib/alert";
import { languageOptions, translate } from "../lib/i18n";
import { downloadInventoryExcel, downloadInventoryWord, printInventoryData } from "../lib/inventory-export";

export default function Settings() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();
  const { state, toggleNotificationPreference, toggleDarkMode, toggleBiometricPreference, setLanguage } = useStore();
  const language = state.user.preferences.language;
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const palette = theme.dark ? DARK_PALETTE : LIGHT_PALETTE;

  const logout = () => {
    signOut();
    router.replace("/login");
  };

  const handleBiometricChange = async (enabled: boolean) => {
    if (!enabled) {
      toggleBiometricPreference();
      return;
    }

    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!supported || !enrolled) {
      showAlert("Biometric Login Unavailable", "Set up Face ID, Touch ID, or fingerprint authentication on this device first.");
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm Biometric Login" });
    if (result.success) {
      toggleBiometricPreference();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.geometry, { backgroundColor: palette.background }]} pointerEvents="none">
        <View style={[styles.line, styles.lineOne]} />
        <View style={[styles.line, styles.lineTwo]} />
        <View style={[styles.line, styles.lineThree]} />
        <View style={styles.glow} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton icon="arrow-left" iconColor={palette.text} size={21} style={[styles.backButton, { backgroundColor: palette.control }]} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as any))} />
          <Text style={[styles.title, { color: palette.text }]}>{translate(language, "settingsTitle")}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={[styles.panel, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{translate(language, "generalSettingsLabel")}</Text>
          <View style={styles.languagePicker}>
            <TouchableRipple onPress={() => setLanguageMenuVisible((visible) => !visible)} borderless><SettingRow palette={palette} icon="web" label={translate(language, "languageLabel")} value={language} /></TouchableRipple>
            {languageMenuVisible ? <View style={[styles.languageDropdown, { backgroundColor: palette.panel, borderColor: palette.border }]}>{languageOptions.map((option) => <TouchableRipple key={option} onPress={() => { setLanguage(option); setLanguageMenuVisible(false); }}><View style={styles.languageOption}><Text style={{ color: palette.text, fontSize: 14 }}>{option}</Text>{option === language ? <MaterialCommunityIcons name="check" size={18} color={palette.switchOn} /> : null}</View></TouchableRipple>)}</View> : null}
          </View>
          <SettingRow palette={palette} icon="theme-light-dark" label={translate(language, "themeLabel")} value={state.user.preferences.darkMode ? "Dark" : "Light"} right={<Switch value={state.user.preferences.darkMode} onValueChange={toggleDarkMode} color={palette.switchOn} />} />
          <SettingRow palette={palette} icon="clock-time-four-outline" label={translate(language, "timezoneLabel")} value="PST (UTC-8)" />
          <SettingRow palette={palette} icon="bell-outline" label={translate(language, "notificationsLabel")} value="" right={<Switch value={state.user.preferences.notificationsEnabled} onValueChange={toggleNotificationPreference} color={palette.switchOn} />} />
        </View>

        <View style={[styles.panel, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{translate(language, "notificationSettingsLabel")}</Text>
          <SettingRow palette={palette} icon="alert-outline" label={translate(language, "lowStockAlertsToggle")} value={lowStockAlerts ? "Enabled" : "Disabled"} right={<Switch value={lowStockAlerts} onValueChange={setLowStockAlerts} color={palette.switchOn} />} />
          <SettingRow palette={palette} icon="calendar-alert" label={translate(language, "expiryAlertsToggle")} value={expiryAlerts ? "Enabled" : "Disabled"} right={<Switch value={expiryAlerts} onValueChange={setExpiryAlerts} color={palette.switchOn} />} />
          <SettingRow palette={palette} icon="wifi-off" label={translate(language, "offlineModeLabel")} value={offlineMode ? "Enabled" : "Disabled"} right={<Switch value={offlineMode} onValueChange={setOfflineMode} color={palette.switchOn} />} />
          <SettingRow palette={palette} icon="backup-restore" label={translate(language, "autoBackupLabel")} value={autoBackup ? "Daily" : "Off"} right={<Switch value={autoBackup} onValueChange={setAutoBackup} color={palette.switchOn} />} />
        </View>

        <View style={[styles.panel, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{translate(language, "securityLabel")}</Text>
          <SettingRow palette={palette} icon="fingerprint" label={translate(language, "biometricLoginLabel")} value={state.user.preferences.biometricEnabled ? "Enabled" : "Disabled"} right={<Switch value={state.user.preferences.biometricEnabled} onValueChange={handleBiometricChange} color={palette.switchOn} />} />
          <Divider style={[styles.divider, { backgroundColor: palette.border }]} />
          <TouchableRipple onPress={() => router.push("/change-password")} borderless><SettingRow palette={palette} icon="lock-outline" label={translate(language, "changePasswordTitle")} value="" right={<MaterialCommunityIcons name="chevron-right" size={20} color={palette.textMuted} />} /></TouchableRipple>
          <View style={styles.exportRow}><Button mode="outlined" icon="download-outline" textColor={palette.text} onPress={() => setExportDialogVisible(true)}>Download Data</Button><Button mode="outlined" icon="printer-outline" textColor={palette.text} onPress={() => printInventoryData(state)}>Print</Button></View>
        </View>
        <Button mode="outlined" icon="logout" textColor={palette.text} onPress={logout} style={[styles.logoutButton, { borderColor: palette.border }]}>Log Out</Button>
      </ScrollView>
      <ExportFormatDialog
        visible={exportDialogVisible}
        title="Download Data"
        onDismiss={() => setExportDialogVisible(false)}
        onSelectExcel={() => downloadInventoryExcel(state)}
        onSelectWord={() => downloadInventoryWord(state)}
      />
    </View>
  );
}

const LIGHT_PALETTE = { background: "#eef2f6", panel: "#ffffff", border: "rgba(24, 59, 86, 0.14)", text: "#19324a", textMuted: "#6b7c8f", switchOn: "#159a72", control: "#e5ecf2", avatar: "#dceaf3", avatarText: "#183b56", activeDock: "#dceaf3" };
const DARK_PALETTE = { background: "#0d1526", panel: "#152035", border: "rgba(59, 130, 246, 0.25)", text: "#dde8f7", textMuted: "#aeb9df", switchOn: "#22c55e", control: "#1a2d4a", avatar: "#26366f", avatarText: "#dce5ff", activeDock: "#1a2d4a" };

type Palette = typeof LIGHT_PALETTE;

function SettingRow({ icon, label, value, right, palette }: { icon: string; label: string; value: string; right?: React.ReactNode; palette: Palette }) {
  return <View style={styles.settingRow}><View style={styles.settingIcon}><MaterialCommunityIcons name={icon as any} size={15} color={palette.textMuted} /></View><Text style={[styles.settingLabel, { color: palette.text }]}>{label}</Text><Text style={[styles.settingValue, { color: palette.textMuted }]}>{value}</Text>{right}</View>;
}

function DockItem({ icon, active, onPress, palette }: { icon: string; active?: boolean; onPress: () => void; palette: Palette }) {
  return <TouchableRipple onPress={onPress} borderless style={[styles.dockItem, active && { backgroundColor: palette.activeDock }]}><MaterialCommunityIcons name={icon as any} size={19} color={active ? "#31428d" : palette.text} /></TouchableRipple>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: Platform.OS === "ios" ? 42 : 22, paddingBottom: 28 },
  geometry: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" },
  line: { position: "absolute", width: 440, height: 150, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(24, 59, 86, 0.05)", transform: [{ rotate: "28deg" }] },
  lineOne: { top: 90, left: -170 }, lineTwo: { top: 340, left: 100 }, lineThree: { top: 590, left: -180 },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 160, backgroundColor: "rgba(57, 121, 168, 0.06)", top: -110, right: -80 },
  topBar: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  backButton: { margin: 0, width: 38, height: 38, borderRadius: 20, backgroundColor: "rgba(206, 216, 255, 0.16)" },
  title: { fontSize: 22, fontWeight: "700" },
  topBarSpacer: { width: 38 },
  profilePanel: { padding: 16, borderRadius: 13, borderWidth: 1, marginBottom: 10 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 11 },
  avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#dbe6ff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,.85)" },
  avatarText: { color: "#43519a", fontWeight: "800", fontSize: 14 },
  profileCopy: { marginLeft: 11 }, profileName: { fontSize: 16, fontWeight: "500" }, profileRole: { fontSize: 10, marginTop: 2 },
  editButton: { height: 31, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 11 }, editText: { fontSize: 11 },
  contactRow: { flexDirection: "row", alignItems: "center", marginTop: 6 }, contactText: { fontSize: 10, marginLeft: 8 },
  panel: { padding: 16, borderRadius: 13, borderWidth: 1, marginBottom: 12 }, sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  settingRow: { minHeight: 46, flexDirection: "row", alignItems: "center" }, settingIcon: { width: 24, alignItems: "center" }, settingLabel: { fontSize: 15, marginLeft: 9 }, settingValue: { fontSize: 13, marginLeft: "auto" },
  languagePicker: { position: "relative", zIndex: 10 },
  languageDropdown: { position: "absolute", top: 44, right: 0, width: 180, borderRadius: 10, borderWidth: 1, overflow: "hidden", elevation: 6, shadowColor: "#19324a", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  languageOption: { minHeight: 42, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divider: { marginVertical: 5 }, exportRow: { flexDirection: "row", gap: 8, marginTop: 8 }, logoutButton: { marginTop: 2 },
  dock: { position: "absolute", bottom: 10, left: 14, right: 14, height: 52, borderRadius: 26, backgroundColor: "rgba(198, 207, 255, 0.56)", borderWidth: 1, borderColor: "rgba(255,255,255,.2)", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 7 },
  dockItem: { width: 43, height: 38, borderRadius: 20, alignItems: "center", justifyContent: "center" }, dockItemActive: { backgroundColor: "#84dbec" },
});

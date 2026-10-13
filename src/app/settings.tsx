import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Divider, IconButton, Switch, Text, TouchableRipple, useTheme } from "react-native-paper";

import { useAuth } from "../context/auth";
import { useStore } from "../context/store";
import { showAlert } from "../lib/alert";
import { languageOptions, translate } from "../lib/i18n";
import { downloadInventoryExcel, downloadInventoryWord, printInventoryData } from "../lib/inventory-export";
import { SyncBadge } from "../components/sync-badge";

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
  const [syncNotice, setSyncNotice] = useState<{ title: string; message: string } | null>(null);

  const logout = async () => {
    const result = await signOut();
    if (!result.success) {
      setSyncNotice({ title: translate(language, "syncErrorTitle"), message: result.message });
      return;
    }
    router.replace("/login");
  };

  const handleBiometricChange = async (enabled: boolean) => {
    if (!enabled) {
      toggleBiometricPreference();
      return;
    }

    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        showAlert(translate(language, "biometricUnavailableTitle"), translate(language, "biometricUnavailableMessage"));
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm Biometric Login" });
      if (result.success) {
        toggleBiometricPreference();
      } else if (result.error !== "user_cancel" && result.error !== "system_cancel") {
        showAlert(translate(language, "biometricUnavailableTitle"), translate(language, "biometricFailed"));
      }
    } catch {
      showAlert(translate(language, "biometricUnavailableTitle"), translate(language, "biometricFailed"));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.containerWrap}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <IconButton
              icon="arrow-left"
              iconColor={theme.colors.onSurface}
              size={22}
              style={[styles.backButton, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile" as Href))}
            />
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{translate(language, "settingsTitle")}</Text>
            <View style={styles.topBarSpacer} />
          </View>

        {/* Group 1 — Preferences */}
        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "preferencesTitle")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableRipple onPress={() => setLanguageMenuVisible((v) => !v)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons name="web" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "languageLabel")}</Text>
              </View>
              <View style={styles.rowRightWrap}>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{language}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>
          </TouchableRipple>
          {languageMenuVisible ? (
            <View style={[styles.languageDropdown, { backgroundColor: theme.colors.surfaceVariant }]}>
              {languageOptions.map((option) => (
                <TouchableRipple
                  key={option}
                  onPress={() => {
                    setLanguage(option);
                    setLanguageMenuVisible(false);
                  }}
                >
                  <View style={styles.languageOption}>
                    <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>{option}</Text>
                    {option === language ? <MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} /> : null}
                  </View>
                </TouchableRipple>
              ))}
            </View>
          ) : null}

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="theme-light-dark" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "themeLabel")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={state.user.preferences.darkMode} onValueChange={toggleDarkMode} color={theme.colors.primary} />
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="clock-time-four-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "timezoneLabel")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>PST (UTC-8)</Text>
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "notificationsLabel")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={state.user.preferences.notificationsEnabled} onValueChange={toggleNotificationPreference} color={theme.colors.primary} />
            </View>
          </View>
        </View>

        {/* Group 2 — Alerts & Sync */}
        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "alertsAndSync")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="alert-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "lowStockAlertsToggle")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={lowStockAlerts} onValueChange={setLowStockAlerts} color={theme.colors.primary} />
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="calendar-alert" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "expiryAlertsToggle")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={expiryAlerts} onValueChange={setExpiryAlerts} color={theme.colors.primary} />
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="wifi-off" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "offlineModeLabel")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={offlineMode} onValueChange={setOfflineMode} color={theme.colors.primary} />
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="backup-restore" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "autoBackupLabel")}</Text>
            </View>
            <View style={styles.rowRightWrap}>
              <Switch value={autoBackup} onValueChange={setAutoBackup} color={theme.colors.primary} />
            </View>
          </View>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <View style={styles.rowInner}>
            <View style={styles.rowIconWrap}>
              <MaterialCommunityIcons name="cloud-sync-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "offlineSyncQueue")}</Text>
              <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "pendingUpdates")}</Text>
            </View>
            <SyncBadge />
          </View>
        </View>

        {/* Group 3 — Security */}
        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "securityLabel")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          {Platform.OS !== "web" ? (
            <>
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="fingerprint" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "biometricLoginLabel")}</Text>
                </View>
                <View style={styles.rowRightWrap}>
                  <Switch value={state.user.preferences.biometricEnabled} onValueChange={handleBiometricChange} color={theme.colors.primary} />
                </View>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />
            </>
          ) : null}

          <TouchableRipple onPress={() => router.push("/change-password")} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "changePasswordTitle")}</Text>
              </View>
              <View style={styles.rowRightWrap}>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>
          </TouchableRipple>
        </View>

        {/* Group 4 — Data */}
        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "dataGroupHeader")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableRipple onPress={() => downloadInventoryExcel(state)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons name="file-excel-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "downloadExcelCsv")}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "spreadsheetReportSubtitle")}</Text>
              </View>
              <View style={styles.rowRightWrap}>
                <MaterialCommunityIcons name="download-outline" size={18} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableRipple>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <TouchableRipple onPress={() => downloadInventoryWord(state)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons name="file-word-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "downloadWordDoc")}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "formattedDocSubtitle")}</Text>
              </View>
              <View style={styles.rowRightWrap}>
                <MaterialCommunityIcons name="download-outline" size={18} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableRipple>

          <Divider style={{ backgroundColor: theme.colors.outline }} />

          <TouchableRipple onPress={() => printInventoryData(state)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}>
                <MaterialCommunityIcons name="printer-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "printInventoryAction")}</Text>
                <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "printSummarySubtitle")}</Text>
              </View>
              <View style={styles.rowRightWrap}>
                <MaterialCommunityIcons name="printer-outline" size={18} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableRipple>
        </View>

        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "legalGroupTitle")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableRipple onPress={() => router.push("/privacy-policy" as Href)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}><MaterialCommunityIcons name="shield-account-outline" size={18} color={theme.colors.primary} /></View>
              <View style={styles.rowTextWrap}><Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "privacyPolicy")}</Text></View>
              <View style={styles.rowRightWrap}><MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} /></View>
            </View>
          </TouchableRipple>
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <TouchableRipple onPress={() => router.push("/terms-of-service" as Href)} borderless>
            <View style={styles.rowInner}>
              <View style={styles.rowIconWrap}><MaterialCommunityIcons name="file-document-outline" size={18} color={theme.colors.primary} /></View>
              <View style={styles.rowTextWrap}><Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "termsOfService")}</Text></View>
              <View style={styles.rowRightWrap}><MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} /></View>
            </View>
          </TouchableRipple>
        </View>

        {/* Group 5 — Account (destructive) */}
        <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "tabAccount")}</Text>
        <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableRipple onPress={logout} borderless>
            <View style={styles.destructiveRow}>
              <MaterialCommunityIcons name="logout" size={18} color={theme.colors.error} />
              <Text style={[styles.destructiveText, { color: theme.colors.error }]}>{translate(language, "logOutButton")}</Text>
            </View>
          </TouchableRipple>
        </View>
      </ScrollView>

      {syncNotice ? (
        <View style={styles.noticeBackdrop} pointerEvents="box-none">
          <View style={[styles.noticeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Text style={[styles.noticeTitle, { color: theme.colors.onSurface }]}>{syncNotice.title}</Text>
            <Text style={[styles.noticeMessage, { color: theme.colors.onSurface }]}>{syncNotice.message}</Text>
            <TouchableRipple onPress={() => setSyncNotice(null)} borderless>
              <View style={styles.noticeActionWrap}>
                <Text style={[styles.noticeAction, { color: theme.colors.primary }]}>OK</Text>
              </View>
            </TouchableRipple>
          </View>
        </View>
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerWrap: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 44 : 24, paddingBottom: 36 },
  topBar: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { margin: 0, width: 38, height: 38, borderRadius: 19 },
  title: { fontSize: 22, fontWeight: "700" },
  topBarSpacer: { width: 38 },
  groupHeader: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 14,
  },
  groupContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 6,
  },
  rowInner: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowIconWrap: {
    width: 28,
    alignItems: "flex-start",
  },
  rowTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  languageDropdown: {
    paddingVertical: 4,
  },
  languageOption: {
    minHeight: 40,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  destructiveRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  destructiveText: {
    fontSize: 15,
    fontWeight: "600",
  },
  noticeBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  noticeCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  noticeTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
  },
  noticeMessage: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 16,
  },
  noticeActionWrap: {
    alignItems: "flex-end",
    paddingTop: 8,
  },
  noticeAction: {
    fontSize: 18,
    fontWeight: "700",
  },
});

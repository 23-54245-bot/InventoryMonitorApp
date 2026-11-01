import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Surface, Text, useTheme } from "react-native-paper";

import { useStore } from "../context/store";
import { showAlert } from "../lib/alert";
import { translate } from "../lib/i18n";
import {
    clearSyncQueue,
    getPendingSyncCount,
    processSyncQueue,
    subscribeSyncQueue,
} from "../lib/sync-queue";

interface Props {
  style?: any;
}

export function SyncBadge({ style }: Props) {
  const theme = useTheme();
  const { state } = useStore();
  const storeId = state.user.storeId ?? "";
  const language = state.user.preferences?.language ?? "English";
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const visiblePendingCount = storeId ? pendingCount : 0;

  useEffect(() => {
    if (!storeId) return;
    void getPendingSyncCount(storeId).then(setPendingCount).catch((error) => {
      showAlert(translate(language, "syncErrorTitle"), error instanceof Error ? error.message : String(error));
    });
    const unsub = subscribeSyncQueue(setPendingCount, storeId);
    return unsub;
  }, [storeId, language]);

  const handlePress = () => {
    setResultMessage("");
    setConfirmingClear(false);
    setDialogVisible(true);
  };

  const handleSync = async () => {
    setSyncing(true);
    setResultMessage("");
    try {
      const res = await processSyncQueue(storeId);
      const failureDetails = res.failedItems.length
        ? `\n\nFailed operations:\n${res.failedItems.map((item) => `• ${item.type}: ${item.error}`).join("\n")}`
        : "";
      setResultMessage(
        translate(language, "syncResultSummary")
          .replace("{synced}", String(res.successCount))
          .replace("{failed}", String(res.failedCount))
          .replace("{remaining}", String(res.remainingCount)) + failureDetails,
      );
      setPendingCount(res.remainingCount);
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  };

  const handleClearQueue = async () => {
    try {
      await clearSyncQueue(storeId);
      setPendingCount(0);
      setConfirmingClear(false);
      setResultMessage(translate(language, "syncQueueCleared"));
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (visiblePendingCount === 0 && !syncing && !dialogVisible) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.badgeContainer,
        { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error },
        style,
      ]}
    >
      {syncing ? (
        <ActivityIndicator size={14} color={theme.colors.onErrorContainer} />
      ) : (
        <MaterialCommunityIcons name="cloud-sync-outline" size={16} color={theme.colors.onErrorContainer} />
      )}
      <Text style={[styles.badgeText, { color: theme.colors.onErrorContainer }]}>
        {syncing ? translate(language, "syncing") : `${visiblePendingCount} ${translate(language, "pendingLabel")}`}
      </Text>
      <Modal
        visible={dialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Surface style={[styles.dialog, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {translate(language, "offlineSyncQueue")}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              {visiblePendingCount === 0
                ? translate(language, "allSynced")
                : `${visiblePendingCount} ${translate(language, "pendingUpdates")}`}
            </Text>
            {resultMessage ? (
              <ScrollView style={styles.resultBox}>
                <Text selectable style={{ color: theme.colors.onSurface }}>{resultMessage}</Text>
              </ScrollView>
            ) : null}
            {confirmingClear ? (
              <>
                <Text style={{ color: theme.colors.error, marginTop: 12 }}>
                  This permanently discards all pending changes for this store.
                </Text>
                <View style={styles.actions}>
                  <Button mode="outlined" onPress={() => setConfirmingClear(false)}>
                    {translate(language, "cancelButton")}
                  </Button>
                  <Button mode="contained" buttonColor={theme.colors.error} onPress={() => void handleClearQueue()}>
                    {translate(language, "clearQueue")}
                  </Button>
                </View>
              </>
            ) : (
              <View style={styles.actions}>
                <Button mode="outlined" disabled={syncing || visiblePendingCount === 0} onPress={() => setConfirmingClear(true)}>
                  {translate(language, "clearQueue")}
                </Button>
                <Button mode="contained" loading={syncing} disabled={syncing || visiblePendingCount === 0} onPress={() => void handleSync()}>
                  {translate(language, "syncNow")}
                </Button>
                <Button mode="text" disabled={syncing} onPress={() => setDialogVisible(false)}>
                  {translate(language, "cancelButton")}
                </Button>
              </View>
            )}
          </Surface>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderRadius: 16,
    padding: 20,
  },
  resultBox: {
    maxHeight: 180,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(127, 127, 127, 0.12)",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
});

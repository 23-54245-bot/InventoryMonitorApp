import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

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
    Alert.alert(
      translate(language, "offlineSyncQueue"),
      visiblePendingCount === 0
        ? translate(language, "allSynced")
        : `${visiblePendingCount} ${translate(language, "pendingUpdates")}`,
      [
        {
          text: translate(language, "clearQueue"),
          style: "destructive",
          onPress: async () => {
            try {
              await clearSyncQueue(storeId);
              Alert.alert(translate(language, "cleared") || "Cleared", translate(language, "syncQueueCleared"));
            } catch (error) {
              showAlert(translate(language, "syncErrorTitle"), error instanceof Error ? error.message : String(error));
            }
          },
        },
        {
          text: translate(language, "cancelButton"),
          style: "cancel",
        },
        {
          text: translate(language, "syncNow"),
          onPress: async () => {
            setSyncing(true);
            try {
              const res = await processSyncQueue(storeId);
              const failureDetails = res.failedItems.length
                ? `\n\nFailed operations:\n${res.failedItems.map((item) => `• ${item.type}: ${item.error}`).join("\n")}`
                : "";
              Alert.alert(
                translate(language, "syncCompleteTitle"),
                translate(language, "syncResultSummary")
                  .replace("{synced}", String(res.successCount))
                  .replace("{failed}", String(res.failedCount))
                  .replace("{remaining}", String(res.remainingCount)) + failureDetails,
              );
            } catch (err: any) {
              Alert.alert(translate(language, "syncErrorTitle"), err?.message || translate(language, "failedToSyncQueue"));
            } finally {
              setSyncing(false);
            }
          },
        },
      ],
    );
  };

  if (visiblePendingCount === 0 && !syncing) {
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
});

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../../context/auth";
import { useStore } from "../../context/store";
import { getCurrency, type CashShift } from "../../data/freshmart";
import { translate, type AppLanguage } from "../../lib/i18n";
import { ShiftModal } from "./ShiftModal";

export interface ShiftsSectionProps {
  language: AppLanguage;
}

export function ShiftsSection({ language }: ShiftsSectionProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { currentShift, shifts } = useStore();

  const [modalVisible, setModalVisible] = useState(false);

  const canManageShifts = session?.role === "Admin" || session?.role === "Manager";

  const closedShifts = shifts
    .filter((s) => s.status === "closed")
    .slice(0, 5);

  const isShiftOpen = Boolean(currentShift && currentShift.status === "open");

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Card.Content>
        {/* Section Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Cash Shifts & Drawer
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
              Track cash drawer floats, cash sales, and end-of-day reconciliation
            </Text>
          </View>
          <Chip
            compact
            style={{
              backgroundColor: isShiftOpen ? "#DCFCE7" : theme.colors.surfaceVariant,
            }}
            textStyle={{
              fontSize: 11,
              fontWeight: "700",
              color: isShiftOpen ? "#15803D" : theme.colors.onSurfaceVariant,
            }}
          >
            {isShiftOpen ? "OPEN SHIFT" : "NO ACTIVE SHIFT"}
          </Chip>
        </View>

        <Divider style={{ marginVertical: 12 }} />

        {/* Current Shift Status */}
        {isShiftOpen && currentShift ? (
          <Surface style={[styles.activeBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cashier:</Text>
              <Text style={styles.detailValue}>{currentShift.cashierName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Started:</Text>
              <Text style={styles.detailValue}>
                {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Opening Float:</Text>
              <Text style={styles.detailValue}>{getCurrency(currentShift.openingFloat)}</Text>
            </View>

            {canManageShifts ? (
              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                textColor="#FFFFFF"
                icon="cash-register"
                onPress={() => setModalVisible(true)}
                style={{ marginTop: 10 }}
              >
                End Shift & Count Drawer
              </Button>
            ) : null}
          </Surface>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
              The cash register is currently closed. Start a shift to record your opening float.
            </Text>
            {canManageShifts ? (
              <Button
                mode="contained"
                icon="cash-register"
                buttonColor={theme.colors.primary}
                onPress={() => setModalVisible(true)}
              >
                Open Register / Start Shift
              </Button>
            ) : null}
          </View>
        )}

        {/* Recent Shifts History */}
        {closedShifts.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.historyHeading, { color: theme.colors.onSurface }]}>
              Recent Closed Shifts
            </Text>
            <View style={{ gap: 8, marginTop: 6 }}>
              {closedShifts.map((shift) => {
                const variance = shift.variance ?? 0;
                const dateStr = shift.closedAt
                  ? new Date(shift.closedAt).toLocaleDateString([], { month: "short", day: "numeric" })
                  : new Date(shift.openedAt).toLocaleDateString([], { month: "short", day: "numeric" });

                return (
                  <Surface
                    key={shift.id}
                    style={[styles.historyRow, { borderColor: theme.colors.outline }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", fontSize: 13, color: theme.colors.onSurface }}>
                        {dateStr} · {shift.cashierName}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>
                        Float: {getCurrency(shift.openingFloat)} · Counted: {getCurrency(shift.countedCash ?? 0)}
                      </Text>
                      {shift.notes ? (
                        <Text style={{ fontSize: 11, fontStyle: "italic", color: theme.colors.onSurfaceVariant }}>
                          "{shift.notes}"
                        </Text>
                      ) : null}
                    </View>

                    <Chip
                      compact
                      style={{
                        backgroundColor:
                          variance === 0
                            ? "#DCFCE7"
                            : variance > 0
                            ? "#FEF9C3"
                            : "#FEE2E2",
                      }}
                      textStyle={{
                        fontSize: 11,
                        fontWeight: "700",
                        color:
                          variance === 0
                            ? "#15803D"
                            : variance > 0
                            ? "#854D0E"
                            : "#DC2626",
                      }}
                    >
                      {variance === 0
                        ? "±₱0"
                        : variance > 0
                        ? `+${getCurrency(variance)}`
                        : `-${getCurrency(Math.abs(variance))}`}
                    </Chip>
                  </Surface>
                );
              })}
            </View>
          </View>
        ) : null}
      </Card.Content>

      <ShiftModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        language={language}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  activeBox: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  historyHeading: {
    fontSize: 13,
    fontWeight: "700",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});


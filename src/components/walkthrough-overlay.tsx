import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, ProgressBar, Surface, Text, useTheme } from "react-native-paper";

import { useStore } from "../context/store";
import { translate } from "../lib/i18n";

export type WalkthroughStep = {
  icon: string;
  title: string;
  targetHint: string;
  whatIsIt: string;
  howToDoIt: string;
  actionRoute?: Href;
  actionLabel?: string;
};

export const STEPS: WalkthroughStep[] = [
  {
    icon: "storefront-outline",
    title: "Your Live Store Command Center",
    targetHint: "Store Overview & Live KPIs",
    whatIsIt: "A real-time dashboard displaying total inventory, items in stock, low-stock warnings, and weekly sales activity at a glance.",
    howToDoIt: "Review the KPI cards at the top every morning. Tap low-stock alerts to reorder immediately before your shelves run empty.",
  },
  {
    icon: "cash-register",
    title: "Cash Register & Barcode POS",
    targetHint: "Fast Retail Checkout",
    whatIsIt: "High-speed point of sale designed for sari-sari stores and groceries. Supports barcode scanning, cash tender, GCash/Maya QR codes, split payments, and voiding.",
    howToDoIt: "1. Scan or tap items to build cart → 2. Tap Charge / Checkout → 3. Select Cash or E-Wallet QR and tender amount → 4. Print or share receipt!",
    actionRoute: "/pos",
    actionLabel: "Try POS Register",
  },
  {
    icon: "package-variant-closed",
    title: "Smart Shelf, FEFO Batches & Tingi",
    targetHint: "Inventory & Lot Tracking",
    whatIsIt: "Manage every product with FEFO expiry tracking (First Expired, First Out) and Tingi fractional selling (selling bulk boxes by individual stick or sachet).",
    howToDoIt: "Open any product in Inventory → Tap 'FEFO Batches' to add lot numbers and expiry dates, or tap 'Tingi Config' to set unit splitting and calculate extra profits.",
    actionRoute: "/(tabs)/inventory",
    actionLabel: "Explore Inventory",
  },
  {
    icon: "book-open-page-variant-outline",
    title: "Digital Lista & Customer Loyalty",
    targetHint: "Credit (Utang) & Rewards",
    whatIsIt: "A trustworthy digital ledger for customer credit (utang) balances, payment recording, and automatic ⭐ Loyalty Points cashback rewards.",
    howToDoIt: "Open Credit Tracker → Tap 'Record Utang' with items and due date. When customers shop, they earn loyalty points that convert into instant discounts at checkout!",
    actionRoute: "/utang",
    actionLabel: "Open Credit Tracker",
  },
  {
    icon: "cash-multiple",
    title: "Cash Drawer Shifts & Balancing",
    targetHint: "Register Accountability",
    whatIsIt: "End-of-day register reconciliation. Declare starting morning float cash and verify closing cash to prevent theft or cashier errors.",
    howToDoIt: "Go to Profile → Store tab → Tap 'Start Shift' with your starting fund (₱500). At closing, physically count your drawer cash to view the automatic variance calculation.",
    actionRoute: "/(tabs)/profile",
    actionLabel: "View Shift Settings",
  },
  {
    icon: "truck-delivery-outline",
    title: "Purchase Orders & Stock Inflow",
    targetHint: "Supplier Deliveries",
    whatIsIt: "Intake incoming distributor shipments (San Miguel, Coca-Cola, URC) and batch-update your stock in seconds.",
    howToDoIt: "Open Purchase Orders from the (+) Quick Menu → Enter supplier and invoice number → Search items, enter quantities and costs → Tap 'Confirm & Receive'.",
    actionRoute: "/purchase-order",
    actionLabel: "Open Purchase Orders",
  },
  {
    icon: "help-circle-outline",
    title: "24/7 User Manual & Guides",
    targetHint: "Guides & Tutorials",
    whatIsIt: "A complete offline-ready searchable user manual explaining every button, report, and calculation.",
    howToDoIt: "Tap the Help '?' icon in the dashboard header or replay this interactive walkthrough anytime from the Help screen!",
    actionRoute: "/help",
    actionLabel: "Open Help Manual",
  },
];

export const STORAGE_KEY = "hasSeenOnboarding";

export function WalkthroughOverlay() {
  const theme = useTheme();
  const router = useRouter();
  const { state } = useStore();
  const language = state.user.preferences?.language ?? "English";

  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((seen) => {
      if (isMounted && seen !== "true") {
        setVisible(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore storage error
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      void handleDismiss();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleAction = async (route?: Href) => {
    if (!route) return;
    await handleDismiss();
    router.push(route);
  };

  if (!visible) {
    return null;
  }

  const step = STEPS[currentStepIndex];
  const progress = (currentStepIndex + 1) / STEPS.length;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <Card style={[styles.dialogCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content style={styles.cardContent}>
            {/* Header progress info */}
            <View style={styles.topRow}>
              <View style={[styles.hintPill, { backgroundColor: `${theme.colors.primary}18` }]}>
                <Text style={[styles.hintPillText, { color: theme.colors.primary }]}>
                  {step.targetHint}
                </Text>
              </View>
              <Text style={[styles.stepCountText, { color: theme.colors.onSurfaceVariant }]}>
                {currentStepIndex + 1} of {STEPS.length}
              </Text>
            </View>

            <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* Step illustration icon */}
              <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.primary}18` }]}>
                <MaterialCommunityIcons name={step.icon as any} size={36} color={theme.colors.primary} />
              </View>

              {/* Title */}
              <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                {step.title}
              </Text>

              {/* What is it section */}
              <Surface style={[styles.infoBlock, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.sectionHeading, { color: theme.colors.primary }]}>
                  📌 What it is:
                </Text>
                <Text style={[styles.sectionBody, { color: theme.colors.onSurface }]}>
                  {step.whatIsIt}
                </Text>
              </Surface>

              {/* How to use it section */}
              <Surface style={[styles.infoBlock, { backgroundColor: theme.colors.surfaceVariant, marginTop: 8 }]}>
                <Text style={[styles.sectionHeading, { color: theme.colors.primary }]}>
                  🚀 How to do it:
                </Text>
                <Text style={[styles.sectionBody, { color: theme.colors.onSurface }]}>
                  {step.howToDoIt}
                </Text>
              </Surface>

              {/* Direct interactive "Try It Now" button */}
              {step.actionRoute && step.actionLabel ? (
                <Button
                  mode="contained-tonal"
                  icon="arrow-right-circle-outline"
                  onPress={() => handleAction(step.actionRoute)}
                  style={styles.actionJumpBtn}
                  textColor={theme.colors.primary}
                >
                  {step.actionLabel}
                </Button>
              ) : null}
            </ScrollView>

            <Divider style={{ marginVertical: 10 }} />

            {/* Actions row */}
            <View style={styles.actionsRow}>
              <Button
                mode="text"
                textColor={theme.colors.onSurfaceVariant}
                onPress={handleDismiss}
                style={styles.actionBtn}
              >
                {translate(language, "walkthroughSkip") || "Skip"}
              </Button>

              <View style={styles.navButtons}>
                {currentStepIndex > 0 ? (
                  <Button
                    mode="outlined"
                    onPress={handleBack}
                    style={styles.actionBtn}
                    textColor={theme.colors.onSurface}
                  >
                    {translate(language, "walkthroughBack") || "Back"}
                  </Button>
                ) : null}

                <Button
                  mode="contained"
                  buttonColor={theme.colors.primary}
                  textColor="#FFFFFF"
                  onPress={handleNext}
                  style={styles.actionBtn}
                >
                  {isLastStep
                    ? translate(language, "walkthroughGotIt") || "Got it!"
                    : translate(language, "walkthroughNext") || "Next"}
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 10,
  },
  cardContent: {
    padding: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hintPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stepCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  scrollArea: {
    maxHeight: 380,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  infoBlock: {
    padding: 12,
    borderRadius: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionJumpBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: {
    borderRadius: 10,
  },
  navButtons: {
    flexDirection: "row",
    gap: 8,
  },
});

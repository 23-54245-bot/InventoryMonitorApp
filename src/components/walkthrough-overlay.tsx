import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Button, Card, ProgressBar, Text, useTheme } from "react-native-paper";

type WalkthroughStep = {
  icon: string;
  title: string;
  description: string;
  targetHint: string;
};

const STEPS: WalkthroughStep[] = [
  {
    icon: "storefront-outline",
    title: "Welcome to StockTrack!",
    description: "Your simple, real-time inventory and point-of-sale companion. Let us show you around in 4 quick steps.",
    targetHint: "Store Overview",
  },
  {
    icon: "barcode-scan",
    title: "Fast Barcode Scanner",
    description: "Tap the barcode icon at the top to scan items with your phone or laptop camera for instant lookups.",
    targetHint: "Top Header Bar",
  },
  {
    icon: "plus-circle-outline",
    title: "Quick Action Hub (+)",
    description: "Tap the floating (+) button at the bottom right to quickly record deliveries, deduct damaged stock, or add products.",
    targetHint: "Bottom Right (+) Button",
  },
  {
    icon: "view-dashboard-outline",
    title: "Simple Navigation",
    description: "Use the bottom tab bar (or the left sidebar on desktop) to manage your inventory shelf, check low-stock alerts, and view reports.",
    targetHint: "Bottom Bar / Left Sidebar",
  },
  {
    icon: "help-circle-outline",
    title: "Guides Whenever You Need",
    description: "Tap the '?' icon at the top of your dashboard anytime to open plain step-by-step guides for all features.",
    targetHint: "Help & Tutorials",
  },
];

const STORAGE_KEY = "hasSeenOnboarding";

export function WalkthroughOverlay() {
  const theme = useTheme();
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
            {/* Header progress bar */}
            <View style={styles.topRow}>
              <View style={[styles.hintPill, { backgroundColor: `${theme.colors.primary}14` }]}>
                <Text style={[styles.hintPillText, { color: theme.colors.primary }]}>
                  {step.targetHint}
                </Text>
              </View>
              <Text style={[styles.stepCountText, { color: theme.colors.onSurfaceVariant }]}>
                {currentStepIndex + 1} of {STEPS.length}
              </Text>
            </View>

            <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />

            {/* Step illustration icon */}
            <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.primary}14` }]}>
              <MaterialCommunityIcons name={step.icon as any} size={42} color={theme.colors.primary} />
            </View>

            {/* Title & conversational description */}
            <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
              {step.title}
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
              {step.description}
            </Text>

            {/* Actions row */}
            <View style={styles.actionsRow}>
              <Button
                mode="text"
                textColor={theme.colors.onSurfaceVariant}
                onPress={handleDismiss}
                style={styles.actionBtn}
              >
                Skip
              </Button>

              <View style={styles.navButtons}>
                {currentStepIndex > 0 ? (
                  <Button
                    mode="outlined"
                    onPress={handleBack}
                    style={styles.actionBtn}
                    textColor={theme.colors.onSurface}
                  >
                    Back
                  </Button>
                ) : null}

                <Button
                  mode="contained"
                  buttonColor={theme.colors.primary}
                  onPress={handleNext}
                  style={styles.actionBtn}
                >
                  {isLastStep ? "Got it!" : "Next"}
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
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    maxWidth: 440,
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  cardContent: {
    padding: 24,
    alignItems: "center",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  hintPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hintPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stepCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
  },
});

import { StyleSheet, View } from "react-native";
import { Button, Card, Chip, ProgressBar, Surface, Text } from "react-native-paper";

import { getCurrency, type Customer } from "../../data/freshmart";
import { type AppLanguage } from "../../lib/i18n";

export interface LoyaltyCardProps {
  customer: Customer;
  language?: AppLanguage;
  onRedeem?: (points: number) => void;
  compact?: boolean;
}

export function LoyaltyCard({
  customer,
  language = "English",
  onRedeem,
  compact = false,
}: LoyaltyCardProps) {
  const points = customer.loyaltyPoints ?? 0;
  const progressToReward = (points % 100) / 100;
  const pointsToNextReward = 100 - (points % 100);

  if (compact) {
    return (
      <Surface style={[styles.compactContainer, { backgroundColor: "#FEF9C3", borderColor: "#FDE047" }]}>
        <View style={styles.compactRow}>
          <Text style={styles.compactStar}>⭐</Text>
          <Text style={styles.compactPoints}>{points} pts</Text>
          <Text style={styles.compactValue}>({getCurrency(points)} discount)</Text>
        </View>
      </Surface>
    );
  }

  return (
    <Card style={[styles.card, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Surface style={styles.iconBadge}>
              <Text style={{ fontSize: 18 }}>⭐</Text>
            </Surface>
            <View>
              <Text style={styles.title}>Loyalty & Rewards</Text>
              <Text style={styles.customerName}>{customer.name}</Text>
            </View>
          </View>
          <Chip
            compact
            style={{ backgroundColor: "#FDE68A" }}
            textStyle={{ color: "#92400E", fontWeight: "800", fontSize: 13 }}
          >
            {points} PTS
          </Chip>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              {pointsToNextReward} pts to next reward tier
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(progressToReward * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={progressToReward}
            color="#D97706"
            style={styles.progressBar}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.worthText}>
            Cashback value: <Text style={{ fontWeight: "700" }}>{getCurrency(points)}</Text>
          </Text>

          {onRedeem && points > 0 ? (
            <Button
              mode="contained"
              compact
              buttonColor="#D97706"
              textColor="#FFFFFF"
              onPress={() => onRedeem(points)}
            >
              Redeem
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    marginVertical: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  customerName: {
    fontSize: 12,
    color: "#B45309",
  },
  progressSection: {
    marginVertical: 10,
    gap: 4,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 11,
    color: "#92400E",
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FDE68A",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  worthText: {
    fontSize: 12,
    color: "#92400E",
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactStar: {
    fontSize: 12,
  },
  compactPoints: {
    fontSize: 11,
    fontWeight: "700",
    color: "#854D0E",
  },
  compactValue: {
    fontSize: 10,
    color: "#A16207",
  },
});

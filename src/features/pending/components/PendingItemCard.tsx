import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import React, { memo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInDown,
  FadeOutRight,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { COLORS } from "../../../theme/colors";
import { Category, Transaction } from "../../../types";
import { getIcon } from "../../categories/iconMap";

interface PendingItemCardProps {
  transaction: Transaction;
  category?: Category;
  onSettle: (id: string) => void;
  onPress: (id: string) => void;
  index: number;
}

function SettleAction({
  drag,
  accent,
  onPress,
}: {
  drag: SharedValue<number>;
  accent: string;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 100 }],
  }));

  return (
    <RectButton style={styles.settleAction} onPress={onPress}>
      <Animated.View style={[styles.settleInner, style]}>
        <Check size={18} color={accent} />
        <Text style={[styles.settleText, { color: accent }]}>Settle</Text>
      </Animated.View>
    </RectButton>
  );
}

export const PendingItemCard = memo(function PendingItemCard({
  transaction,
  category,
  onSettle,
  onPress,
  index,
}: PendingItemCardProps) {
  const Icon = getIcon(category?.icon);
  const isReceive = transaction.status === "pending-receive";
  const accent = isReceive ? COLORS.success : COLORS.danger;

  const handleSettle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSettle(transaction.id);
  }, [transaction.id, onSettle]);

  const handlePress = useCallback(
    () => onPress(transaction.id),
    [transaction.id, onPress],
  );

  const primaryText =
    transaction.title ||
    transaction.note ||
    transaction.categoryName ||
    "Unnamed";

  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      _swipeable: SwipeableMethods,
    ) => <SettleAction drag={drag} accent={accent} onPress={handleSettle} />,
    [accent, handleSettle],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).springify()}
      exiting={FadeOutRight.duration(200)}
    >
      <ReanimatedSwipeable
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        enableTrackpadTwoFingerGesture
        containerStyle={styles.container}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isReceive ? COLORS.successBg : COLORS.dangerBg,
              },
            ]}
          >
            <Icon size={18} color={accent} />
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {primaryText}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {format(transaction.date, "EEE, d MMM")}
              {transaction.withPerson ? ` · ${transaction.withPerson}` : ""}
            </Text>
          </View>

          <Text style={[styles.amount, { color: accent }]}>
            ₹{transaction.amount.toLocaleString("en-IN")}
          </Text>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  settleAction: {
    width: 100,
    justifyContent: "center",
    alignItems: "flex-end",
    overflow: "hidden",
  },
  settleInner: {
    width: 90,
    borderRadius: 14,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.card,
  },
  settleText: {
    // color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
  },
});

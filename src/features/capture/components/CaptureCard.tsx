import { Check, MessageSquare, ClipboardList, X } from "lucide-react-native";
import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight } from "react-native-reanimated";
import { getIcon } from "../../categories/iconMap";
import { COLORS } from "../../../theme/colors";
import { CapturedTransaction } from "../../../types";
import { useStore } from "../../../store/useStore";

interface CaptureCardProps {
  item: CapturedTransaction;
  onAccept: (item: CapturedTransaction) => void;
  onDismiss: (id: string) => void;
  onEdit: (item: CapturedTransaction) => void;
  index: number;
}

const SOURCE_ICON = {
  sms: MessageSquare,
  clipboard: ClipboardList,
};

export const CaptureCard = React.memo(function CaptureCard({
  item,
  onAccept,
  onDismiss,
  onEdit,
  index,
}: CaptureCardProps) {
  const categories = useStore((s) => s.categories);
  const cat = categories.find((c) => c.id === item.categoryId);
  const IconComponent = getIcon(cat?.icon);
  const isIncome = item.type === "income";
  const SourceIcon = SOURCE_ICON[item.source];

  const confidencePct = Math.round(item.confidence * 100);
  const isHighConfidence = item.confidence >= 0.9;

  const handleAccept = useCallback(() => onAccept(item), [item, onAccept]);
  const handleDismiss = useCallback(() => onDismiss(item.id), [item.id, onDismiss]);
  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      exiting={FadeOutRight.duration(250)}
      style={styles.card}
    >
      {/* Source badge */}
      <View style={styles.topRow}>
        <View style={styles.sourceBadge}>
          <SourceIcon size={11} color={COLORS.muted} />
          <Text style={styles.sourceText}>{item.source.toUpperCase()}</Text>
          {item.bank ? (
            <Text style={styles.bankText}> · {item.bank}</Text>
          ) : null}
        </View>
        <View
          style={[
            styles.confidenceBadge,
            { backgroundColor: isHighConfidence ? COLORS.successBg : COLORS.active },
          ]}
        >
          <Text
            style={[
              styles.confidenceText,
              { color: isHighConfidence ? COLORS.success : COLORS.muted },
            ]}
          >
            {confidencePct}%
          </Text>
        </View>
      </View>

      {/* Main content */}
      <TouchableOpacity style={styles.body} onPress={handleEdit} activeOpacity={0.7}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: isIncome ? COLORS.successBg : COLORS.active },
          ]}
        >
          <IconComponent
            size={22}
            color={isIncome ? COLORS.success : COLORS.text}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.categoryName ?? "Uncategorized"}
          </Text>
          {item.note ? (
            <Text style={styles.note} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>

        <Text
          style={[
            styles.amount,
            { color: isIncome ? COLORS.success : COLORS.text },
          ]}
        >
          {isIncome ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <X size={16} color={COLORS.muted} />
          <Text style={styles.dismissText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
          <Check size={16} color={COLORS.background} />
          <Text style={styles.acceptText}>Add</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  bankText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  note: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "500",
  },
  amount: {
    fontSize: 18,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  dismissBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.active,
  },
  dismissText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.text,
  },
  acceptText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: "700",
  },
});

import { TransactionRow } from "@/src/components/TransactionRow";
import { Sparkles } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../theme/colors";
import { Category } from "../../../types";
import { parseSmartInput } from "../../../utils/smartInput";

interface EGBlockProps {
  inputText: string;
  categories: Category[];
  transactions: any[];
}

/**
 * Renders an Example or Preview block for Smart Input.
 * It provides a live preview of how the transaction string will be parsed.
 */
export const EGBlock: React.FC<EGBlockProps> = ({
  inputText,
  categories,
  transactions,
}) => {
  const isTyping = inputText.trim().length > 0;
  const textToParse = isTyping ? inputText : "200 pizza with john";
  const parsed = parseSmartInput(textToParse, categories, transactions);

  const amount = parsed.amount || (isTyping ? 0 : 200);
  const type = parsed.type || "expense";
  const note = parsed.note || (isTyping ? "" : "pizza with john");
  const suggestedCat = parsed.suggestedCategory;

  const categoryName =
    suggestedCat?.name || (isTyping ? "Uncategorized" : "Food");
  const categoryIcon =
    suggestedCat?.icon || (isTyping ? "circle-dot" : "pizza");

  return (
    <View style={styles.smartInputContainer}>
      <View style={styles.smartInputTip}>
        <Sparkles size={16} color={COLORS.muted} style={styles.tipIcon} />
        <Text style={styles.tipText}>
          <Text style={{ color: COLORS.text, fontWeight: "600" }}>
            Smart Input:{"  "}
          </Text>
          <Text style={{ fontStyle: "italic", color: COLORS.text }}>
            {isTyping
              ? `Input : "${inputText}"`
              : `Example : "200 pizza with john"`}
          </Text>
        </Text>
      </View>
      <View style={styles.previewWrapper}>
        <Text style={styles.previewLabel}>List Preview</Text>
        <View pointerEvents="none" style={styles.previewRowBox}>
          <TransactionRow
            transaction={
              {
                id: "preview",
                amount: amount,
                type: type,
                categoryId: suggestedCat?.id || "preview-cat",
                categoryName: categoryName,
                note: note,
                date: Date.now(),
              } as any
            }
            category={
              suggestedCat || {
                id: "preview-cat",
                name: categoryName,
                icon: categoryIcon,
                type: type as any,
                createdAt: Date.now(),
              }
            }
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  smartInputContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 24,
    overflow: "hidden",
  },
  smartInputTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  previewWrapper: {
    backgroundColor: COLORS.background,
    paddingBottom: 4,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  previewRowBox: {
    marginTop: -4,
  },
  tipIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
});

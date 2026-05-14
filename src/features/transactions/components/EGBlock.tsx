import { TransactionRow } from "@/src/components/TransactionRow";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
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
    <Animated.View
      style={styles.smartInputContainer}
      layout={LinearTransition.springify()}
    >
      <Text style={styles.previewLabel}>List Preview</Text>
      <View pointerEvents="none">
        <TransactionRow
          renderData={{
            primaryText: categoryName,
            secondaryText: note,
            displayAmount: `${type === "income" ? "+" : "-"}₹${amount.toLocaleString("en-IN")}`,
            displayTime: "Just now",
            isIncome: type === "income",
            icon: categoryIcon,
            amountColor: type === "income" ? COLORS.success : COLORS.text,
            iconBg: type === "income" ? COLORS.successBg : COLORS.active,
            iconColor: type === "income" ? COLORS.success : COLORS.text,
          }}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  smartInputContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

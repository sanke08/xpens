import { TransactionRow } from "@/src/components/TransactionRow";
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
      <Text style={styles.previewLabel}>List Preview</Text>
      <View pointerEvents="none">
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
  );
};

const styles = StyleSheet.create({
  smartInputContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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

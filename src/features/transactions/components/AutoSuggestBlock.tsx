import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../theme/colors";
import { Category } from "../../../types";
import { keywordMap } from "../../categories/categoryKeywords";

interface AutoSuggestBlockProps {
  inputText: string;
  categories: Category[];
  onSelectCategory: (cat: Category, wordOverride?: string) => void;
  onOpenCreateModal: (name: string) => void;
}

/**
 * Component to auto-suggest categories based on live user input.
 * Helps rapidly categorize transactions during the smart input stage.
 */
export const AutoSuggestBlock: React.FC<AutoSuggestBlockProps> = ({
  inputText,
  categories,
  onSelectCategory,
  onOpenCreateModal,
}) => {
  const isTyping = inputText.trim().length > 0;
  if (!isTyping) return null;

  const numberMatch = inputText.match(/\d+(\.\d+)?/);
  const noteContent = inputText
    .replace(numberMatch ? numberMatch[0] : "", "")
    .trim()
    .toLowerCase();

  if (!noteContent) return null;

  const words = noteContent.split(" ").filter((w) => w.length > 1);
  const searchWord = words[0] || noteContent;

  const matchedCats: Category[] = [];
  let exactMatch = false;

  const catById = new Map<string, Category>();
  const catByName = new Map<string, Category>();

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    catById.set(c.id, c);

    const lowerName = c.name.toLowerCase();
    catByName.set(lowerName, c);

    if (lowerName.includes(searchWord)) {
      matchedCats.push(c);
      if (lowerName === searchWord) exactMatch = true;
    }
  }

  const keywordMatches: { keyword: string; cat: Category }[] = [];
  let hasExactKeywordMatch = false;

  for (const [k, catId] of keywordMap) {
    if (k.startsWith(searchWord)) {
      const resolvedCat = catById.get(catId) || catByName.get(catId);
      if (resolvedCat) {
        keywordMatches.push({ keyword: k, cat: resolvedCat });
        if (k === searchWord) hasExactKeywordMatch = true;

        if (!matchedCats.some((c) => c.id === resolvedCat.id)) {
          matchedCats.push(resolvedCat);
        }
      }
    }
  }

  return (
    <View style={styles.suggestContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {keywordMatches.map(({ keyword, cat }) => (
          <TouchableOpacity
            key={`kw-${keyword}`}
            style={[styles.catChip, { borderColor: COLORS.text }]}
            onPress={() => onSelectCategory(cat, keyword)}
          >
            <Text style={[styles.catText, { color: COLORS.text }]}>
              {keyword}
            </Text>
          </TouchableOpacity>
        ))}
        {matchedCats.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.catChip}
            onPress={() => onSelectCategory(c)}
          >
            <Text style={styles.catText}>{c.name}</Text>
          </TouchableOpacity>
        ))}
        {!exactMatch && !hasExactKeywordMatch && (
          <TouchableOpacity
            style={[
              styles.catChip,
              {
                backgroundColor: COLORS.active,
                borderColor: COLORS.text,
                borderStyle: "dashed",
              },
            ]}
            onPress={() => onOpenCreateModal(searchWord)}
          >
            <Text style={[styles.catText, { color: COLORS.text }]}>
              + Create "{searchWord}"
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  suggestContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.active,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.lightGray,
  },
});

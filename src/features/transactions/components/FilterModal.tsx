import { Filter, RotateCcw, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../theme/colors";
import { Category, TransactionStatus } from "../../../types";
import { getIcon } from "../../categories/iconMap";

export interface FilterState {
  status: TransactionStatus | "all";
  categoryIds: string[];
  dateRange: "all" | "today" | "week" | "month";
  sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  categories: Category[];
  initialFilters: FilterState;
}

export function FilterModal({
  visible,
  onClose,
  onApply,
  categories,
  initialFilters,
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);

  const toggleCategory = (id: string) => {
    setTempFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((cid) => cid !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const handleReset = () => {
    setTempFilters({
      status: "all",
      categoryIds: [],
      dateRange: "all",
      sortBy: "date-desc",
    });
  };

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const renderSectionHeader = (title: string, onReset?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onReset && (
        <TouchableOpacity onPress={onReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify()}
          exiting={SlideOutDown.springify()}
          style={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.titleContainer}>
                <Filter size={20} color={COLORS.text} />
                <Text style={styles.title}>Advanced Filters</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Status Section */}
            {renderSectionHeader("Status")}
            <View style={styles.chipGrid}>
              {(
                [
                  { key: "all", label: "All" },
                  { key: "final", label: "Final" },
                  { key: "pending-receive", label: "Reimbursable" },
                  { key: "pending-pay", label: "I owe" },
                ] as const
              ).map((item) => {
                const isActive = tempFilters.status === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() =>
                      setTempFilters((p) => ({ ...p, status: item.key }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Range Section */}
            {renderSectionHeader("Date Range")}
            <View style={styles.chipGrid}>
              {(
                [
                  { key: "all", label: "All Time" },
                  { key: "today", label: "Today" },
                  { key: "week", label: "This Week" },
                  { key: "month", label: "This Month" },
                ] as const
              ).map((item) => {
                const isActive = tempFilters.dateRange === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() =>
                      setTempFilters((p) => ({ ...p, dateRange: item.key }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sorting Section */}
            {renderSectionHeader("Sort By")}
            <View style={styles.chipGrid}>
              {(
                [
                  { key: "date-desc", label: "Newest First" },
                  { key: "date-asc", label: "Oldest First" },
                  { key: "amount-desc", label: "Highest Amount" },
                  { key: "amount-asc", label: "Lowest Amount" },
                ] as const
              ).map((item) => {
                const isActive = tempFilters.sortBy === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() =>
                      setTempFilters((p) => ({ ...p, sortBy: item.key }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Categories Section */}
            {renderSectionHeader("Categories", () =>
              setTempFilters((p) => ({ ...p, categoryIds: [] })),
            )}
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isActive = tempFilters.categoryIds.includes(cat.id);
                const IconComp = getIcon(cat.icon);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <View
                      style={[
                        styles.catIconContainer,
                        isActive && styles.catIconContainerActive,
                      ]}
                    >
                      <IconComp
                        size={14}
                        color={isActive ? COLORS.background : COLORS.muted}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RotateCcw size={18} color={COLORS.muted} />
              <Text style={styles.resetBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  content: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 0,
  },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resetText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: "500",
  },
  chipTextActive: {
    color: COLORS.background,
    fontWeight: "700",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.active,
    borderColor: COLORS.text,
  },
  catIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconContainerActive: {
    backgroundColor: COLORS.text,
  },
  categoryText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: COLORS.text,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.muted,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
  },
});

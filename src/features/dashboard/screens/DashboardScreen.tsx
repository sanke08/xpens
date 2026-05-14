import { useRouter } from "expo-router";
import {
  ChevronRight,
  Clock,
  Inbox,
  Plus,
  RefreshCcw,
  Settings,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Category } from "@/src/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AutoSafeBanner } from "../../../components/AutoSafeBanner";
import { BalanceCard } from "../../../components/BalanceCard";
import { CategorySummaryRow } from "../../../components/CategorySummaryRow";
import { useCaptureStore } from "../../../store/captureStore";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";

export default function DashboardScreen() {
  const router = useRouter();
  const categories = useStore((state) => state.categories);
  const categoryMetrics = useStore((state) => state.categoryMetrics);
  const financialSummary = useStore((state) => state.financialSummary);

  const pendingCaptures = useCaptureStore((s) => s.pending);
  const { bottom } = useSafeAreaInsets();

  const pendingSummary = useMemo(
    () => ({
      receive: financialSummary.pendingReceive,
      pay: financialSummary.pendingPay,
      count: financialSummary.pendingCount,
    }),
    [financialSummary],
  );

  const categorySummaries = useMemo(() => {
    return categoryMetrics
      .map((m) => ({
        category: categories.find((c) => c.id === m.categoryId)!,
        totalAmount: m.totalAmount,
        count: m.count,
        latest: m.latest,
      }))
      .filter((item) => item.category)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [categories, categoryMetrics]);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: {
        category: Category;
        totalAmount: number;
        count: number;
        latest: number;
      };
      index: number;
    }) => (
      <CategorySummaryRow
        index={index}
        category={item.category}
        totalAmount={item.totalAmount}
        transactionCount={item.count}
        latestTransactionDate={item.latest > 0 ? item.latest : undefined}
        onPress={() => router.push(`/category/${item.category.id}` as any)}
      />
    ),
    [router],
  );

  const ListHeader = useMemo(
    () => (
      <View style={{ gap: 24 }}>
        <AutoSafeBanner />
        <BalanceCard
          totalIncome={financialSummary.income}
          totalExpense={financialSummary.expense}
          todayBalance={financialSummary.today}
        />

        {pendingSummary.count > 0 && (
          <TouchableOpacity
            style={styles.pendingLine}
            onPress={() => router.push("/pending" as any)}
            activeOpacity={0.7}
          >
            <Clock size={14} color={COLORS.muted} />
            <Text style={styles.pendingLineText}>
              {pendingSummary.receive > 0 && (
                <Text>
                  ₹{pendingSummary.receive.toLocaleString("en-IN")}{" "}
                  <Text style={{ color: COLORS.muted }}>to receive</Text>
                </Text>
              )}
              {pendingSummary.receive > 0 && pendingSummary.pay > 0 && (
                <Text style={{ color: COLORS.muted }}> · </Text>
              )}
              {pendingSummary.pay > 0 && (
                <Text>
                  ₹{pendingSummary.pay.toLocaleString("en-IN")}{" "}
                  <Text style={{ color: COLORS.muted }}>to pay</Text>
                </Text>
              )}
            </Text>
            <ChevronRight size={14} color={COLORS.muted} />
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity
            onPress={() => router.push("/categories")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={styles.viewAllBtn}>Manage</Text>
            <ChevronRight size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [financialSummary, pendingSummary, router],
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={categorySummaries}
        keyExtractor={(item) => item.category.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySub}>Start logging your first record</Text>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Animated.View
        entering={FadeInDown.delay(500).springify()}
        style={[styles.bottomBar, { bottom: bottom + 20 }]}
      >
        <TouchableOpacity
          onPress={() => router.push("/recurring" as any)}
          style={styles.iconActionBtn}
        >
          <RefreshCcw size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainAddBtn}
          activeOpacity={0.8}
          onPress={() => router.push("/transaction")}
        >
          <Plus size={20} color={COLORS.background} />
          <Text style={styles.mainAddText}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/inbox" as any)}
          style={styles.iconActionBtn}
        >
          <Inbox
            size={24}
            color={pendingCaptures.length > 0 ? COLORS.success : COLORS.text}
          />
          {pendingCaptures.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {pendingCaptures.length > 9 ? "9+" : pendingCaptures.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.iconActionBtn}
        >
          <Settings size={24} color={COLORS.text} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
    gap: 16,
  },
  pendingLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingLineText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.background,
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "absolute",
    backgroundColor: COLORS.background,
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.active,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  mainAddBtn: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mainAddText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
});

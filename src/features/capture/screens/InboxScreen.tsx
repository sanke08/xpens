import { useRouter } from "expo-router";
import { CheckCheck, Inbox } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaptureCard } from "../components/CaptureCard";
import { useCaptureStore } from "../../../store/captureStore";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { CapturedTransaction } from "../../../types";

export default function InboxScreen() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const pending = useCaptureStore((s) => s.pending);
  const accept = useCaptureStore((s) => s.accept);
  const acceptAll = useCaptureStore((s) => s.acceptAll);
  const dismiss = useCaptureStore((s) => s.dismiss);
  const createTransaction = useStore((s) => s.createTransaction);
  const bulkCreateTransactions = useStore((s) => s.bulkCreateTransactions);

  const handleAccept = useCallback(
    (item: CapturedTransaction) => {
      accept(item.id);
      createTransaction({
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        title: null,
        note: item.note,
        location: null,
        withPerson: null,
        date: item.date,
        status: "final",
        settledAt: item.date,
      });
    },
    [accept, createTransaction],
  );

  const handleAcceptAll = useCallback(() => {
    const items = acceptAll();
    bulkCreateTransactions(
      items.map((item) => ({
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        title: null,
        note: item.note,
        location: null,
        withPerson: null,
        date: item.date,
        status: "final",
        settledAt: item.date,
      })),
    );
  }, [acceptAll, bulkCreateTransactions]);

  const handleEdit = useCallback(
    (item: CapturedTransaction) => {
      // Pre-fill the transaction form and navigate to it
      // The transaction screen will open in edit mode; we pass amount+note as query params
      const note = item.note ?? "";
      const inputText = `${item.amount} ${note}`.trim();
      router.push({
        pathname: "/transaction",
        params: {
          captureId: item.id,
          prefill: inputText,
          prefillCategoryId: item.categoryId ?? "",
          prefillType: item.type,
        },
      } as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CapturedTransaction; index: number }) => (
      <CaptureCard
        item={item}
        onAccept={handleAccept}
        onDismiss={dismiss}
        onEdit={handleEdit}
        index={index}
      />
    ),
    [handleAccept, dismiss, handleEdit],
  );

  const keyExtractor = useCallback((item: CapturedTransaction) => item.id, []);

  return (
    <View style={{ flex: 1 }}>
      {pending.length === 0 ? (
        <View style={styles.empty}>
          <Inbox size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySub}>
            Transactions from SMS and clipboard will appear here
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pending}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
          />

          <View style={[styles.bottomBar, { bottom: bottom + 16 }]}>
            <TouchableOpacity
              style={styles.acceptAllBtn}
              onPress={handleAcceptAll}
              activeOpacity={0.8}
            >
              <CheckCheck size={18} color={COLORS.background} />
              <Text style={styles.acceptAllText}>
                Accept All ({pending.length})
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  acceptAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.text,
  },
  acceptAllText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
});

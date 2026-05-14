import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Sunrise,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import {
  Category,
  RecurrenceInterval,
  Transaction,
  TransactionStatus,
} from "../../../types";
import { parseSmartInput } from "../../../utils/smartInput";
import { AVAILABLE_ICONS, getIcon } from "../../categories/iconMap";

// Extracted components
import { KeyboardAwareView } from "@/src/components/keyboard/KeyboardAwareView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AutoSuggestBlock } from "../components/AutoSuggestBlock";
import { EGBlock } from "../components/EGBlock";

/**
 * TransactionScreen serves as the primary interface for adding or editing transactions.
 * It features a "Smart Input" system that parses natural language for rapid entry.
 */
export default function TransactionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const createTransaction = useStore((state) => state.createTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);
  const createRecurringTransaction = useStore(
    (state) => state.createRecurringTransaction,
  );
  const categories = useStore((state) => state.categories);
  const createCategory = useStore((state) => state.createCategory);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const fetchTransactionById = useStore((state) => state.fetchTransactionById);
  const queryTransactions = useStore((state) => state.queryTransactions);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );

  const [existingTx, setExistingTx] = useState<Transaction | null>(null);
  const [inputText, setInputText] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);

  // Optional fields
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [withPerson, setWithPerson] = useState("");

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [interval, setInterval] = useState<RecurrenceInterval>("monthly");

  // Pending money state
  const [status, setStatus] = useState<TransactionStatus>("final");

  const [hasInit, setHasInit] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  // Category Modal State
  const [createCatModalVisible, setCreateCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("folder");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    createCategory({
      name: newCatName.trim(),
      icon: newCatIcon,
      type: newCatType,
    });
    setCreateCatModalVisible(false);
  };

  useEffect(() => {
    if (id && typeof id === "string") {
      fetchTransactionById(id).then((tx) => {
        if (tx) {
          setExistingTx(tx);
          setInputText(tx.amount.toString() + (tx.note ? ` ${tx.note}` : ""));
          setType(tx.type);
          setNote(tx.note || "");
          setTitle(tx.title || "");
          setLocation(tx.location || "");
          setWithPerson(tx.withPerson || "");
          const cat = categories.find((c) => c.id === tx.categoryId);
          if (cat) setSelectedCategory(cat);
          if (tx.title || tx.location || tx.withPerson) setShowDetails(true);
          setStatus(tx.status ?? "final");
        }
      });
    } else {
      const defaultExp = categories.find((c) => c.type === "expense");
      if (defaultExp) setSelectedCategory(defaultExp);
    }

    // Fetch recent transactions for smart suggestions
    queryTransactions({ page: 1, sortBy: "date-desc" }).then((res) => {
      setRecentTransactions(res.data);
    });

    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
    setHasInit(true);
  }, [id, categories, fetchTransactionById, queryTransactions]);

  // Handle smart input
  useEffect(() => {
    if (!hasInit) return;
    if (existingTx && !inputText.includes(" ")) return;

    // Use a subset of recent transactions for adaptive learning
    // This allows the app to learn from the user's past behavior (e.g., if they tag a specific store)
    const res = parseSmartInput(inputText, categories, recentTransactions);

    if (res.amount !== null) {
      // Only auto-suggest if the user hasn't manually changed the category in this session
      // or if they are just starting a new entry.
      if (res.suggestedCategory && !showDetails) {
        setSelectedCategory(res.suggestedCategory);
      }
      if (res.type && !showDetails) {
        setType(res.type);
      }
      if (!showDetails) {
        setNote(res.note || "");
      }
    }
  }, [
    inputText,
    categories,
    showDetails,
    hasInit,
    existingTx,
    recentTransactions,
  ]);

  const handleSave = () => {
    const res = parseSmartInput(inputText, categories, []);
    let amount = res.amount || 0;
    if (amount <= 0 && existingTx) amount = existingTx.amount;
    if (amount <= 0) return;

    const payload = {
      amount: amount,
      type: type,
      categoryId: selectedCategory?.id || null,
      categoryName: selectedCategory?.name || null,
      title: title || null,
      note: res.note || note || null,
      location: location || null,
      withPerson: withPerson || null,
      status: status,
      settledAt: existingTx?.settledAt ?? null,
    };

    if (isRecurring) {
      // If automate is on, we create a recurring transaction.
      // If we were editing a single tx, we could either convert it or keep it separate.
      // Standard behavior: create the recurring schedule.
      createRecurringTransaction({
        ...payload,
        interval: interval,
        startDate: Date.now(),
      });
      // Optionally delete the existing single tx if we are converting
      if (existingTx) {
        deleteTransaction(existingTx.id);
      }
    } else if (existingTx) {
      updateTransaction(existingTx.id, payload);
    } else {
      createTransaction({
        ...payload,
        date: Date.now(),
      });
    }

    Keyboard.dismiss();
    router.back();
  };

  const isIncome = type === "income";

  return (
    <View style={styles.container}>
      <KeyboardAwareView style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollArea]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {existingTx ? "Edit Transaction" : "Add Transaction"}
            </Text>
          </View>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isIncome && styles.expenseBtnActive]}
              onPress={() => setType("expense")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  !isIncome && { color: COLORS.danger },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, isIncome && styles.incomeBtnActive]}
              onPress={() => setType("income")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  isIncome && { color: COLORS.success },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            ref={textInputRef}
            style={[
              styles.smartInput,
              { color: isIncome ? COLORS.success : COLORS.danger },
            ]}
            placeholder="0.00 or e.g. '200 pizza'"
            placeholderTextColor={COLORS.placeholder}
            value={inputText}
            onChangeText={setInputText}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            multiline
          />

          {/* Action pills — tap to cycle Status / Repeat. */}
          <View style={styles.pillsRow}>
            {(() => {
              const states = [
                {
                  key: "final",
                  label: "Final",
                  Icon: Check,
                  bg: COLORS.active,
                  fg: COLORS.muted,
                },
                {
                  key: "pending-receive",
                  label: "Reimbursable",
                  Icon: ArrowDownLeft,
                  bg: COLORS.successBg,
                  fg: COLORS.success,
                },
                {
                  key: "pending-pay",
                  label: "I owe",
                  Icon: ArrowUpRight,
                  bg: COLORS.dangerBg,
                  fg: COLORS.danger,
                },
              ] as const;
              const idx = states.findIndex((s) => s.key === status);
              const meta = states[idx];
              const StatusIcon = meta.Icon;
              return (
                <View style={styles.pillWrapper}>
                  <Text style={styles.pillLabel}>Status</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.summaryPill,
                      {
                        backgroundColor: meta.bg,
                        borderColor: meta.fg + "40",
                        overflow: "hidden",
                      },
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setStatus(states[(idx + 1) % states.length].key);
                    }}
                  >
                    <StatusIcon size={13} color={meta.fg} />
                    <Animated.Text
                      key={meta.key}
                      entering={FadeInDown}
                      exiting={FadeOutUp}
                      style={[styles.summaryPillText, { color: meta.fg }]}
                    >
                      {meta.label}
                    </Animated.Text>
                    <View style={styles.pillDots}>
                      {states.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.pillDot,
                            {
                              backgroundColor:
                                i === idx ? meta.fg : meta.fg + "30",
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {(() => {
              const states = [
                {
                  key: "once",
                  label: "One-time",
                  Icon: Circle,
                  bg: COLORS.active,
                  fg: COLORS.muted,
                },
                {
                  key: "daily",
                  label: "Daily",
                  Icon: Sunrise,
                  bg: COLORS.amberBg,
                  fg: COLORS.amber,
                },
                {
                  key: "weekly",
                  label: "Weekly",
                  Icon: CalendarDays,
                  bg: COLORS.blueBg,
                  fg: COLORS.blue,
                },
                {
                  key: "monthly",
                  label: "Monthly",
                  Icon: CalendarRange,
                  bg: COLORS.purpleBg,
                  fg: COLORS.purple,
                },
              ] as const;
              const currentKey = !isRecurring ? "once" : interval;
              const idx = states.findIndex((s) => s.key === currentKey);
              const meta = states[idx];
              const RepeatIcon = meta.Icon;
              return (
                <View style={styles.pillWrapper}>
                  <Text style={styles.pillLabel}>Repeat</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.summaryPill,
                      {
                        backgroundColor: meta.bg,
                        borderColor: meta.fg + "40",
                        overflow: "hidden",
                      },
                    ]}
                    onPress={() => {
                      Keyboard.dismiss();
                      const next = states[(idx + 1) % states.length];
                      if (next.key === "once") {
                        setIsRecurring(false);
                      } else {
                        setIsRecurring(true);
                        setInterval(next.key as RecurrenceInterval);
                      }
                    }}
                  >
                    <RepeatIcon size={13} color={meta.fg} />
                    <Animated.Text
                      key={meta.key}
                      entering={FadeInDown}
                      exiting={FadeOutUp}
                      style={[styles.summaryPillText, { color: meta.fg }]}
                    >
                      {meta.label}
                    </Animated.Text>
                    <View style={styles.pillDots}>
                      {states.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.pillDot,
                            {
                              backgroundColor:
                                i === idx ? meta.fg : meta.fg + "30",
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>

          <Animated.View
            style={styles.hintArea}
            layout={LinearTransition.springify()}
          >
            <View />
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setShowDetails((p) => !p);
              }}
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>
                {showDetails ? "Hide" : "More"} Options
              </Text>
              {showDetails ? (
                <ChevronUp size={16} color={COLORS.muted} />
              ) : (
                <ChevronDown size={16} color={COLORS.muted} />
              )}
            </TouchableOpacity>
          </Animated.View>

          {showDetails && (
            <Animated.View
              entering={FadeInUp}
              exiting={FadeOutUp}
              layout={LinearTransition.springify()}
              style={styles.detailsArea}
            >
              {/* ── Group: Details ── */}
              <Text style={styles.groupLabel}>Details</Text>

              <View style={styles.catsList}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {categories.map((c) => {
                    const isActive = selectedCategory?.id === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.catChip,
                          isActive && styles.catChipActive,
                        ]}
                        onPress={() => {
                          setSelectedCategory(c);
                          setType(c.type as any);
                        }}
                      >
                        <Text
                          style={[
                            styles.catText,
                            isActive && styles.catTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <TextInput
                style={styles.fieldInput}
                placeholder="Title (Optional)"
                placeholderTextColor={COLORS.placeholder}
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={styles.fieldInput}
                placeholder="Note (Optional)"
                placeholderTextColor={COLORS.placeholder}
                value={note}
                onChangeText={setNote}
              />
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Location"
                  placeholderTextColor={COLORS.placeholder}
                  value={location}
                  onChangeText={setLocation}
                />
                <TextInput
                  style={[styles.fieldInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="With Whom"
                  placeholderTextColor={COLORS.placeholder}
                  value={withPerson}
                  onChangeText={setWithPerson}
                />
              </View>
            </Animated.View>
          )}

          <EGBlock
            inputText={inputText}
            categories={categories}
            transactions={[]}
          />
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: 16 }, // Remove insets.bottom here as global view handles it
          ]}
        >
          <AutoSuggestBlock
            inputText={inputText}
            categories={categories}
            onSelectCategory={(cat, wordOverride) => {
              setSelectedCategory(cat);
              setType(cat.type as "expense" | "income");
              const numberMatch = inputText.match(/\d+(\.\d+)?/);
              const amountStr = numberMatch ? numberMatch[0] : "";
              const word = wordOverride ? wordOverride : cat.name.toLowerCase();
              setInputText(amountStr ? `${amountStr} ${word}` : word);
            }}
            onOpenCreateModal={(suggestedName) => {
              setNewCatName(suggestedName);
              setNewCatIcon("category");
              setNewCatType(type);
              setCreateCatModalVisible(true);
            }}
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isIncome ? COLORS.success : COLORS.text },
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {existingTx ? "Update" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareView>

      <Modal
        visible={createCatModalVisible}
        animationType="slide"
        backdropColor={"rgba(0,0,0,0.5)"}
      >
        <Animated.View
          style={{ flex: 1, justifyContent: "flex-end" }}
          layout={LinearTransition.springify()}
        >
          <Animated.View
            style={styles.modalContent}
            layout={LinearTransition.springify()}
          >
            <Text style={styles.modalTitle}>Create Custom Category</Text>

            <TextInput
              style={styles.fieldInput}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Category Name"
              placeholderTextColor={COLORS.placeholder}
            />

            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  newCatType === "expense" && styles.expenseBtnActive,
                ]}
                onPress={() => setNewCatType("expense")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    newCatType === "expense" && { color: COLORS.danger },
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  newCatType === "income" && styles.incomeBtnActive,
                ]}
                onPress={() => setNewCatType("income")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    newCatType === "income" && { color: COLORS.success },
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Select Icon</Text>
            <View style={{ marginBottom: 20 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {AVAILABLE_ICONS.map((iconName) => {
                  const IconComp = getIcon(iconName);
                  const isSelected = newCatIcon === iconName;
                  return (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconSelectBtn,
                        isSelected && {
                          borderColor: COLORS.text,
                          backgroundColor: COLORS.active,
                        },
                      ]}
                      onPress={() => setNewCatIcon(iconName)}
                    >
                      <IconComp
                        size={24}
                        color={isSelected ? COLORS.text : COLORS.muted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: COLORS.text }]}
              onPress={handleCreateCategory}
            >
              <Text style={[styles.saveBtnText, { color: COLORS.background }]}>
                Create Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 16, alignItems: "center" }}
              onPress={() => setCreateCatModalVisible(false)}
            >
              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollArea: {},
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  expenseBtnActive: {
    backgroundColor: COLORS.dangerBg,
  },
  incomeBtnActive: {
    backgroundColor: COLORS.successBg,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.muted,
  },
  smartInput: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderColor: COLORS.border,
  },
  hintArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  recurringToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  recurringLabel: {
    fontWeight: "600",
    color: COLORS.muted,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.muted,
  },
  intervalPicker: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
    backgroundColor: COLORS.border,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  intervalChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  intervalChipActive: {
    backgroundColor: COLORS.card,
  },
  intervalText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  intervalTextActive: {
    color: COLORS.white,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.active,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusChipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  statusChipReceive: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  statusChipPay: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  statusChipTextActive: {
    color: COLORS.background,
    fontWeight: "700",
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  expandText: {
    color: COLORS.muted,
    marginRight: 4,
    fontSize: 12,
  },
  detailsArea: {
    overflow: "hidden",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  pillWrapper: {
    gap: 4,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  pillDots: {
    flexDirection: "row",
    gap: 3,
    marginLeft: 2,
  },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  summaryPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.active,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  catsList: {
    marginBottom: 20,
    flexDirection: "row",
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
  catChipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  catText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.lightGray,
  },
  catTextActive: {
    color: COLORS.background,
  },
  fieldInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  rowInputs: {
    flexDirection: "row",
  },
  footer: {
    paddingTop: 16,
    backgroundColor: COLORS.background,
    gap: 16,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 12,
  },
  iconSelectBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
});

import { COLORS } from "@/lib/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { parseSmartInput } from "../lib/smartInput";
import { Category, useStore } from "../lib/store";

export default function TransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addTransaction, updateTransaction, transactions, categories } =
    useStore();

  const existingTx =
    typeof id === "string" ? transactions.find((t) => t.id === id) : undefined;

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

  const [hasInit, setHasInit] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (existingTx) {
      setInputText(
        existingTx.amount.toString() +
          (existingTx.note ? ` ${existingTx.note}` : ""),
      );
      setType(existingTx.type);
      setNote(existingTx.note || "");
      setTitle(existingTx.title || "");
      setLocation(existingTx.location || "");
      setWithPerson(existingTx.withPerson || "");
      const cat = categories.find((c) => c.id === existingTx.categoryId);
      if (cat) setSelectedCategory(cat);
      if (existingTx.title || existingTx.location || existingTx.withPerson) {
        setShowDetails(true);
      }
    } else {
      // Set default category to first expense
      const defaultExp = categories.find((c) => c.type === "expense");
      if (defaultExp) setSelectedCategory(defaultExp);
    }

    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
    setHasInit(true);
  }, [existingTx, categories]);

  // Handle smart input
  useEffect(() => {
    if (!hasInit) return;
    if (existingTx && !inputText.includes(" ")) return; // don't override on edit unless they start typing naturally

    const res = parseSmartInput(inputText, categories);
    if (res.amount !== null) {
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
  }, [inputText, categories, showDetails, hasInit, existingTx]);

  const handleSave = () => {
    let amount = 0;
    const res = parseSmartInput(inputText, categories);
    amount = res.amount || 0;
    if (amount <= 0 && existingTx) amount = existingTx.amount; // fallback
    if (amount <= 0) return; // Prevent empty

    const payload = {
      amount: amount,
      type: type,
      categoryId: selectedCategory?.id || null,
      categoryName: selectedCategory?.name || null,
      title: title || null,
      note: res.note || note || null,
      location: location || null,
      withPerson: withPerson || null,
    };

    if (existingTx) {
      updateTransaction(existingTx.id, payload);
    } else {
      addTransaction({
        ...payload,
        date: Date.now(),
      });
    }

    Keyboard.dismiss();
    router.back();
  };

  const isIncome = type === "income";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollArea}
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
              style={[styles.toggleText, !isIncome && { color: COLORS.danger }]}
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
              style={[styles.toggleText, isIncome && { color: COLORS.success }]}
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
        />

        {!showDetails && (
          <View style={styles.hintArea}>
            <Text style={styles.hintText}>
              Category:{" "}
              <Text style={{ fontWeight: "700", color: COLORS.text }}>
                {selectedCategory?.name || "None"}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowDetails(true)}
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>More Details</Text>
              <ChevronDown size={16} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        )}

        {showDetails && (
          <View style={styles.detailsArea}>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.expandBtn}
            >
              <Text style={styles.expandText}>Less Details</Text>
              <ChevronUp size={16} color={COLORS.muted} />
            </TouchableOpacity>

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
                      style={[styles.catChip, isActive && styles.catChipActive]}
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
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollArea: {
    padding: 24,
  },
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
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
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
    fontSize: 40,
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
    marginTop: 8,
  },
  hintText: {
    fontSize: 15,
    color: COLORS.muted,
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  expandText: {
    color: COLORS.muted,
    marginRight: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  detailsArea: {
    marginTop: 16,
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
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  rowInputs: {
    flexDirection: "row",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  saveBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: "700",
  },
});

import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { getIcon } from "../iconMap";

/**
 * CategoriesScreen - Manage application categories.
 * Allows users to view existing categories and add new ones (defaults to Expense).
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, addCategory } = useStore();
  const [newCatName, setNewCatName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = () => {
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      icon: "folder",
      type: "expense",
    });
    setNewCatName("");
    setIsAdding(false);
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView style={styles.content}>
          <View style={styles.listSection}>
            {categories.map((c) => {
              const IconComponent = getIcon(c.icon);
              const isIncome = c.type === "income";

              return (
                <View key={c.id} style={styles.row}>
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isIncome
                          ? COLORS.successBg
                          : COLORS.active,
                      },
                    ]}
                  >
                    <IconComponent
                      size={20}
                      color={isIncome ? COLORS.success : COLORS.text}
                    />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{c.name}</Text>
                    <Text style={styles.catType}>{c.type}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {isAdding ? (
          <View style={styles.addForm}>
            <TextInput
              style={styles.input}
              placeholder="Category Name"
              placeholderTextColor={COLORS.placeholder}
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsAdding(false)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                <Text style={styles.btnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAdding(true)}
          >
            <View style={styles.addBtnIcon}>
              <Plus size={20} color={COLORS.black} />
            </View>
            <Text style={styles.addBtnText}>New Category</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  listSection: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  catType: {
    fontSize: 12,
    color: COLORS.muted,
    textTransform: "uppercase",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.black,
  },
  addForm: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  btnCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  btnCancelText: {
    color: COLORS.muted,
    fontWeight: "600",
  },
  btnSave: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  btnSaveText: {
    color: COLORS.background,
    fontWeight: "700",
  },
});

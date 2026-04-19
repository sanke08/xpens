import { COLORS } from "@/lib/colors";
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
import { getIcon } from "../lib/iconMap";
import { useStore } from "../lib/store";

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, addCategory } = useStore();
  const [newCatName, setNewCatName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = () => {
    if (!newCatName.trim()) return;
    addCategory({
      name: newCatName.trim(),
      icon: "Folder",
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
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content}>
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
                <Text style={styles.catName}>{c.name}</Text>
                <Text style={styles.catType}>{c.type}</Text>
              </View>
            );
          })}

          {isAdding ? (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                placeholder="Category Name"
                placeholderTextColor={COLORS.placeholder}
                value={newCatName}
                onChangeText={setNewCatName}
                autoFocus
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
              <Plus size={20} color={COLORS.text} />
              <Text style={styles.addBtnText}>New Category</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  catName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  catType: {
    fontSize: 13,
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  addBtnText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  addForm: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.text,
    borderRadius: 8,
  },
  btnSaveText: {
    color: COLORS.background,
    fontWeight: "600",
  },
});

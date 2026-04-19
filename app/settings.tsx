import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Download,
  Folder,
  Shield,
  Trash2,
  Upload,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "../lib/store";

export default function SettingsScreen() {
  const router = useRouter();
  const { categories, transactions } = useStore();

  const handleExport = () => {
    const data = {
      categories,
      transactions,
    };
    const json = JSON.stringify(data, null, 2);
    // In a real app we'd use FileSystem from expo to save this to user documents
    Alert.alert("Export Ready", `Data size: ${json.length} bytes`);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete everything? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // we'd call a reset function on db, but leaving it as a placeholder to prevent accidental wipe
            Alert.alert(
              "Data Cleared",
              "In a real app, data would be cleared here.",
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#171717" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/categories" as any)}
          >
            <View style={styles.rowLeft}>
              <Folder size={20} color="#171717" />
              <Text style={styles.rowText}>Manage Categories</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleExport}>
            <View style={styles.rowLeft}>
              <Download size={20} color="#171717" />
              <Text style={styles.rowText}>Export Data (JSON)</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Upload size={20} color="#171717" />
              <Text style={styles.rowText}>Import Data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleClearData}>
            <View style={styles.rowLeft}>
              <Trash2 size={20} color="#dc2626" />
              <Text style={[styles.rowText, { color: "#dc2626" }]}>
                Clear All Data
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Shield size={20} color="#171717" />
              <Text style={styles.rowText}>App Lock (Biometrics/PIN)</Text>
            </View>
            <Text style={styles.rowRightText}>Off</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          {/* <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Github size={20} color="#171717" />
              <Text style={styles.rowText}>Source Code</Text>
            </View>
          </TouchableOpacity> */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5e5",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#171717",
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#737373",
    marginLeft: 24,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5e5",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "500",
    color: "#171717",
  },
  rowRightText: {
    fontSize: 16,
    color: "#a3a3a3",
  },
});

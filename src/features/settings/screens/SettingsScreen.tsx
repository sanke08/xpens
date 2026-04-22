import { useRouter } from "expo-router";
import { Download, Folder, Shield, Trash2, Upload } from "lucide-react-native";
import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";

/**
 * SettingsScreen - Application configuration and data maintenance.
 * Handles data export/reset and general app settings.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { categories, transactions } = useStore();

  const handleExport = () => {
    const data = {
      categories,
      transactions,
    };
    const json = JSON.stringify(data, null, 2);
    // Real-world implementation would use Expo FileSystem or Share API
    Alert.alert(
      "Export Ready",
      `Data size: ${json.length} bytes\n(JSON generated)`,
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete everything? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanentely",
          style: "destructive",
          onPress: () => {
            // Integration hook for db wipe logic
            Alert.alert(
              "Placeholder",
              "Database wipe functionality would be triggered here.",
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/categories")}
          >
            <View style={styles.rowLeft}>
              <Folder size={20} color={COLORS.text} />
              <Text style={styles.rowText}>Manage Categories</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleExport}>
            <View style={styles.rowLeft}>
              <Download size={20} color={COLORS.text} />
              <Text style={styles.rowText}>Export Data (JSON)</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Upload size={20} color={COLORS.text} />
              <Text style={styles.rowText}>Import Data</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleClearData}>
            <View style={styles.rowLeft}>
              <Trash2 size={20} color={COLORS.danger} />
              <Text style={[styles.rowText, { color: COLORS.danger }]}>
                Clear All Data
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <Shield size={20} color={COLORS.text} />
              <Text style={styles.rowText}>App Lock (Biometrics/PIN)</Text>
            </View>
            <Text style={styles.rowRightText}>Off</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  rowRightText: {
    fontSize: 16,
    color: COLORS.gray,
  },
});

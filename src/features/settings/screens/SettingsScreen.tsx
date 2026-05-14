import { StorageAccessFramework } from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import {
  Cloud,
  Download,
  Folder,
  MessageSquare,
  RefreshCcw,
  RotateCcw,
  Shield,
  Trash2,
} from "lucide-react-native";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";

/**
 * SettingsScreen - Application configuration and data maintenance.
 * Added 'Manual Restore' and 'Smart Link' logic.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const categories = useStore((state) => state.categories);
  const resetAccount = useStore((state) => state.resetAccount);
  const backupFolderUri = useStore((state) => state.backupFolderUri);
  const setBackupFolderUri = useStore((state) => state.setBackupFolderUri);
  const triggerBackup = useStore((state) => state.triggerBackup);
  const triggerMerge = useStore((state) => state.triggerMerge);

  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isMerging, setIsMerging] = React.useState(false);

  const handlePickBackupFolder = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        await setBackupFolderUri(permissions.directoryUri);
        Alert.alert(
          "Auto-Safe Linked", 
          "We've linked your folder and merged any existing backup data with your current entries."
        );
      }
    } catch (e) {
      Alert.alert("Error", "Failed to link folder. Please try again.");
    }
  };

  const handleManualBackup = async () => {
    if (!backupFolderUri) {
      Alert.alert("Action Required", "Please link a backup folder first.");
      return;
    }

    setIsBackingUp(true);
    const success = await triggerBackup();
    setIsBackingUp(false);

    if (success) {
      Alert.alert("Backup Successful", "Your data has been synced to your persistent local folder.");
    } else {
      Alert.alert("Backup Failed", "Check your folder permissions or space.");
    }
  };

  const handleManualMerge = () => {
    if (!backupFolderUri) {
      Alert.alert("Action Required", "Please link a backup folder first.");
      return;
    }

    Alert.alert(
      "Merge Data",
      "This will import all missing transactions and categories from your backup into your current data. No existing data will be deleted. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Merge", 
          onPress: async () => {
            setIsMerging(true);
            const success = await triggerMerge();
            setIsMerging(false);
            if (success) {
              Alert.alert("Success", "Backup data has been merged into your current records!");
            } else {
              Alert.alert("Merge Failed", "No backup file found in the linked folder.");
            }
          }
        }
      ]
    );
  };

  const handleExport = () => {
    const data = { categories };
    const json = JSON.stringify(data, null, 2);
    Alert.alert("Export Ready", `Data size: ${json.length} bytes\n(JSON generated)`);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete everything? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: () => {
            resetAccount();
            Alert.alert("Success", "All data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zero-Touch Backup</Text>
        
        <TouchableOpacity style={styles.row} onPress={handlePickBackupFolder}>
          <View style={styles.rowLeft}>
            <Cloud size={20} color={COLORS.text} />
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.rowText}>Link Persistent Folder</Text>
              <Text style={styles.rowSubtext}>
                {backupFolderUri ? "Linked (Survives Uninstall)" : "Tap to link a local folder"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.row, !backupFolderUri && { opacity: 0.5 }]} 
          onPress={handleManualBackup}
          disabled={isBackingUp}
        >
          <View style={styles.rowLeft}>
            <RefreshCcw size={20} color={isBackingUp ? COLORS.muted : COLORS.success} />
            <Text style={[styles.rowText, isBackingUp && { color: COLORS.muted }]}>
              {isBackingUp ? "Syncing..." : "Manual Sync Now"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.row, !backupFolderUri && { opacity: 0.5 }]} 
          onPress={handleManualMerge}
          disabled={isMerging}
        >
          <View style={styles.rowLeft}>
            <RotateCcw size={20} color={isMerging ? COLORS.muted : COLORS.active} />
            <Text style={[styles.rowText, isMerging && { color: COLORS.muted }]}>
              {isMerging ? "Merging..." : "Merge from Folder"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={styles.row} onPress={() => router.push("/categories")}>
          <View style={styles.rowLeft}>
            <Folder size={20} color={COLORS.text} />
            <Text style={styles.rowText}>Manage Categories</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleExport}>
          <View style={styles.rowLeft}>
            <Download size={20} color={COLORS.text} />
            <Text style={styles.rowText}>Export Categories (JSON)</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => router.push("/sms-import" as any)}>
          <View style={styles.rowLeft}>
            <MessageSquare size={20} color={COLORS.text} />
            <Text style={styles.rowText}>Import from SMS</Text>
          </View>
          <Text style={styles.rowRightText}>Android</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleClearData}>
          <View style={styles.rowLeft}>
            <Trash2 size={20} color={COLORS.danger} />
            <Text style={[styles.rowText, { color: COLORS.danger }]}>Clear All Data</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  rowSubtext: {
    fontSize: 12,
    marginLeft: 16,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowRightText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "600",
  },
});

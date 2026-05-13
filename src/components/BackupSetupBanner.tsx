import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { Shield, ArrowRight } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { COLORS } from '../theme/colors';

export const BackupSetupBanner = () => {
  const backupFolderUri = useStore((state) => state.backupFolderUri);
  const setBackupFolderUri = useStore((state) => state.setBackupFolderUri);

  if (backupFolderUri) return null;

  const handleSetup = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (permissions.granted) {
        setBackupFolderUri(permissions.directoryUri);
        Alert.alert(
          "Success",
          "Permanent local backup is now active. Your data will persist even if you delete the app."
        );
      }
    } catch (err) {
      console.warn("[Backup] Setup failed:", err);
      Alert.alert("Error", "Could not set up backup folder. Please try again.");
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handleSetup}
      activeOpacity={0.9}
    >
      <View style={styles.iconContainer}>
        <Shield size={24} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Protect Your Data</Text>
        <Text style={styles.description}>
          Select a folder for permanent local backups that survive app deletion.
        </Text>
      </View>
      <ArrowRight size={20} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

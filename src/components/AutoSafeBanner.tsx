import { StorageAccessFramework } from "expo-file-system/legacy";
import { Cloud, X } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { useStore } from "../store/useStore";
import { COLORS } from "../theme/colors";

/**
 * AutoSafeBanner - A one-time setup guide for persistent backups.
 * Disappears forever once a folder is linked.
 */
export const AutoSafeBanner = () => {
  const backupFolderUri = useStore((s) => s.backupFolderUri);
  const setBackupFolderUri = useStore((s) => s.setBackupFolderUri);
  const [dismissed, setDismissed] = React.useState(false);

  if (backupFolderUri || dismissed) return null;

  const handleSetup = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        setBackupFolderUri(permissions.directoryUri);
      }
    } catch (e) {
      console.error("[Banner] Setup failed", e);
    }
  };

  return (
    <Animated.View 
      entering={FadeInUp} 
      exiting={FadeOut}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Cloud size={20} color={COLORS.success} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Secure Your Data Forever</Text>
        <Text style={styles.subtitle}>
          Link a folder once to enable automatic, persistent backups that survive app deletion.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleSetup}>
          <Text style={styles.buttonText}>Enable Auto-Safe Now</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={() => setDismissed(true)}>
        <X size={16} color={COLORS.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.success + "40",
    marginBottom: 20,
    position: "relative",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
});

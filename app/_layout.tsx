import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { dbService } from "../src/services/DatabaseService";
import { useStore } from "../src/store/useStore";
import { COLORS } from "../src/theme/colors";

export default function RootLayout() {
  const { isLoaded, loadData } = useStore();

  useEffect(() => {
    // Initialize DB synchronously via our Singleton
    try {
      dbService.initDb();
      loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.text} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          paddingHorizontal: 20,
        }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="transaction"
            options={{
              presentation: "formSheet",
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: COLORS.background },
            }}
          />
          <Stack.Screen name="categories" />
          <Stack.Screen name="category/[id]" />
          <Stack.Screen name="transactions" />
        </Stack>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

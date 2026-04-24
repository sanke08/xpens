import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { KeyboardProvider } from "../src/components/keyboard/KeyboardAwareView";
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
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <KeyboardProvider>
        <StatusBar style="light" />
        <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.background,
              },
              headerTitleStyle: { color: COLORS.text, fontSize: 24 },
              headerBackVisible: false,
              contentStyle: {
                backgroundColor: COLORS.background,
                paddingHorizontal: 20,
              },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: "Rxpense",
              }}
            />
            <Stack.Screen
              name="transaction"
              options={{
                presentation: "formSheet",
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen name="categories" options={{ title: "Categories" }} />
            <Stack.Screen name="category/[id]" />
            <Stack.Screen
              name="transactions"
              options={{ title: "All Transactions" }}
            />
            <Stack.Screen
              name="recurring/index"
              options={{ title: "Recurring Expenses" }}
            />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
          </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

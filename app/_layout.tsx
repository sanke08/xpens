import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { db, initDb } from '../lib/db';
import { useStore } from '../lib/store';
import 'react-native-reanimated';

export default function RootLayout() {
  const { isLoaded, loadData } = useStore();

  useEffect(() => {
    // Initialize DB synchronously
    try {
      initDb();
      loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' }
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen 
          name="transaction" 
          options={{ 
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: '#f9f9f9' }
          }} 
        />
        <Stack.Screen name="categories" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="transactions" />
      </Stack>
    </>
  );
}

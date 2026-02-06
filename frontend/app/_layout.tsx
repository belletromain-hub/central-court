import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Lazy load contexts to avoid navigation conflicts
const AppProvider = React.lazy(() => import('../src/context/AppContext').then(m => ({ default: m.AppProvider })));
const AuthProvider = React.lazy(() => import('../src/context/AuthContext').then(m => ({ default: m.AuthProvider })));

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <React.Suspense fallback={null}>
        <AuthProvider>
          <AppProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="invite" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="preferences" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="profile-edit" options={{ headerShown: false }} />
              <Stack.Screen name="notifications" options={{ headerShown: false }} />
            </Stack>
          </AppProvider>
        </AuthProvider>
      </React.Suspense>
    </SafeAreaProvider>
  );
}

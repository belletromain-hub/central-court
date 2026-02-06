import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="step1-prenom" />
      <Stack.Screen name="step2-naissance" />
      <Stack.Screen name="step3-circuits" />
      <Stack.Screen name="step4-niveaux" />
      <Stack.Screen name="step5-classement" />
      <Stack.Screen name="step6-email" />
      <Stack.Screen name="step7-password" />
    </Stack>
  );
}

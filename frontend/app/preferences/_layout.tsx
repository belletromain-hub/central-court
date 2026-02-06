import { Stack } from 'expo-router';

export default function PreferencesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="voyage" />
      <Stack.Screen name="hotel" />
      <Stack.Screen name="food" />
    </Stack>
  );
}

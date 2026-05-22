import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#050C16' },
    }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

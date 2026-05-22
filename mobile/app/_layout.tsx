import '../global.css';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initializeDatabase } from '../db';
import { loadFaceEmbedding } from '../services/faceEmbedding';
import { useUserStore } from '../store/userStore';
import { useAlarmStore } from '../store/alarmStore';
import { registerAlarmTask } from '../tasks/alarmTask';
import { useFajrGuardFonts } from '../hooks/useFonts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const { fontsLoaded } = useFajrGuardFonts();

  useEffect(() => {
    initializeDatabase();
    loadFaceEmbedding().then((emb) => {
      if (emb) {
        useUserStore.getState().setRegistered(emb);
      }
    });
    registerAlarmTask();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'prayer_alarm' && data?.prayerId) {
        useAlarmStore.getState().startAlarm(data.prayerId as string);
        router.push('/alarm');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 bg-[#050C16] items-center justify-center">
        <Text className="text-[#C9A227] text-2xl">FajrGuard</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050C16' },
        animation: 'fade',
      }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="alarm" options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
          animation: 'fade',
        }} />
        <Stack.Screen name="verify" options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
          animation: 'fade',
        }} />
      </Stack>
    </>
  );
}

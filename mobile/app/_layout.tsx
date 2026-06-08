import '../global.css';
import React, { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AndroidAudioUsage } from 'expo-notifications';
import { initializeDatabase } from '../db';
import { loadFaceEmbedding } from '../services/faceEmbedding';
import { useUserStore } from '../store/userStore';
import { useAlarmStore } from '../store/alarmStore';
import { usePrayerStore } from '../store/prayerStore';
import { registerAlarmTask } from '../tasks/alarmTask';
import { useFajrGuardFonts } from '../hooks/useFonts';

const ALARM_CHANNEL_ID = 'prayer_alarm';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

async function requestAlarmPermissions(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return;
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
        allowCriticalAlerts: true,
        provideAppNotificationSettings: true,
      },
    });
  } catch (e) {
    console.warn('[notifications] permission request failed:', e);
  }
}

async function createAlarmChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Prayer Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'adhan.wav',
      bypassDnd: true,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#C9A227',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });
  }
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { fontsLoaded, fontError } = useFajrGuardFonts();
  const alarmingRef = useRef(false);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await createAlarmChannel();
      await requestAlarmPermissions();
      await useUserStore.getState().hydrate();
      loadFaceEmbedding().then((emb) => {
        if (emb) {
          useUserStore.getState().setRegistered(emb);
        }
      });
      registerAlarmTask();

      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const data: any = last?.notification?.request?.content?.data;
        if (data?.type === 'prayer_alarm' && data?.prayerId) {
          useAlarmStore.getState().startAlarm(data.prayerId as string);
          alarmingRef.current = true;
          router.replace('/alarm');
          return;
        }

        const MISSED_WINDOW_MS = 10 * 60 * 1000;
        const times = usePrayerStore.getState().prayerTimes;
        const now = Date.now();
        const recent = times
          .filter((pt) => pt.timestamp <= now && now - pt.timestamp <= MISSED_WINDOW_MS)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        if (recent) {
          useAlarmStore.getState().startAlarm(recent.prayerId);
          alarmingRef.current = true;
          router.replace('/alarm');
        }
      } catch (e) {
        console.warn('[notifications] cold-start lookup failed:', e);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'prayer_alarm' && data?.prayerId) {
        useAlarmStore.getState().startAlarm(data.prayerId as string);
        alarmingRef.current = true;
        if (pathname !== '/alarm') {
          router.push('/alarm');
        }
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'prayer_alarm' && data?.prayerId) {
        if (alarmingRef.current) return;
        useAlarmStore.getState().startAlarm(data.prayerId as string);
        alarmingRef.current = true;
        if (pathname !== '/alarm') {
          router.push('/alarm');
        }
      }
    });

    return () => {
      tapSub.remove();
      receivedSub.remove();
    };
  }, [router, pathname]);

  useEffect(() => {
    let lastCheck = Date.now();
    const interval = setInterval(() => {
      if (alarmingRef.current) return;
      const now = Date.now();
      const times = usePrayerStore.getState().prayerTimes;
      for (const pt of times) {
        if (pt.timestamp <= now && pt.timestamp > lastCheck) {
          alarmingRef.current = true;
          useAlarmStore.getState().startAlarm(pt.prayerId);
          if (pathname !== '/alarm') {
            router.push('/alarm');
          }
          break;
        }
      }
      lastCheck = now;
    }, 5000);

    return () => clearInterval(interval);
  }, [router, pathname]);

  useEffect(() => {
    const unsub = useAlarmStore.subscribe((state, prev) => {
      if (!state.isAlarming && prev.isAlarming) {
        alarmingRef.current = false;
      }
    });
    return unsub;
  }, []);

  if (!fontsLoaded && !fontError) {
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

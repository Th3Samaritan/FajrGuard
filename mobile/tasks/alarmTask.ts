import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { fetchPrayerTimes, fetchPrayerTimesByCity } from '../services/prayerAPI';
import { PrayerTime } from '../store/prayerStore';
import { PRAYER_NAMES, PRAYER_ARABIC } from '../constants/prayers';

const ALARM_CHECK_TASK = 'ALARM_CHECK_TASK';
const ALARM_CHANNEL_ID = 'prayer_alarm';

async function getTodaysPrayerTimes(): Promise<PrayerTime[]> {
  try {
    const { usePrayerStore } = await import('../store/prayerStore');
    const state = usePrayerStore.getState();
    const today = new Date().toISOString().split('T')[0];

    if (state.lastFetchDate === today && state.prayerTimes.length > 0) {
      return state.prayerTimes;
    }
  } catch {}

  try {
    const { useUserStore } = await import('../store/userStore');
    const { calculationMethod, cityOverride } = useUserStore.getState();

    if (cityOverride) {
      const [city, country = ''] = cityOverride.split(',').map((s) => s.trim());
      return await fetchPrayerTimesByCity(city, country, undefined, calculationMethod);
    }

    const { default: Location } = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return await fetchPrayerTimes(
        loc.coords.latitude,
        loc.coords.longitude,
        undefined,
        calculationMethod
      );
    }

    return await fetchPrayerTimesByCity('Mecca', 'Saudi Arabia', undefined, calculationMethod);
  } catch {
    return [];
  }
}

async function schedulePrayerNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { useUserStore } = await import('../store/userStore');
  const { alarmLeadMinutes } = useUserStore.getState();
  const leadMs = alarmLeadMinutes * 60 * 1000;

  const prayerTimes = await getTodaysPrayerTimes();
  if (prayerTimes.length === 0) return;

  for (const pt of prayerTimes) {
    const triggerDate = new Date(pt.timestamp - leadMs);
    const now = new Date();

    if (triggerDate <= now) continue;

    const isFajr = pt.prayerId === 'fajr';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PRAYER_NAMES[pt.prayerId] || pt.prayerId} Prayer`,
        body: `Time for ${PRAYER_ARABIC[pt.prayerId] || pt.prayerId} prayer. Tap to respond.`,
        data: { prayerId: pt.prayerId, type: 'prayer_alarm' },
        sound: isFajr ? 'adhan_fajr.wav' : 'adhan.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500, 200, 500],
        categoryIdentifier: ALARM_CHANNEL_ID,
        interruptionLevel: 'critical',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ALARM_CHANNEL_ID,
      },
    });
  }
}

TaskManager.defineTask(ALARM_CHECK_TASK, async () => {
  try {
    await schedulePrayerNotifications();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerAlarmTask(): Promise<void> {
  await schedulePrayerNotifications();

  try {
    await BackgroundFetch.registerTaskAsync(ALARM_CHECK_TASK, {
      minimumInterval: 900,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.warn('Background task registration failed:', err);
  }
}

export async function unregisterAlarmTask(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(ALARM_CHECK_TASK);
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

export { schedulePrayerNotifications };

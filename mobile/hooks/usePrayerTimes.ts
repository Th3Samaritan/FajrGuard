import { useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { usePrayerStore, PrayerTime } from '../store/prayerStore';
import { useUserStore } from '../store/userStore';
import { fetchPrayerTimes, fetchPrayerTimesByCity } from '../services/prayerAPI';

export function usePrayerTimes() {
  const { prayerTimes, setPrayerTimes, lastFetchDate, setLastFetchDate } = usePrayerStore();
  const { calculationMethod, cityOverride } = useUserStore();
  const isFetching = useRef(false);

  const fetchAndCache = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      let times: PrayerTime[];

      if (cityOverride) {
        const [city, country = ''] = cityOverride.split(',').map((s) => s.trim());
        times = await fetchPrayerTimesByCity(city, country, undefined, calculationMethod);
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          times = await fetchPrayerTimesByCity('Mecca', 'Saudi Arabia', undefined, calculationMethod);
        } else {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          times = await fetchPrayerTimes(
            loc.coords.latitude, loc.coords.longitude,
            undefined, calculationMethod
          );
        }
      }

      setPrayerTimes(times);
      setLastFetchDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.warn('Failed to fetch prayer times:', error);
    } finally {
      isFetching.current = false;
    }
  }, [calculationMethod, cityOverride, setPrayerTimes, setLastFetchDate]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastFetchDate !== today || prayerTimes.length === 0) {
      fetchAndCache();
    }
  }, [lastFetchDate, fetchAndCache, prayerTimes.length]);

  const getNextPrayer = useCallback((): PrayerTime | null => {
    const now = Date.now();
    const upcoming = prayerTimes.filter((p) => p.timestamp > now);
    return upcoming[0] || null;
  }, [prayerTimes]);

  const getTimeUntil = useCallback((targetTimestamp: number): number => {
    return Math.max(0, targetTimestamp - Date.now());
  }, []);

  return { prayerTimes, getNextPrayer, getTimeUntil, refetch: fetchAndCache };
}

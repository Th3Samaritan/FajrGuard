import { useCallback, useEffect, useState } from 'react';
import { getStreakData, updateStreakLog } from '../services/storage';
import { usePrayerStore } from '../store/prayerStore';

export function useStreak() {
  const [streakDays, setStreakDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [prayerCalendar, setPrayerCalendar] = useState<Record<string, number>>({});

  const calculate = useCallback(async () => {
    const logs = await getStreakData(365);
    const calendar: Record<string, number> = {};

    for (const log of logs) {
      calendar[log.date] = log.completedCount;
    }

    setPrayerCalendar(calendar);

    let currentStreak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = calendar[dateStr] || 0;

      if (count >= 5) {
        currentStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }

    let bestStreak = 0;
    let run = 0;
    const allDates = Object.keys(calendar).sort();
    let prev: number | null = null;
    for (const ds of allDates) {
      const ts = new Date(ds).getTime();
      const count = calendar[ds] || 0;
      if (count >= 5) {
        if (prev !== null && ts - prev === 86400000) run++;
        else run = 1;
        bestStreak = Math.max(bestStreak, run);
      } else {
        run = 0;
      }
      prev = ts;
    }
    bestStreak = Math.max(bestStreak, currentStreak);

    setStreakDays(currentStreak);
    setLongestStreak(bestStreak);
  }, []);

  const logCompletion = useCallback(async (date: string, count: number, streakDay: number) => {
    await updateStreakLog(date, count, streakDay);
    await calculate();
  }, [calculate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return {
    streakDays,
    longestStreak,
    prayerCalendar,
    calculate,
    logCompletion,
  };
}

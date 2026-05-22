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
    let bestStreak = 0;
    const today = new Date();
    const sortedDates = Object.keys(calendar).sort().reverse();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = calendar[dateStr] || 0;

      if (count >= 5) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (i > 0 || count < 5) {
        break;
      }
    }

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

import { create } from 'zustand';

export interface PrayerTime {
  prayerId: string;
  time: string;
  timestamp: number;
}

export interface PrayerState {
  prayerTimes: PrayerTime[];
  completedPrayers: Record<string, boolean>;
  streakDays: number;
  longestStreak: number;
  lastFetchDate: string | null;

  setPrayerTimes: (times: PrayerTime[]) => void;
  markCompleted: (prayerId: string) => void;
  setStreak: (days: number, longest: number) => void;
  setLastFetchDate: (date: string) => void;
  isCompleted: (prayerId: string) => boolean;
  allCompleted: () => boolean;
}

export const usePrayerStore = create<PrayerState>((set, get) => ({
  prayerTimes: [],
  completedPrayers: {},
  streakDays: 0,
  longestStreak: 0,
  lastFetchDate: null,

  setPrayerTimes: (times) => set({ prayerTimes: times }),

  markCompleted: (prayerId) => set((state) => ({
    completedPrayers: { ...state.completedPrayers, [prayerId]: true },
  })),

  setStreak: (days, longest) => set({ streakDays: days, longestStreak: longest }),

  setLastFetchDate: (date) => set({ lastFetchDate: date }),

  isCompleted: (prayerId) => !!get().completedPrayers[prayerId],

  allCompleted: () => {
    const { completedPrayers } = get();
    return ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].every((id) => completedPrayers[id]);
  },
}));

import { create } from 'zustand';

interface AlarmState {
  isAlarming: boolean;
  currentPrayer: string | null;
  escalationLevel: number;
  alarmStartTime: number | null;
  wuduVerified: boolean;

  startAlarm: (prayerId: string) => void;
  stopAlarm: () => void;
  setEscalationLevel: (level: number) => void;
  setWuduVerified: (verified: boolean) => void;
}

export const useAlarmStore = create<AlarmState>((set) => ({
  isAlarming: false,
  currentPrayer: null,
  escalationLevel: 0,
  alarmStartTime: null,
  wuduVerified: false,

  startAlarm: (prayerId) => set({
    isAlarming: true,
    currentPrayer: prayerId,
    escalationLevel: 0,
    alarmStartTime: Date.now(),
    wuduVerified: false,
  }),

  stopAlarm: () => set({
    isAlarming: false,
    currentPrayer: null,
    escalationLevel: 0,
    alarmStartTime: null,
    wuduVerified: false,
  }),

  setEscalationLevel: (level) => set({ escalationLevel: level }),

  setWuduVerified: (verified) => set({ wuduVerified: verified }),
}));

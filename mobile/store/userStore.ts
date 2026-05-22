import { create } from 'zustand';

export interface UserState {
  isRegistered: boolean;
  faceEmbedding: number[] | null;
  wuduThreshold: number;
  calculationMethod: number;
  cityOverride: string | null;
  alarmLeadMinutes: number;

  setRegistered: (embedding: number[]) => void;
  setWuduThreshold: (threshold: number) => void;
  setCalculationMethod: (method: number) => void;
  setCityOverride: (city: string | null) => void;
  setAlarmLeadMinutes: (minutes: number) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  isRegistered: false,
  faceEmbedding: null,
  wuduThreshold: 0.82,
  calculationMethod: 2,
  cityOverride: null,
  alarmLeadMinutes: 5,

  setRegistered: (embedding) => set({ isRegistered: true, faceEmbedding: embedding }),

  setWuduThreshold: (threshold) => set({ wuduThreshold: threshold }),

  setCalculationMethod: (method) => set({ calculationMethod: method }),

  setCityOverride: (city) => set({ cityOverride: city }),

  setAlarmLeadMinutes: (minutes) => set({ alarmLeadMinutes: minutes }),

  reset: () => set({
    isRegistered: false,
    faceEmbedding: null,
    wuduThreshold: 0.82,
    calculationMethod: 2,
    cityOverride: null,
    alarmLeadMinutes: 5,
  }),
}));

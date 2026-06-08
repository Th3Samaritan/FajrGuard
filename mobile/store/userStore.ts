import { create } from 'zustand';
import { getSetting, setSetting } from '../services/storage';

const SETTINGS_KEY = 'user_settings_v1';

export interface UserState {
  isRegistered: boolean;
  faceEmbedding: number[] | null;
  wuduThreshold: number;
  calculationMethod: number;
  cityOverride: string | null;
  alarmLeadMinutes: number;
  hydrated: boolean;

  setRegistered: (embedding: number[]) => void;
  setWuduThreshold: (threshold: number) => void;
  setCalculationMethod: (method: number) => void;
  setCityOverride: (city: string | null) => void;
  setAlarmLeadMinutes: (minutes: number) => void;
  hydrate: () => Promise<void>;
  reset: () => void;
}

interface PersistedSettings {
  wuduThreshold: number;
  calculationMethod: number;
  cityOverride: string | null;
  alarmLeadMinutes: number;
}

const DEFAULTS: PersistedSettings = {
  wuduThreshold: 0.82,
  calculationMethod: 2,
  cityOverride: null,
  alarmLeadMinutes: 5,
};

async function persistSettings(state: PersistedSettings): Promise<void> {
  try {
    await setSetting(SETTINGS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[userStore] failed to persist settings:', e);
  }
}

export const useUserStore = create<UserState>((set, get) => ({
  isRegistered: false,
  faceEmbedding: null,
  wuduThreshold: DEFAULTS.wuduThreshold,
  calculationMethod: DEFAULTS.calculationMethod,
  cityOverride: DEFAULTS.cityOverride,
  alarmLeadMinutes: DEFAULTS.alarmLeadMinutes,
  hydrated: false,

  setRegistered: (embedding) => set({ isRegistered: true, faceEmbedding: embedding }),

  setWuduThreshold: (wuduThreshold) => {
    set({ wuduThreshold });
    const s = get();
    persistSettings({ wuduThreshold, calculationMethod: s.calculationMethod, cityOverride: s.cityOverride, alarmLeadMinutes: s.alarmLeadMinutes });
  },

  setCalculationMethod: (calculationMethod) => {
    set({ calculationMethod });
    const s = get();
    persistSettings({ wuduThreshold: s.wuduThreshold, calculationMethod, cityOverride: s.cityOverride, alarmLeadMinutes: s.alarmLeadMinutes });
  },

  setCityOverride: (cityOverride) => {
    set({ cityOverride });
    const s = get();
    persistSettings({ wuduThreshold: s.wuduThreshold, calculationMethod: s.calculationMethod, cityOverride, alarmLeadMinutes: s.alarmLeadMinutes });
  },

  setAlarmLeadMinutes: (alarmLeadMinutes) => {
    set({ alarmLeadMinutes });
    const s = get();
    persistSettings({ wuduThreshold: s.wuduThreshold, calculationMethod: s.calculationMethod, cityOverride: s.cityOverride, alarmLeadMinutes });
  },

  hydrate: async () => {
    try {
      const raw = await getSetting(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
        set({
          wuduThreshold: parsed.wuduThreshold ?? DEFAULTS.wuduThreshold,
          calculationMethod: parsed.calculationMethod ?? DEFAULTS.calculationMethod,
          cityOverride: parsed.cityOverride ?? DEFAULTS.cityOverride,
          alarmLeadMinutes: parsed.alarmLeadMinutes ?? DEFAULTS.alarmLeadMinutes,
        });
      }
    } catch (e) {
      console.warn('[userStore] hydrate failed:', e);
    } finally {
      set({ hydrated: true });
    }
  },

  reset: () => {
    set({
      isRegistered: false,
      faceEmbedding: null,
      ...DEFAULTS,
    });
    persistSettings(DEFAULTS);
  },
}));

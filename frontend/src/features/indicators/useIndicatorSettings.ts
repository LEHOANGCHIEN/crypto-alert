import { create } from 'zustand';
import { INDICATORS_STORAGE_KEY, parseSettings, type IndicatorSettings } from './settings';

function load(): IndicatorSettings {
  try {
    return parseSettings(localStorage.getItem(INDICATORS_STORAGE_KEY));
  } catch {
    return parseSettings(null);
  }
}

function save(s: IndicatorSettings): void {
  try {
    localStorage.setItem(INDICATORS_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable (private mode): settings still apply for this page
  }
}

type Store = {
  settings: IndicatorSettings;
  setMaEnabled: (slot: number, enabled: boolean) => void;
  setMaPeriod: (slot: number, period: number) => void;
  setRsi: (enabled: boolean) => void;
  setMacd: (enabled: boolean) => void;
  setVolume: (enabled: boolean) => void;
};

/** Indicator settings of this browser (localStorage `crypto-alert.indicators`). */
export const useIndicatorSettings = create<Store>((set, get) => {
  const update = (next: IndicatorSettings) => {
    save(next);
    set({ settings: next });
  };
  return {
    settings: load(),
    setMaEnabled: (slot, enabled) => {
      const s = get().settings;
      update({ ...s, ma: s.ma.map((m, i) => (i === slot ? { ...m, enabled } : m)) });
    },
    setMaPeriod: (slot, period) => {
      const s = get().settings;
      update({ ...s, ma: s.ma.map((m, i) => (i === slot ? { ...m, period } : m)) });
    },
    setRsi: (rsi) => update({ ...get().settings, rsi }),
    setMacd: (macd) => update({ ...get().settings, macd }),
    setVolume: (volume) => update({ ...get().settings, volume }),
  };
});

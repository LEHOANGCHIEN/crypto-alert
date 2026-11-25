import { create } from 'zustand';
import { CHART_TYPE_STORAGE_KEY, DEFAULT_CHART_TYPE, parseChartType, type ChartType } from './chart-series';

function load(): ChartType {
  try {
    return parseChartType(localStorage.getItem(CHART_TYPE_STORAGE_KEY));
  } catch {
    return DEFAULT_CHART_TYPE;
  }
}

/** Chart type of this browser (localStorage `crypto-alert.chart-type`). */
export const useChartType = create<{ type: ChartType; setType: (t: ChartType) => void }>((set) => ({
  type: load(),
  setType: (type) => {
    try {
      localStorage.setItem(CHART_TYPE_STORAGE_KEY, type);
    } catch {
      /* storage unavailable: the choice applies for this page only */
    }
    set({ type });
  },
}));

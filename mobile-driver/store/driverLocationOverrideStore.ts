import { create } from 'zustand';

interface DriverLocationOverrideState {
  isSimulationOverrideEnabled: boolean;
  locationOverride: { latitude: number; longitude: number } | null;
  setLocationOverride: (location: { latitude: number; longitude: number }) => void;
  clearLocationOverride: () => void;
}

export const useDriverLocationOverrideStore = create<DriverLocationOverrideState>((set) => ({
  isSimulationOverrideEnabled: false,
  locationOverride: null,
  setLocationOverride: (location) =>
    set({
      isSimulationOverrideEnabled: true,
      locationOverride: location,
    }),
  clearLocationOverride: () =>
    set({
      isSimulationOverrideEnabled: false,
      locationOverride: null,
    }),
}));

import { create } from "zustand";

interface UiState {
  privateRevealed: boolean;
  togglePrivate: () => void;
  hidePrivate: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  privateRevealed: false,
  togglePrivate: () => set((state) => ({ privateRevealed: !state.privateRevealed })),
  hidePrivate: () => set({ privateRevealed: false }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));

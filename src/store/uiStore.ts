import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  kbOpen: boolean;
  settingsOpen: boolean;
  online: boolean;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  toggleKb: () => void;
  setKbOpen: (v: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (v: boolean) => void;
  setOnline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  historyOpen: false,
  kbOpen: false,
  settingsOpen: false,
  online: false,
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen, kbOpen: false, settingsOpen: false })),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  toggleKb: () => set((s) => ({ kbOpen: !s.kbOpen, historyOpen: false, settingsOpen: false })),
  setKbOpen: (v) => set({ kbOpen: v }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen, historyOpen: false, kbOpen: false })),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setOnline: (v) => set({ online: v }),
}));

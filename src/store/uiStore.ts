import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  kbOpen: boolean;
  online: boolean;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  toggleKb: () => void;
  setKbOpen: (v: boolean) => void;
  setOnline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  historyOpen: false,
  kbOpen: false,
  online: false,
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen, kbOpen: false })),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  toggleKb: () => set((s) => ({ kbOpen: !s.kbOpen, historyOpen: false })),
  setKbOpen: (v) => set({ kbOpen: v }),
  setOnline: (v) => set({ online: v }),
}));

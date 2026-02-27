import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  kbOpen: boolean;
  settingsOpen: boolean;
  auditOpen: boolean;
  financeOpen: boolean;
  online: boolean;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  toggleKb: () => void;
  setKbOpen: (v: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (v: boolean) => void;
  toggleAudit: () => void;
  toggleFinance: () => void;
  setOnline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  historyOpen: false,
  kbOpen: false,
  settingsOpen: false,
  auditOpen: false,
  financeOpen: false,
  online: false,
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen, kbOpen: false, settingsOpen: false, auditOpen: false, financeOpen: false })),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  toggleKb: () => set((s) => ({ kbOpen: !s.kbOpen, historyOpen: false, settingsOpen: false, auditOpen: false, financeOpen: false })),
  setKbOpen: (v) => set({ kbOpen: v }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen, historyOpen: false, kbOpen: false, auditOpen: false, financeOpen: false })),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  toggleAudit: () => set((s) => ({ auditOpen: !s.auditOpen, historyOpen: false, kbOpen: false, settingsOpen: false, financeOpen: false })),
  toggleFinance: () => set((s) => ({ financeOpen: !s.financeOpen, historyOpen: false, kbOpen: false, settingsOpen: false, auditOpen: false })),
  setOnline: (v) => set({ online: v }),
}));

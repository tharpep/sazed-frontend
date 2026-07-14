import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  kbOpen: boolean;
  settingsOpen: boolean;
  auditOpen: boolean;
  financeOpen: boolean;
  journalOpen: boolean;
  moreOpen: boolean;
  online: boolean;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  toggleKb: () => void;
  setKbOpen: (v: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (v: boolean) => void;
  toggleAudit: () => void;
  toggleFinance: () => void;
  toggleJournal: () => void;
  toggleMore: () => void;
  setMoreOpen: (v: boolean) => void;
  closeAll: () => void;
  setOnline: (v: boolean) => void;
}

// Every overlay/panel is mutually exclusive — opening one always closes the
// rest. Spreading this before the toggled key keeps that invariant in one place.
const ALL_CLOSED = {
  historyOpen: false,
  kbOpen: false,
  settingsOpen: false,
  auditOpen: false,
  financeOpen: false,
  journalOpen: false,
  moreOpen: false,
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...ALL_CLOSED,
  online: false,
  toggleHistory: () => set((s) => ({ ...ALL_CLOSED, historyOpen: !s.historyOpen })),
  setHistoryOpen: (v) => set({ ...ALL_CLOSED, historyOpen: v }),
  toggleKb: () => set((s) => ({ ...ALL_CLOSED, kbOpen: !s.kbOpen })),
  setKbOpen: (v) => set({ ...ALL_CLOSED, kbOpen: v }),
  toggleSettings: () => set((s) => ({ ...ALL_CLOSED, settingsOpen: !s.settingsOpen })),
  setSettingsOpen: (v) => set({ ...ALL_CLOSED, settingsOpen: v }),
  toggleAudit: () => set((s) => ({ ...ALL_CLOSED, auditOpen: !s.auditOpen })),
  toggleFinance: () => set((s) => ({ ...ALL_CLOSED, financeOpen: !s.financeOpen })),
  toggleJournal: () => set((s) => ({ ...ALL_CLOSED, journalOpen: !s.journalOpen })),
  toggleMore: () => set((s) => ({ ...ALL_CLOSED, moreOpen: !s.moreOpen })),
  setMoreOpen: (v) => set({ ...ALL_CLOSED, moreOpen: v }),
  closeAll: () => set({ ...ALL_CLOSED }),
  setOnline: (v) => set({ online: v }),
}));

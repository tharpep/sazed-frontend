import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  kbOpen: boolean;
  settingsOpen: boolean;
  auditOpen: boolean;
  financeOpen: boolean;
  journalOpen: boolean;
  homelabOpen: boolean;
  gatewayOpen: boolean;
  automationsOpen: boolean;
  backlogOpen: boolean;
  moreOpen: boolean;
  online: boolean;
  // Private apps (registry `private`) stay hidden until Pryce taps his name on Home. In memory
  // only, and App hides them again whenever the console goes to the background.
  privateRevealed: boolean;
  togglePrivate: () => void;
  hidePrivate: () => void;
  // Backlog item to open, from a ?page=backlog&item=<id> link (Pushover buttons)
  linkedBacklogItem: string | null;
  setLinkedBacklogItem: (id: string | null) => void;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  toggleKb: () => void;
  setKbOpen: (v: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (v: boolean) => void;
  toggleAudit: () => void;
  toggleFinance: () => void;
  toggleJournal: () => void;
  toggleHomelab: () => void;
  toggleGateway: () => void;
  toggleAutomations: () => void;
  toggleBacklog: () => void;
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
  homelabOpen: false,
  gatewayOpen: false,
  automationsOpen: false,
  backlogOpen: false,
  moreOpen: false,
} as const;

export const useUiStore = create<UiState>((set) => ({
  ...ALL_CLOSED,
  online: false,
  privateRevealed: false,
  togglePrivate: () => set((s) => ({ privateRevealed: !s.privateRevealed })),
  hidePrivate: () => set({ privateRevealed: false }),
  linkedBacklogItem: null,
  setLinkedBacklogItem: (id) => set({ linkedBacklogItem: id }),
  toggleHistory: () => set((s) => ({ ...ALL_CLOSED, historyOpen: !s.historyOpen })),
  setHistoryOpen: (v) => set({ ...ALL_CLOSED, historyOpen: v }),
  toggleKb: () => set((s) => ({ ...ALL_CLOSED, kbOpen: !s.kbOpen })),
  setKbOpen: (v) => set({ ...ALL_CLOSED, kbOpen: v }),
  toggleSettings: () => set((s) => ({ ...ALL_CLOSED, settingsOpen: !s.settingsOpen })),
  setSettingsOpen: (v) => set({ ...ALL_CLOSED, settingsOpen: v }),
  toggleAudit: () => set((s) => ({ ...ALL_CLOSED, auditOpen: !s.auditOpen })),
  toggleFinance: () => set((s) => ({ ...ALL_CLOSED, financeOpen: !s.financeOpen })),
  toggleJournal: () => set((s) => ({ ...ALL_CLOSED, journalOpen: !s.journalOpen })),
  toggleHomelab: () => set((s) => ({ ...ALL_CLOSED, homelabOpen: !s.homelabOpen })),
  toggleGateway: () => set((s) => ({ ...ALL_CLOSED, gatewayOpen: !s.gatewayOpen })),
  toggleAutomations: () => set((s) => ({ ...ALL_CLOSED, automationsOpen: !s.automationsOpen })),
  toggleBacklog: () => set((s) => ({ ...ALL_CLOSED, backlogOpen: !s.backlogOpen })),
  toggleMore: () => set((s) => ({ ...ALL_CLOSED, moreOpen: !s.moreOpen })),
  setMoreOpen: (v) => set({ ...ALL_CLOSED, moreOpen: v }),
  closeAll: () => set({ ...ALL_CLOSED }),
  setOnline: (v) => set({ online: v }),
}));

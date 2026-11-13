import { create } from "zustand";

import { useNavStore, type ItemRef } from "./navStore";

interface UiState {
  online: boolean;
  privateRevealed: boolean;
  togglePrivate: () => void;
  hidePrivate: () => void;
  linkedBacklogItem: string | null;
  setLinkedBacklogItem: (id: string | null) => void;
  linkedProject: string | null;
  setLinkedProject: (slug: string | null) => void;
  linkedPlan: { slug: string; version: number | null } | null;
  setLinkedPlan: (plan: { slug: string; version: number | null } | null) => void;
  linkedDispatchPlan: string | null;
  setLinkedDispatchPlan: (plan: string | null) => void;
  linkedProfile: string | null;
  setLinkedProfile: (name: string | null) => void;
  setOnline: (value: boolean) => void;
}

function link(ref: ItemRef | null) {
  if (ref) useNavStore.getState().openItem(ref);
}

export const useUiStore = create<UiState>((set) => ({
  online: false,
  privateRevealed: false,
  togglePrivate: () => set((state) => ({ privateRevealed: !state.privateRevealed })),
  hidePrivate: () => set({ privateRevealed: false }),
  linkedBacklogItem: null,
  setLinkedBacklogItem: (id) => {
    link(id ? { kind: "backlog", id } : null);
    set({ linkedBacklogItem: id });
  },
  linkedProject: null,
  setLinkedProject: (slug) => {
    link(slug ? { kind: "project", id: slug } : null);
    set({ linkedProject: slug });
  },
  linkedPlan: null,
  setLinkedPlan: (plan) => {
    link(plan && { kind: "plan", id: plan.slug, ...(plan.version !== null && { version: plan.version }) });
    set({ linkedPlan: plan });
  },
  linkedDispatchPlan: null,
  setLinkedDispatchPlan: (plan) => {
    link(plan ? { kind: "dispatch", id: plan } : null);
    set({ linkedDispatchPlan: plan });
  },
  linkedProfile: null,
  setLinkedProfile: (name) => {
    link(name ? { kind: "profile", id: name } : null);
    set({ linkedProfile: name });
  },
  setOnline: (value) => set({ online: value }),
}));

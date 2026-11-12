import { create } from "zustand";

import type { NavTarget, ViewKey } from "@/nav/hubViews";
import { useNavStore, type ItemRef } from "./navStore";

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
  projectsOpen: boolean;
  plansOpen: boolean;
  appsOpen: boolean;
  profilesOpen: boolean;
  claudeUsageOpen: boolean;
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
  // Project to open, from a ?page=projects&project=<slug> link
  linkedProject: string | null;
  setLinkedProject: (slug: string | null) => void;
  // Plan to open, from a ?page=plans&plan=<slug>&version=<n> link or a project's Plans list
  linkedPlan: { slug: string; version: number | null } | null;
  setLinkedPlan: (plan: { slug: string; version: number | null } | null) => void;
  linkedDispatchPlan: string | null;
  setLinkedDispatchPlan: (plan: string | null) => void;
  linkedProfile: string | null;
  setLinkedProfile: (name: string | null) => void;
  linkItem: (ref: ItemRef) => void;
  openView: (target: NavTarget) => void;
  syncPage: () => void;
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
  toggleProjects: () => void;
  togglePlans: () => void;
  toggleApps: () => void;
  toggleProfiles: () => void;
  toggleClaudeUsage: () => void;
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
  projectsOpen: false,
  plansOpen: false,
  appsOpen: false,
  profilesOpen: false,
  claudeUsageOpen: false,
  moreOpen: false,
} as const;

type Flag = keyof typeof ALL_CLOSED;
type PageFlag = Exclude<Flag, "moreOpen">;

const HOME: NavTarget = { hub: "home" };

const PAGE_TARGET: Record<PageFlag, NavTarget> = {
  historyOpen: { hub: "chat", view: "list" },
  kbOpen: { hub: "library", view: "knowledge" },
  settingsOpen: HOME,
  auditOpen: { hub: "system", view: "activity" },
  financeOpen: HOME,
  journalOpen: { hub: "library", view: "journal" },
  homelabOpen: { hub: "system", view: "homelab" },
  gatewayOpen: { hub: "system", view: "integrations" },
  automationsOpen: { hub: "agents", view: "automations" },
  backlogOpen: { hub: "work", view: "board" },
  projectsOpen: { hub: "work", view: "projects" },
  plansOpen: { hub: "work", view: "plans" },
  appsOpen: { hub: "apps" },
  profilesOpen: { hub: "agents", view: "profiles" },
  claudeUsageOpen: { hub: "system", view: "usage" },
};

const VIEW_PAGE: Record<ViewKey, PageFlag | null> = {
  "home:home": null,
  "chat:list": "historyOpen",
  "chat:conversation": null,
  "work:projects": "projectsOpen",
  "work:board": "backlogOpen",
  "work:plans": "plansOpen",
  "agents:runs": "plansOpen",
  "agents:automations": "automationsOpen",
  "agents:profiles": "profilesOpen",
  "agents:mcp": "profilesOpen",
  "system:homelab": "homelabOpen",
  "system:activity": "auditOpen",
  "system:usage": "claudeUsageOpen",
  "system:integrations": "gatewayOpen",
  "library:knowledge": "kbOpen",
  "library:journal": "journalOpen",
  "apps:apps": "appsOpen",
};

function only(flag: Flag | null): Record<Flag, boolean> {
  const flags: Record<Flag, boolean> = { ...ALL_CLOSED };
  if (flag) flags[flag] = true;
  return flags;
}

function show(target: NavTarget, flag: Flag | null) {
  useNavStore.getState().go(target.hub, target.view);
  return only(flag);
}

function currentPage(): PageFlag | null {
  const nav = useNavStore.getState();
  return VIEW_PAGE[`${nav.hub}:${nav.view[nav.hub]}` as ViewKey];
}

function openPage(flag: PageFlag) {
  return currentPage() === flag ? only(flag) : show(PAGE_TARGET[flag], flag);
}

function closePage() {
  useNavStore.getState().clearItems();
  return show(HOME, null);
}

function link(ref: ItemRef | null) {
  if (ref) useNavStore.getState().openItem(ref);
}

export const useUiStore = create<UiState>((set, get) => {
  const toggle = (flag: PageFlag) => () => set(get()[flag] ? closePage() : openPage(flag));
  const setPage = (flag: PageFlag) => (v: boolean) => set(v ? openPage(flag) : closePage());
  return {
    ...ALL_CLOSED,
    online: false,
    privateRevealed: false,
    togglePrivate: () => set((s) => ({ privateRevealed: !s.privateRevealed })),
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
    linkItem: (ref) => {
      const s = get();
      if (ref.kind === "backlog") s.setLinkedBacklogItem(ref.id);
      else if (ref.kind === "project") s.setLinkedProject(ref.id);
      else if (ref.kind === "plan") s.setLinkedPlan({ slug: ref.id, version: ref.version ?? null });
      else if (ref.kind === "dispatch") s.setLinkedDispatchPlan(ref.id);
      else if (ref.kind === "profile") s.setLinkedProfile(ref.id);
    },
    openView: (target) => {
      useNavStore.getState().go(target.hub, target.view);
      set(only(currentPage()));
    },
    // The hub shell moves navStore without these adapters; this brings the booleans back in line so
    // a page's toggleX() opens rather than closes, and the old shell shows the right entry on return.
    syncPage: () => set(only(currentPage())),
    toggleHistory: toggle("historyOpen"),
    setHistoryOpen: setPage("historyOpen"),
    toggleKb: toggle("kbOpen"),
    setKbOpen: setPage("kbOpen"),
    toggleSettings: toggle("settingsOpen"),
    setSettingsOpen: setPage("settingsOpen"),
    toggleAudit: toggle("auditOpen"),
    toggleFinance: toggle("financeOpen"),
    toggleJournal: toggle("journalOpen"),
    toggleHomelab: toggle("homelabOpen"),
    toggleGateway: toggle("gatewayOpen"),
    toggleAutomations: toggle("automationsOpen"),
    toggleBacklog: toggle("backlogOpen"),
    toggleProjects: toggle("projectsOpen"),
    togglePlans: toggle("plansOpen"),
    toggleApps: toggle("appsOpen"),
    toggleProfiles: toggle("profilesOpen"),
    toggleClaudeUsage: toggle("claudeUsageOpen"),
    toggleMore: () => set(show(HOME, get().moreOpen ? null : "moreOpen")),
    setMoreOpen: (v) => set(show(HOME, v ? "moreOpen" : null)),
    closeAll: () => set(closePage()),
    setOnline: (v) => set({ online: v }),
  };
});

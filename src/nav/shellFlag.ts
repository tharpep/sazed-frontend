import { create } from "zustand";

import { useUiStore } from "@/store/uiStore";

export type ShellKind = "old" | "hubs";

const KEY = "sazed-shell";

function isShell(v: string | null): v is ShellKind {
  return v === "old" || v === "hubs";
}

function store(shell: ShellKind) {
  try {
    localStorage.setItem(KEY, shell);
  } catch {
    return;
  }
}

// Read before the first render so ?shell= never flashes the other layout. App clears the address
// bar afterwards, together with ?page=.
// The vitest suites load this through the stores with no window, hence the try around all of it.
function initialShell(): ShellKind {
  try {
    const asked = new URLSearchParams(window.location.search).get("shell");
    if (isShell(asked)) store(asked);
    return localStorage.getItem(KEY) === "hubs" ? "hubs" : "old";
  } catch {
    return "old";
  }
}

interface ShellState {
  shell: ShellKind;
  setShell: (shell: ShellKind) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  shell: initialShell(),
  setShell: (shell) => {
    store(shell);
    useUiStore.getState().syncPage();
    set({ shell, settingsOpen: false });
  },
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));

import { create } from "zustand";

export type ShellKind = "old" | "hubs";

const KEY = "sazed-shell";

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
    store("hubs");
    return "hubs";
  } catch {
    return "hubs";
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
    set({ shell, settingsOpen: false });
  },
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));

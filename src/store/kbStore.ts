import { create } from "zustand";
import { getKbStats, getKbSources, syncKb, deleteKbFile } from "../api/kb";
import type { KbStats, KbSource, KbSyncResult } from "../api/kb";

interface KbState {
  stats: KbStats | null;
  sources: KbSource[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncResult: KbSyncResult | null;
  load: () => Promise<void>;
  sync: (force?: boolean) => Promise<void>;
  removeFile: (driveFileId: string) => Promise<void>;
}

export const useKbStore = create<KbState>((set, get) => ({
  stats: null,
  sources: [],
  loading: false,
  syncing: false,
  error: null,
  lastSyncResult: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [statsRes, sourcesRes] = await Promise.all([getKbStats(), getKbSources()]);
      set({ stats: statsRes, sources: sourcesRes.sources, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  sync: async (force = false) => {
    set({ syncing: true, error: null, lastSyncResult: null });
    try {
      const result = await syncKb(force);
      set({ lastSyncResult: result, syncing: false });
      // Reload stats and sources after sync
      const [statsRes, sourcesRes] = await Promise.all([getKbStats(), getKbSources()]);
      set({ stats: statsRes, sources: sourcesRes.sources });
    } catch (e) {
      set({ error: String(e), syncing: false });
    }
  },

  removeFile: async (driveFileId) => {
    await deleteKbFile(driveFileId);
    set((s) => ({ sources: s.sources.filter((f) => f.file_id !== driveFileId) }));
    // Refresh stats
    try {
      const statsRes = await getKbStats();
      set({ stats: statsRes });
    } catch {
      // Non-critical
    }
  },
}));

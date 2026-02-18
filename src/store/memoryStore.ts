import { create } from "zustand";
import { listMemory, upsertMemory, deleteMemory } from "../api/memory";
import type { Fact, UpsertMemoryBody } from "../api/memory";

interface MemoryState {
  facts: Fact[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addFact: (body: UpsertMemoryBody) => Promise<void>;
  removeFact: (id: string) => Promise<void>;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  facts: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await listMemory();
      set({ facts: res.facts, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addFact: async (body) => {
    await upsertMemory(body);
    // Reload to get server-assigned id and updated_at
    const res = await listMemory();
    set({ facts: res.facts });
  },

  removeFact: async (id) => {
    await deleteMemory(id);
    set((s) => ({ facts: s.facts.filter((f) => f.id !== id) }));
  },
}));

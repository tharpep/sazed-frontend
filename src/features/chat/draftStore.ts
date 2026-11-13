import { create } from "zustand";

/** The key of a new chat's draft, before the conversation has an id. */
export const NEW_CHAT_DRAFT = "new";

interface DraftState {
  drafts: Record<string, string>;
  setDraft: (key: string, text: string) => void;
}

/** Unsent composer text per conversation, in memory, so it survives the Chat page remounting. */
export const useDraftStore = create<DraftState>((set) => ({
  drafts: {},
  setDraft: (key, text) =>
    set((s) => {
      const drafts = { ...s.drafts };
      if (text) drafts[key] = text;
      else delete drafts[key];
      return { drafts };
    }),
}));

import { useUiStore } from "@/store/uiStore";

export interface JumpPage {
  label: string;
  open: () => void;
}

const ui = () => useUiStore.getState();

/** Pages the ask bar can jump to with "/". The bar only shows on Home and in chat, where no page
 * flag is set, so each toggle opens its page. */
export const JUMP_PAGES: JumpPage[] = [
  { label: "Chats", open: () => ui().setHistoryOpen(true) },
  { label: "Homelab", open: () => ui().toggleHomelab() },
  { label: "Activity", open: () => ui().toggleAudit() },
  { label: "Gateway", open: () => ui().toggleGateway() },
  { label: "Automations", open: () => ui().toggleAutomations() },
  { label: "Backlog", open: () => ui().toggleBacklog() },
  { label: "Knowledge", open: () => ui().toggleKb() },
  { label: "Journal", open: () => ui().toggleJournal() },
  { label: "Settings", open: () => ui().setSettingsOpen(true) },
];

/** Pages starting with what follows the "/", else containing it. Null when the text isn't a jump. */
export function jumpMatches(text: string): JumpPage[] | null {
  if (!/^\/\S*$/.test(text)) return null;
  const q = text.slice(1).toLowerCase();
  const prefix = JUMP_PAGES.filter((p) => p.label.toLowerCase().startsWith(q));
  return prefix.length ? prefix : JUMP_PAGES.filter((p) => p.label.toLowerCase().includes(q));
}

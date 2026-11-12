import { createContext } from "react";

/** Where an inline DetailPanel mounts: the hub shell's page row. Undefined outside the hub shell,
 * where DetailPanel finds the row from <main> instead; null until the row has mounted. */
export const DetailSlotContext = createContext<HTMLElement | null | undefined>(undefined);

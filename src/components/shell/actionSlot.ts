import { createContext } from "react";

/** Where a view's primary action mounts from 640px up: HubTitleRow's action cell. Null on phones,
 * on Home and until the row has mounted; ToolsRow then keeps the action in its own row. */
export const ActionSlotContext = createContext<HTMLElement | null>(null);

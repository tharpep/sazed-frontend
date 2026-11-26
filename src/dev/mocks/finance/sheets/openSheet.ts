import { createContext, useContext } from "react";

import type { AccountId, DueId } from "../data";

export type SheetTarget =
  | { kind: "account"; id: AccountId }
  | { kind: "bill"; id: DueId }
  | { kind: "manual"; id?: AccountId }
  | { kind: "review" }
  | { kind: "capture" }
  | { kind: "alerts" };

export const OpenSheetContext = createContext<(target: SheetTarget) => void>(() => {});

export const useOpenSheet = () => useContext(OpenSheetContext);

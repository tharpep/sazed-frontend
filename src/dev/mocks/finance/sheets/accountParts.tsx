import { useState } from "react";

import { Segmented } from "@/components/system";
import type { Account, Figure } from "../data";
import { useMask } from "../Masked";

export const SHEET_BUTTON_CLASS = "h-11 text-meta md:h-8";

const FIGURE = /\d{1,3}(?:,\d{3})*\.\d{2}/g;

/** Masks money figures inside copy taken from emails and screenshots, such as "minimum 40.00". */
export function useMaskFigures() {
  const { masked } = useMask();
  return (text: string) => (masked ? text.replace(FIGURE, "•••") : text);
}

export const GROUP_LABEL: Record<Account["group"], string> = {
  cash: "Cash",
  inv: "Investments",
  card: "Credit card",
  loan: "Loan",
};

export function accountLabel(a: Account): string {
  return `${a.ending ? `Ending ${a.ending} · ` : ""}${GROUP_LABEL[a.group]}`;
}

export function isYours(f: Figure | null): boolean {
  return f?.source === "Your edit" || f?.source === "Your entry";
}

type Rule = "email" | "mine";

const RULES = [
  { value: "email" as const, label: "Until a newer email" },
  { value: "mine" as const, label: "Until I change it" },
];

export function RuleChoice({ label = "Keep my figure" }: { label?: string }) {
  const [rule, setRule] = useState<Rule>("email");
  return (
    <div className="flex flex-col gap-2">
      <span className="text-meta font-medium text-ink">{label}</span>
      <Segmented options={RULES} value={rule} onChange={setRule} label={label} className="grid grid-cols-2" />
    </div>
  );
}

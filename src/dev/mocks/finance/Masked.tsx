import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MaskState {
  masked: boolean;
  reveal: () => void;
  toggle: () => void;
}

const MaskContext = createContext<MaskState>({ masked: true, reveal: () => {}, toggle: () => {} });

export function MaskProvider({ children }: { children: ReactNode }) {
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) setMasked(true);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);

  return (
    <MaskContext.Provider value={{ masked, reveal: () => setMasked(false), toggle: () => setMasked((m) => !m) }}>
      {children}
    </MaskContext.Provider>
  );
}

export const useMask = () => useContext(MaskContext);

export function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A short inline figure inside copy, such as "was 15.49". */
export function useMoneyText() {
  const { masked } = useMask();
  return (value: number) => (masked ? "•••" : formatMoney(value));
}

interface AmountProps {
  value: number | null;
  sign?: boolean;
  approx?: boolean;
  none?: string;
  /** Inside a row that is itself a button, where a reveal button cannot nest. */
  plain?: boolean;
  className?: string;
}

export function Amount({ value, sign, approx, none = "no figure", plain, className }: AmountProps) {
  const { masked, reveal } = useMask();
  if (value == null) return <span className="text-muted">{none}</span>;
  if (masked && plain) {
    return <span className={cn("font-mono tracking-widest text-ink-2", className)}>•••••</span>;
  }
  if (masked) {
    return (
      <Button
        variant="ghost"
        size="xs"
        aria-label="Show amounts"
        onClick={(event) => {
          event.stopPropagation();
          reveal();
        }}
        className={cn("h-auto px-1 py-0 font-mono text-body font-normal tracking-widest text-ink-2", className)}
      >
        •••••
      </Button>
    );
  }
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {approx && "about "}
      {sign && value < 0 && "−"}
      {formatMoney(value)}
    </span>
  );
}

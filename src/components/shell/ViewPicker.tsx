import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SHEET_CLASS, SHEET_CLOSE_CLASS, SHEET_ROW_CLASS } from "./sheetClasses";

export interface PickerChoice {
  id: string;
  label: string;
  count?: number;
  hint?: string;
}

interface ViewPickerProps {
  title: string;
  prefix?: string;
  choices: readonly PickerChoice[];
  value: string;
  onChange: (id: string) => void;
}

/** A view's third-level choice (a filter, or Homelab's Map, List, Storage, Links) as one button
 * that opens a sheet of choices. */
export function ViewPicker({ title, prefix = "Show", choices, value, onChange }: ViewPickerProps) {
  const [open, setOpen] = useState(false);
  const current = choices.find((c) => c.id === value) ?? choices[0];
  // The name starts with the visible text (WCAG 2.5.3, label in name), then says what it changes.
  const visible = [prefix, current.label, current.count].filter((part) => part !== undefined).join(" ");

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${visible}, ${title}`}
        className="inline-flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-line bg-surface px-3 text-body text-ink transition-colors hover:bg-raised"
      >
        <span className="text-muted">{prefix}</span>
        {current.label}
        {current.count !== undefined && <span className="font-mono text-caption text-muted">{current.count}</span>}
        <ChevronDown className="size-3.5 text-muted" aria-hidden="true" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className={SHEET_CLASS}>
          <SheetHeader className="flex-row items-center border-b border-line py-1.5 pr-1.5 pl-[18px]">
            <SheetTitle className="flex-1">{title}</SheetTitle>
            <SheetClose className={SHEET_CLOSE_CLASS}>Close</SheetClose>
          </SheetHeader>
          <div className="flex flex-col gap-0.5 overflow-y-auto px-2.5 pt-1 pb-3.5">
            {choices.map((c) => {
              const on = c.id === current.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c.id)}
                  aria-current={on ? "true" : undefined}
                  className={cn(SHEET_ROW_CLASS, on && "bg-raised")}
                >
                  {on ? <Check className="size-5 justify-self-center text-ink-2" aria-hidden="true" /> : <span />}
                  <span>
                    <span className="block font-medium">{c.label}</span>
                    {c.hint ? (
                      <span className="block text-caption text-muted">{c.hint}</span>
                    ) : c.count !== undefined ? (
                      <span className="block font-mono text-caption text-muted">{c.count}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

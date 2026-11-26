import { useState } from "react";

import { Segmented } from "@/components/system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CaptureRead, FinanceState } from "../data";
import { Amount, useMoneyText } from "../Masked";
import { CheckRing } from "../parts";
import { SHEET_BUTTON_CLASS, useMaskFigures } from "./accountParts";
import { FinanceSheet } from "./FinanceSheet";

type Destination = "finance" | "notes";

const DESTINATIONS = [
  { value: "finance" as const, label: "Finance" },
  { value: "notes" as const, label: "Notes" },
];

const THUMB_BARS = ["w-3/4", "w-1/2", "w-2/3 bg-ink-2", "w-3/4", "w-1/2 bg-ink-2", "w-2/3"];

/** A stand-in for the shared screenshot. */
function Thumb() {
  return (
    <div className="flex h-16 w-12 shrink-0 flex-col gap-1 rounded-md border border-line bg-raised p-1.5" aria-hidden="true">
      {THUMB_BARS.map((w, i) => (
        <span key={i} className={cn("h-1 rounded-full bg-line", w)} />
      ))}
    </div>
  );
}

function ReadRow({ read }: { read: CaptureRead }) {
  const money = useMoneyText();
  const maskFigures = useMaskFigures();
  const doubtful = read.alternatives !== undefined;
  return (
    <li className="flex flex-col gap-0.5 px-3 py-2">
      <div className="flex items-baseline gap-2">
        {doubtful && <CheckRing />}
        <span className="min-w-0 flex-1 truncate text-body text-ink">{read.label}</span>
        <Amount value={read.value} none="—" className="text-body text-ink" />
      </div>
      <span className={cn("text-caption", doubtful ? "text-warn" : "text-muted")}>{maskFigures(read.confidence)}</span>
      {read.alternatives && (
        <div className="flex gap-2 pt-1.5">
          {read.alternatives.map((v) => (
            <Button key={v} variant="outline" className={cn(SHEET_BUTTON_CLASS, "flex-1 font-mono md:flex-none")}>
              {money(v)}
            </Button>
          ))}
          <Button variant="ghost" className={cn(SHEET_BUTTON_CLASS, "flex-1 md:flex-none")}>
            Type it
          </Button>
        </div>
      )}
    </li>
  );
}

interface CaptureSheetProps {
  state: FinanceState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaptureSheet({ state, open, onOpenChange }: CaptureSheetProps) {
  const [destination, setDestination] = useState<Destination>("finance");
  const { capture } = state;
  const read = capture.reads.filter((r) => r.value !== null).length;
  const doubtful = capture.reads.filter((r) => r.alternatives).length;
  const close = () => onOpenChange(false);

  return (
    <FinanceSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Read from your screenshot"
      subtitle={`${read} figures read${doubtful ? ` · ${doubtful} to check` : ""}`}
      footer={
        <>
          <Button className={SHEET_BUTTON_CLASS} onClick={close}>
            Save
          </Button>
          <Button variant="outline" className={SHEET_BUTTON_CLASS} onClick={close}>
            Discard
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3">
        <Thumb />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-meta text-ink-2">
            Shared {capture.sharedAt} · as of {capture.asOf}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-meta text-muted">File to</span>
            <Segmented options={DESTINATIONS} value={destination} onChange={setDestination} label="File to" />
          </div>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {capture.reads.map((r) => (
          <ReadRow key={r.label} read={r} />
        ))}
      </ul>
    </FinanceSheet>
  );
}

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ConfirmCardProps {
  tool: string;
  title: string;
  details: { label: string; value: string }[];
  expires_at?: string | null;
  onSend?: (text: string) => void;
}

type Answer = "yes" | "no";

export function ConfirmCard({ title, details, expires_at, onSend }: ConfirmCardProps) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const expired = Boolean(expires_at) && new Date(expires_at as string).getTime() <= Date.now();
  const disabled = answer !== null || expired || !onSend;

  function choose(value: Answer) {
    if (disabled) return;
    setAnswer(value);
    onSend?.(value);
  }

  return (
    <div className="rounded-xl border border-line p-4" role="group" aria-label="Approval needed">
      <div className="text-[18px] font-medium leading-6 text-ink">{title}</div>
      {details.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[15px] leading-5">
          {details.map((d, i) => (
            <div key={`${d.label}-${i}`} className="contents">
              <dt className="text-muted">{d.label}</dt>
              <dd className="break-words text-ink-2">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 flex gap-3">
        {(["yes", "no"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => choose(value)}
            className={cn(
              "min-h-[44px] flex-1 rounded-lg border px-4 text-[16px] font-medium transition-colors",
              value === "yes" ? "border-primary text-primary" : "border-line text-ink-2",
              answer === value && "bg-raised",
              disabled && answer !== value && "opacity-40"
            )}
          >
            {value === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
      {(answer || expired) && (
        <div className="mt-2 text-[14px] text-muted" role="status">
          {answer ? `You answered ${answer}.` : "Expired."}
        </div>
      )}
    </div>
  );
}

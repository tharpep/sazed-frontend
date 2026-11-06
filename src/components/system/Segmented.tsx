import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown after the label in monospace, e.g. how many items need you. Hidden when 0. */
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** The one control for switching between views or filters of the same content. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex rounded-md border border-line bg-surface p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="group rounded-[5px] px-2.5 py-1 text-meta text-ink-2 transition-colors hover:text-ink aria-pressed:bg-raised aria-pressed:font-medium aria-pressed:text-ink"
        >
          {o.label}
          {o.count ? (
            <span className="ml-1.5 font-mono text-caption font-normal text-muted group-aria-pressed:text-ink-2">
              {o.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

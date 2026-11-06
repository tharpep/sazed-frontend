import type { UsageLimits, UsageTiles } from "@/api/claudeUsage";
import { StatusPill, type Tone } from "@/components/system";
import { contextTone, percent, tokens } from "./format";

interface Tile {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  chip: string;
}

const CHIP: Record<Tone, string> = { ok: "Good", warn: "Warn", err: "Bad", neutral: "Pending", accent: "" };

function rateTone(rate: number | null, warnAt: number, badAt: number): Tone {
  if (rate === null) return "neutral";
  if (rate >= badAt) return "err";
  if (rate >= warnAt) return "warn";
  return "ok";
}

function build(t: UsageTiles, limits: UsageLimits): Tile[] {
  const { context_soft: soft, context_hard: hard } = limits;
  const tile = (label: string, value: string, note: string, tone: Tone): Tile => ({
    label,
    value,
    note,
    tone,
    chip: CHIP[tone],
  });
  return [
    tile(
      "Longest session peak",
      t.peak_context_max === null ? "—" : tokens(t.peak_context_max),
      `of ${tokens(hard)} hard limit`,
      t.peak_context_max === null ? "neutral" : contextTone(t.peak_context_max, soft, hard)
    ),
    tile(
      "Median peak",
      t.peak_context_median === null ? "—" : tokens(t.peak_context_median),
      `sessions of 5+ prompts, against ${tokens(soft)}`,
      t.peak_context_median === null ? "neutral" : contextTone(t.peak_context_median, soft, hard)
    ),
    tile("Over soft limit", String(t.sessions_over_soft), `sessions past ${tokens(soft)}`, t.sessions_over_soft > 0 ? "warn" : "ok"),
    tile("Over hard limit", String(t.sessions_over_hard), `sessions past ${tokens(hard)}`, t.sessions_over_hard > 0 ? "err" : "ok"),
    tile("Confusion rate", percent(t.confusion_rate), `of ${t.prompts} prompts`, rateTone(t.confusion_rate, 0.05, 0.1)),
    tile(
      "Writes through Bash",
      percent(t.bash_write_share, 0),
      `${t.bash_writes} Bash, ${t.edit_writes} Edit`,
      rateTone(t.bash_write_share, 0.3, 0.6)
    ),
    tile("Skills used", String(t.skills_used), "distinct skills", t.skills_used > 0 ? "ok" : "warn"),
    tile("Rework rate", "—", "coming soon", "neutral"),
  ];
}

export function Tiles({ tiles, limits }: { tiles: UsageTiles; limits: UsageLimits }) {
  return (
    <section aria-label="Targets" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {build(tiles, limits).map((t) => (
        <div key={t.label} className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3">
          <span className="text-meta text-muted">{t.label}</span>
          <span className="font-mono text-heading font-medium text-ink tabular-nums">{t.value}</span>
          <span className="text-caption text-muted">{t.note}</span>
          <span className="mt-1 self-start">
            <StatusPill tone={t.tone}>{t.chip}</StatusPill>
          </span>
        </div>
      ))}
    </section>
  );
}

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMemoryStore } from "@/store/memoryStore";
import type { Fact } from "@/api/memory";
import { errorText } from "@/api/homelab";
import { field } from "./format";

const FACT_TYPES = ["personal", "preference", "project", "instruction", "relationship"] as const;
type FactType = (typeof FACT_TYPES)[number];

function FactRow({ fact, onDelete }: { fact: Fact; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted">{fact.key}</span>
        <span className="text-sm break-words text-ink">{fact.value}</span>
      </div>
      {confirming ? (
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onDelete();
          }}
          onBlur={() => setConfirming(false)}
          autoFocus
          className="shrink-0 rounded-md px-2 py-1 text-xs text-destructive hover:bg-surface"
        >
          Delete?
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${fact.key}`}
          title={`${Math.round(fact.confidence * 100)}% confidence · ${fact.source ?? "unknown source"}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function AddFactForm() {
  const addFact = useMemoryStore((s) => s.addFact);
  const [factType, setFactType] = useState<FactType>("personal");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addFact({ fact_type: factType, key: key.trim(), value: value.trim(), confidence: 1.0 });
      setKey("");
      setValue("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex gap-2">
        <select
          value={factType}
          onChange={(e) => setFactType(e.target.value as FactType)}
          aria-label="Fact type"
          className={cn(field, "w-auto")}
        >
          {FACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key, e.g. coffee order" aria-label="Key" className={field} />
      </div>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" aria-label="Value" className={field} />
        <Button type="submit" size="sm" className="h-auto shrink-0 px-3" disabled={busy || !key.trim() || !value.trim()}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

// Sazed's structured memory: facts it injects into every conversation.
export function MemorySection() {
  const facts = useMemoryStore((s) => s.facts);
  const loading = useMemoryStore((s) => s.loading);
  const error = useMemoryStore((s) => s.error);
  const load = useMemoryStore((s) => s.load);
  const removeFact = useMemoryStore((s) => s.removeFact);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const known = new Set<string>(FACT_TYPES);
  const groups = [
    ...FACT_TYPES.map((t) => [t, facts.filter((f) => f.fact_type === t)] as const),
    ["other", facts.filter((f) => !known.has(f.fact_type))] as const,
  ].filter(([, group]) => group.length > 0);

  async function remove(id: string) {
    setDeleteError(null);
    try {
      await removeFact(id);
    } catch (err) {
      setDeleteError(errorText(err));
    }
  }

  return (
    <section aria-label="Memory" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-medium text-ink">Memory</h2>
        <span className="text-xs text-muted">{facts.length} facts Sazed keeps in every chat</span>
      </div>

      {(error || deleteError) && <p className="text-sm text-destructive">{errorText(error ?? deleteError)}</p>}
      {loading && facts.length === 0 && <p className="text-sm text-muted">Loading…</p>}
      {!loading && !error && facts.length === 0 && (
        <p className="px-1 text-sm text-muted">No facts yet. Sazed adds them as you chat, or add one below.</p>
      )}

      {groups.map(([type, group]) => (
        <div key={type} className="flex flex-col gap-1">
          <h3 className="px-1 text-xs tracking-wide text-muted uppercase">{type}</h3>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {group.map((f) => (
              <FactRow key={f.id} fact={f} onDelete={() => remove(f.id)} />
            ))}
          </ul>
        </div>
      ))}

      <AddFactForm />
    </section>
  );
}

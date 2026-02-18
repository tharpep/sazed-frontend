import { useEffect, useState } from "react";
import { useMemoryStore } from "../../store/memoryStore";
import type { Fact } from "../../api/memory";
import styles from "./MemoryPanel.module.css";

type FactType = "personal" | "preference" | "project" | "instruction" | "relationship";

const FACT_TYPES: FactType[] = ["personal", "preference", "project", "instruction", "relationship"];

const TYPE_CLASS: Record<FactType, string> = {
  personal: styles.typeBlue,
  preference: styles.typeAmber,
  project: styles.typeGreen,
  instruction: styles.typePurple,
  relationship: styles.typeRed,
};

function FactRow({ fact, onDelete }: { fact: Fact; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onDelete();
  }

  const confidencePct = Math.round(fact.confidence * 100);

  return (
    <div className={styles.fact}>
      <div className={styles.factKey}>{fact.key}</div>
      <div className={styles.factValue}>{fact.value}</div>
      <div className={styles.factMeta}>
        <span
          className={styles.confidence}
          title={`Confidence: ${confidencePct}% · Source: ${fact.source ?? "unknown"}`}
        >
          {confidencePct}%
        </span>
        <button
          type="button"
          className={`${styles.deleteBtn} ${confirming ? styles.confirm : ""}`}
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          title={confirming ? "Click again to confirm" : "Delete fact"}
        >
          {confirming ? "confirm?" : "×"}
        </button>
      </div>
    </div>
  );
}

function AddFactForm({ onAdd }: { onAdd: (type: FactType, key: string, value: string) => Promise<void> }) {
  const [factType, setFactType] = useState<FactType>("personal");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(factType, key.trim(), value.trim());
      setKey("");
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <div className={styles.addRow}>
        <select
          className={styles.select}
          value={factType}
          onChange={(e) => setFactType(e.target.value as FactType)}
        >
          {FACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className={styles.input}
          placeholder="key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <div className={styles.addRow}>
        <input
          className={`${styles.input} ${styles.valueInput}`}
          placeholder="value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="submit"
          className={styles.addBtn}
          disabled={submitting || !key.trim() || !value.trim()}
        >
          {submitting ? "…" : "Add"}
        </button>
      </div>
    </form>
  );
}

export function MemoryPanel() {
  const facts = useMemoryStore((s) => s.facts);
  const loading = useMemoryStore((s) => s.loading);
  const error = useMemoryStore((s) => s.error);
  const load = useMemoryStore((s) => s.load);
  const addFact = useMemoryStore((s) => s.addFact);
  const removeFact = useMemoryStore((s) => s.removeFact);

  useEffect(() => {
    load();
  }, [load]);

  // Group facts by type, preserving FACT_TYPES order
  const grouped = FACT_TYPES.reduce<Record<string, Fact[]>>((acc, type) => {
    const group = facts.filter((f) => f.fact_type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  // Any fact_type not in our known list
  const other = facts.filter((f) => !FACT_TYPES.includes(f.fact_type as FactType));
  if (other.length > 0) grouped["other"] = other;

  async function handleAdd(factType: FactType, key: string, value: string) {
    await addFact({ fact_type: factType, key, value, confidence: 1.0 });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Memory</h3>
        <span className={styles.count}>{facts.length} facts</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && facts.length === 0 && (
          <div className={styles.empty}>No facts stored yet.</div>
        )}
        {Object.entries(grouped).map(([type, group]) => (
          <div key={type} className={styles.group}>
            <div
              className={`${styles.groupLabel} ${TYPE_CLASS[type as FactType] ?? styles.typeBlue}`}
            >
              {type}
            </div>
            {group.map((fact) => (
              <FactRow
                key={fact.id}
                fact={fact}
                onDelete={() => removeFact(fact.id)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className={styles.addSection}>
        <div className={styles.addTitle}>Add fact</div>
        <AddFactForm onAdd={handleAdd} />
      </div>
    </div>
  );
}

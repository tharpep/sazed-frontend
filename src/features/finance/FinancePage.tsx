import { useEffect, useState } from "react";
import type { Subscription, BudgetItem, IncomeSource, MonthlySummary } from "../../api/finance";
import {
  getSummary,
  createSubscription,
  updateSubscription,
  upsertBudget,
  deleteBudget,
  createIncome,
} from "../../api/finance";
import styles from "./FinancePage.module.css";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function freqLabel(f: string): string {
  return { monthly: "/mo", annual: "/yr", weekly: "/wk", biweekly: "/2wk" }[f] ?? "";
}

// ── Summary ────────────────────────────────────────────────────────────────

function SummaryBar({ summary }: { summary: MonthlySummary }) {
  const netClass =
    summary.net_estimated >= 0 ? styles.summaryValuePositive : styles.summaryValueNegative;
  return (
    <div>
      <div className={styles.heading}>monthly overview</div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>income</span>
          <span className={styles.summaryValue}>${fmt(summary.monthly_income)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>subscriptions</span>
          <span className={styles.summaryValue}>${fmt(summary.monthly_subscriptions)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>net</span>
          <span className={netClass}>${fmt(summary.net_estimated)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Subscriptions ──────────────────────────────────────────────────────────

function SubscriptionsSection({
  subs,
  onAdd,
  onDeactivate,
}: {
  subs: Subscription[];
  onAdd: (s: Subscription) => void;
  onDeactivate: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState("monthly");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name || !amount || !category) return;
    setSaving(true);
    try {
      const created = await createSubscription({
        name,
        amount: parseFloat(amount),
        frequency: freq as Subscription["frequency"],
        category,
        notes: null,
      });
      onAdd(created);
      setName("");
      setAmount("");
      setCategory("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    await updateSubscription(id, { active: false });
    onDeactivate(id);
  }

  return (
    <div>
      <div className={styles.heading}>subscriptions</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th />
            <th>name</th>
            <th>amount</th>
            <th>category</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id}>
              <td><span className={styles.dotActive} /></td>
              <td>{s.name}</td>
              <td className={styles.mono}>${fmt(s.amount)}{freqLabel(s.frequency)}</td>
              <td className={styles.secondary}>{s.category}</td>
              <td>
                <button className={styles.deleteBtn} onClick={() => handleDeactivate(s.id)} title="Deactivate">
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr className={styles.addRow}>
            <td colSpan={5}>
              <div className={styles.addForm}>
                <input
                  className={`${styles.input} ${styles.inputLg}`}
                  placeholder="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className={`${styles.input} ${styles.inputSm}`}
                  placeholder="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <select className={styles.select} value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="monthly">monthly</option>
                  <option value="annual">annual</option>
                  <option value="weekly">weekly</option>
                  <option value="biweekly">biweekly</option>
                </select>
                <input
                  className={`${styles.input} ${styles.inputMd}`}
                  placeholder="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <button className={styles.addBtn} onClick={handleAdd} disabled={saving}>
                  {saving ? "adding…" : "add"}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────────

function BudgetSection({
  items,
  onUpsert,
  onDelete,
}: {
  items: BudgetItem[];
  onUpsert: (item: BudgetItem) => void;
  onDelete: (category: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);

  async function commitEdit(category: string) {
    const val = parseFloat(editVal);
    if (isNaN(val)) { setEditing(null); return; }
    const updated = await upsertBudget(category, val);
    onUpsert(updated);
    setEditing(null);
  }

  async function handleAdd() {
    if (!newCat || !newLimit) return;
    setSaving(true);
    try {
      const created = await upsertBudget(newCat, parseFloat(newLimit));
      onUpsert(created);
      setNewCat("");
      setNewLimit("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: string) {
    await deleteBudget(category);
    onDelete(category);
  }

  return (
    <div>
      <div className={styles.heading}>budget limits</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>category</th>
            <th>monthly limit</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.category}
              className={styles.budgetRow}
              onClick={() => { setEditing(item.category); setEditVal(String(item.monthly_limit)); }}
            >
              <td>{item.category}</td>
              <td className={styles.mono}>
                {editing === item.category ? (
                  <input
                    className={styles.limitInput}
                    value={editVal}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={() => commitEdit(item.category)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(item.category);
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                ) : (
                  `$${fmt(item.monthly_limit)}/mo`
                )}
              </td>
              <td>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.category); }}
                  title="Remove"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr className={styles.addRow}>
            <td colSpan={3}>
              <div className={styles.addForm}>
                <input
                  className={`${styles.input} ${styles.inputMd}`}
                  placeholder="category"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <input
                  className={`${styles.input} ${styles.inputSm}`}
                  placeholder="limit"
                  type="number"
                  min="0"
                  step="1"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
                <button className={styles.addBtn} onClick={handleAdd} disabled={saving}>
                  {saving ? "adding…" : "add"}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Income ─────────────────────────────────────────────────────────────────

function IncomeSection({
  sources,
  onAdd,
}: {
  sources: IncomeSource[];
  onAdd: (s: IncomeSource) => void;
}) {
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState("monthly");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!source || !amount) return;
    setSaving(true);
    try {
      const created = await createIncome({
        source,
        amount: parseFloat(amount),
        frequency: freq as IncomeSource["frequency"],
      });
      onAdd(created);
      setSource("");
      setAmount("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className={styles.heading}>income</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>source</th>
            <th>amount</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <td>{s.source}</td>
              <td className={styles.mono}>${fmt(s.amount)}{freqLabel(s.frequency)}</td>
            </tr>
          ))}
          <tr className={styles.addRow}>
            <td colSpan={2}>
              <div className={styles.addForm}>
                <input
                  className={`${styles.input} ${styles.inputLg}`}
                  placeholder="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                <input
                  className={`${styles.input} ${styles.inputSm}`}
                  placeholder="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <select className={styles.select} value={freq} onChange={(e) => setFreq(e.target.value)}>
                  <option value="monthly">monthly</option>
                  <option value="annual">annual</option>
                  <option value="weekly">weekly</option>
                  <option value="biweekly">biweekly</option>
                </select>
                <button className={styles.addBtn} onClick={handleAdd} disabled={saving}>
                  {saving ? "adding…" : "add"}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function FinancePage() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [income, setIncome] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then((s) => {
        setSummary(s);
        setSubs(s.subscriptions);
        setBudget(s.budget);
        setIncome(s.income_sources);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function refreshSummary(
    nextSubs: Subscription[],
    nextIncome: IncomeSource[],
  ) {
    const toMonthly = (amount: number, frequency: string) =>
      ({ monthly: amount, annual: amount / 12, weekly: (amount * 52) / 12, biweekly: (amount * 26) / 12 }[frequency] ?? amount);
    const monthlyIncome = nextIncome.reduce((acc, s) => acc + toMonthly(s.amount, s.frequency), 0);
    const monthlySubs = nextSubs.reduce((acc, s) => acc + toMonthly(s.amount, s.frequency), 0);
    setSummary((prev) =>
      prev
        ? {
            ...prev,
            monthly_income: Math.round(monthlyIncome * 100) / 100,
            monthly_subscriptions: Math.round(monthlySubs * 100) / 100,
            net_estimated: Math.round((monthlyIncome - monthlySubs) * 100) / 100,
          }
        : prev
    );
  }

  function handleAddSub(s: Subscription) {
    const next = [...subs, s];
    setSubs(next);
    refreshSummary(next, income);
  }

  function handleDeactivateSub(id: string) {
    const next = subs.filter((s) => s.id !== id);
    setSubs(next);
    refreshSummary(next, income);
  }

  function handleUpsertBudget(item: BudgetItem) {
    setBudget((prev) => {
      const idx = prev.findIndex((b) => b.category === item.category);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item].sort((a, b) => a.category.localeCompare(b.category));
    });
  }

  function handleDeleteBudget(category: string) {
    setBudget((prev) => prev.filter((b) => b.category !== category));
  }

  function handleAddIncome(s: IncomeSource) {
    const next = [...income, s];
    setIncome(next);
    refreshSummary(subs, next);
  }

  return (
    <div className={styles.page}>
      {loading && <p className={styles.state}>Loading…</p>}
      {error && <p className={styles.stateError}>{error}</p>}
      {!loading && !error && summary && (
        <>
          <SummaryBar summary={summary} />
          <SubscriptionsSection
            subs={subs}
            onAdd={handleAddSub}
            onDeactivate={handleDeactivateSub}
          />
          <BudgetSection
            items={budget}
            onUpsert={handleUpsertBudget}
            onDelete={handleDeleteBudget}
          />
          <IncomeSection sources={income} onAdd={handleAddIncome} />
        </>
      )}
    </div>
  );
}

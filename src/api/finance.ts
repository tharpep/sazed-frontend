import { apiFetch } from "./client";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly" | "biweekly";
  category: string;
  active: boolean;
  notes: string | null;
  created_at: string;
}

export interface BudgetItem {
  category: string;
  monthly_limit: number;
}

export interface IncomeSource {
  id: string;
  source: string;
  amount: number;
  frequency: "monthly" | "annual" | "weekly" | "biweekly";
  active: boolean;
}

export interface MonthlySummary {
  monthly_income: number;
  monthly_subscriptions: number;
  net_estimated: number;
  income_sources: IncomeSource[];
  subscriptions: Subscription[];
  budget: BudgetItem[];
}

export async function getSummary(): Promise<MonthlySummary> {
  return apiFetch("/finance/summary") as Promise<MonthlySummary>;
}

export async function getSubscriptions(all = false): Promise<Subscription[]> {
  return apiFetch(`/finance/subscriptions${all ? "?all=true" : ""}`) as Promise<Subscription[]>;
}

export async function createSubscription(
  body: Omit<Subscription, "id" | "active" | "created_at">
): Promise<Subscription> {
  return apiFetch("/finance/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<Subscription>;
}

export async function updateSubscription(
  id: string,
  body: Partial<Omit<Subscription, "id" | "created_at">>
): Promise<Subscription> {
  return apiFetch(`/finance/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<Subscription>;
}

export async function getBudget(): Promise<BudgetItem[]> {
  return apiFetch("/finance/budget") as Promise<BudgetItem[]>;
}

export async function upsertBudget(category: string, monthly_limit: number): Promise<BudgetItem> {
  return apiFetch(`/finance/budget/${encodeURIComponent(category)}`, {
    method: "PUT",
    body: JSON.stringify({ monthly_limit }),
  }) as Promise<BudgetItem>;
}

export async function deleteBudget(category: string): Promise<void> {
  await apiFetch(`/finance/budget/${encodeURIComponent(category)}`, { method: "DELETE" });
}

export async function getIncome(): Promise<IncomeSource[]> {
  return apiFetch("/finance/income") as Promise<IncomeSource[]>;
}

export async function createIncome(
  body: Omit<IncomeSource, "id" | "active">
): Promise<IncomeSource> {
  return apiFetch("/finance/income", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<IncomeSource>;
}

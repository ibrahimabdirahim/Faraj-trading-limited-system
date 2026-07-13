import { prisma } from "./db";

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
export function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export type BranchMetric = {
  id: string; name: string; manager: string; color: string;
  reportedToday: boolean; status: "approved" | "pending" | "missing";
  cashCdf: number; cashUsd: number; expCdf: number; expUsd: number;
  profitCdf: number;
  lastReport: Date | null;
  weeklyValUsd: number | null; monthlyValUsd: number | null;
  score: number; rank: number; health: string;
};

// Sum expenses on a report by currency
function sumExpenses(expenses: { amount: number; currency: string }[]) {
  let cdf = 0, usd = 0;
  for (const e of expenses) { if (e.currency === "USD") usd += e.amount; else cdf += e.amount; }
  return { cdf, usd };
}

export async function getBranchMetrics(): Promise<BranchMetric[]> {
  const today = startOfToday();
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" } });

  const metrics: Omit<BranchMetric, "rank" | "score" | "health">[] = [];
  for (const b of branches) {
    const report = await prisma.dailyReport.findUnique({ where: { branchId_date: { branchId: b.id, date: today } }, include: { expenses: true } });
    const last = await prisma.dailyReport.findFirst({ where: { branchId: b.id }, orderBy: { date: "desc" } });
    const weekly = await prisma.inventoryValuation.findFirst({ where: { branchId: b.id, periodType: "weekly" }, orderBy: { periodEnding: "desc" } });
    const monthly = await prisma.inventoryValuation.findFirst({ where: { branchId: b.id, periodType: "monthly" }, orderBy: { periodEnding: "desc" } });
    const exp = report ? sumExpenses(report.expenses) : { cdf: 0, usd: 0 };
    metrics.push({
      id: b.id, name: b.name, manager: b.manager, color: b.color,
      reportedToday: !!report,
      status: report ? (report.status === "approved" ? "approved" : "pending") : "missing",
      cashCdf: report?.cashCdf ?? 0, cashUsd: report?.cashUsd ?? 0,
      expCdf: exp.cdf, expUsd: exp.usd,
      profitCdf: report ? Math.max(0, (report.cashCdf) - exp.cdf) : 0,
      lastReport: last?.date ?? null,
      weeklyValUsd: weekly?.valueUsd ?? null, monthlyValUsd: monthly?.valueUsd ?? null,
    });
  }

  const maxCash = Math.max(1, ...metrics.map((m) => m.cashCdf));
  const scored: BranchMetric[] = metrics.map((m) => {
    let score = 40;
    if (m.reportedToday) score += 35;
    else if (m.lastReport) {
      const days = Math.floor((Date.now() - m.lastReport.getTime()) / 86400000);
      score += Math.max(-20, 15 - days * 8);
    } else score -= 15;
    score += Math.round((m.cashCdf / maxCash) * 25);
    score = Math.max(0, Math.min(100, score));
    const health = score >= 85 ? "var(--good)" : score >= 65 ? "var(--warn)" : "var(--crit)";
    return { ...m, score, health, rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score || b.cashCdf - a.cashCdf);
  scored.forEach((m, i) => (m.rank = i + 1));
  return scored;
}

export async function getDashboard() {
  const today = startOfToday();
  const branchMetrics = await getBranchMetrics();
  const submitted = branchMetrics.filter((b) => b.reportedToday).length;

  const totals = branchMetrics.reduce(
    (a, b) => ({ cashCdf: a.cashCdf + b.cashCdf, cashUsd: a.cashUsd + b.cashUsd, expCdf: a.expCdf + b.expCdf, expUsd: a.expUsd + b.expUsd, profitCdf: a.profitCdf + b.profitCdf }),
    { cashCdf: 0, cashUsd: 0, expCdf: 0, expUsd: 0, profitCdf: 0 }
  );

  // 7-day cashflow
  const days: { label: string; cdf: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const reps = await prisma.dailyReport.findMany({ where: { date: d } });
    days.push({ label: d.toLocaleDateString("en-GB", { weekday: "short" }), cdf: reps.reduce((a, r) => a + r.cashCdf, 0) });
  }

  // Inventory value (sum of latest per-branch monthly valuations + warehouse)
  const invRows = await prisma.inventoryValuation.findMany({ orderBy: { periodEnding: "desc" } });
  const seen = new Set<string>();
  let invUsd = 0;
  for (const r of invRows) { const key = (r.branchId ?? "wh") + r.periodType; if (r.periodType === "monthly" && !seen.has(r.branchId ?? "wh")) { seen.add(r.branchId ?? "wh"); invUsd += r.valueUsd; } }

  // Expense breakdown by description keyword (today)
  const todayExp = await prisma.expense.findMany({ where: { report: { date: today } } });
  const expByCat: Record<string, number> = {};
  for (const e of todayExp) { const k = e.description.split(" ")[0] || "Other"; expByCat[k] = (expByCat[k] || 0) + (e.currency === "USD" ? e.amount * 2850 : e.amount); }

  const activity = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } });

  return { branchMetrics, submitted, totalBranches: branchMetrics.length, totals, days, invUsd, expByCat, activity };
}

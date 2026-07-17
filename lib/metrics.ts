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
    const report = await prisma.dailyReport.findUnique({ where: { branchId_date: { branchId: b.id, date: today }, deletedAt: null }, include: { expenses: true } });
    const last = await prisma.dailyReport.findFirst({ where: { branchId: b.id, deletedAt: null }, orderBy: { date: "desc" } });
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

// Today-only dashboard data. Deliberately does not compute weekly/monthly/yearly rollups —
// the dashboard is a same-day operations view; historical analytics belong in the Reports
// module (see getBranchComparison/getInventoryTrend below, which stay range-parameterized
// for that future use, and are called with today's range only from the dashboard).
export async function getDashboard() {
  const today = startOfToday();
  const branchMetrics = await getBranchMetrics();
  const submitted = branchMetrics.filter((b) => b.reportedToday).length;

  const totals = branchMetrics.reduce(
    (a, b) => ({ cashCdf: a.cashCdf + b.cashCdf, cashUsd: a.cashUsd + b.cashUsd, expCdf: a.expCdf + b.expCdf, expUsd: a.expUsd + b.expUsd, profitCdf: a.profitCdf + b.profitCdf }),
    { cashCdf: 0, cashUsd: 0, expCdf: 0, expUsd: 0, profitCdf: 0 }
  );

  const activity = await prisma.auditLog.findMany({ where: { createdAt: { gte: today } }, orderBy: { createdAt: "desc" }, take: 30, include: { user: true } });

  return { branchMetrics, submitted, totalBranches: branchMetrics.length, totals, activity };
}

export type DateRangePreset = "today" | "week" | "month" | "custom";

export function resolveDateRange(preset: DateRangePreset, customFrom?: string, customTo?: string): { from: Date; to: Date; label: string } {
  const today = startOfToday();
  if (preset === "week") return { from: addDays(today, -6), to: addDays(today, 1), label: "Last 7 days" };
  if (preset === "month") return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: addDays(today, 1), label: today.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  if (preset === "custom" && customFrom && customTo) {
    const from = dayStart(new Date(customFrom + "T00:00:00"));
    const to = addDays(dayStart(new Date(customTo + "T00:00:00")), 1);
    return { from, to, label: `${customFrom} → ${customTo}` };
  }
  return { from: today, to: addDays(today, 1), label: "Today" };
}

export type ComparisonBadge = "best" | "attention" | "improved";

export type BranchComparisonRow = {
  id: string; name: string; manager: string; color: string;
  rank: number;
  revenueCdf: number; revenueUsd: number;
  expenseCdf: number; expenseUsd: number;
  profitCdf: number;
  productsReceivedQty: number; productsReceivedCount: number;
  lastReportStatus: "approved" | "pending" | "missing";
  reportCreatedAt: Date | null;
  trendPct: number;
  progressPct: number; // relative to the top branch, for progress bars
  performanceScore: number; // 0-100 — reported-on-time + relative revenue, for the ranking panel
  badges: ComparisonBadge[];
};

async function branchRevenueBetween(branchId: string, from: Date, to: Date) {
  const reports = await prisma.dailyReport.findMany({ where: { branchId, date: { gte: from, lt: to }, deletedAt: null }, include: { expenses: true } });
  const revenueCdf = reports.reduce((a, r) => a + r.cashCdf, 0);
  const revenueUsd = reports.reduce((a, r) => a + r.cashUsd, 0);
  let expenseCdf = 0, expenseUsd = 0;
  for (const r of reports) for (const e of r.expenses) { if (e.currency === "USD") expenseUsd += e.amount; else expenseCdf += e.amount; }
  return { revenueCdf, revenueUsd, expenseCdf, expenseUsd };
}

// Ranked branch performance for a date range — the dashboard always calls this with
// today's range only (trend is automatically "vs the same-length period immediately
// before", i.e. vs yesterday when the range is one day).
export async function getBranchComparison(from: Date, to: Date): Promise<BranchComparisonRow[]> {
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" } });
  const periodLenMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodLenMs);

  const rows: BranchComparisonRow[] = [];
  for (const b of branches) {
    const cur = await branchRevenueBetween(b.id, from, to);
    const prev = await branchRevenueBetween(b.id, prevFrom, from);
    const receipts = await prisma.stockReceipt.findMany({ where: { branchId: b.id, date: { gte: from, lt: to } } });
    const report = await prisma.dailyReport.findFirst({ where: { branchId: b.id, date: { gte: from, lt: to }, deletedAt: null }, orderBy: { date: "desc" } });

    const trendPct = prev.revenueCdf ? ((cur.revenueCdf - prev.revenueCdf) / prev.revenueCdf) * 100 : (cur.revenueCdf > 0 ? 100 : 0);

    rows.push({
      id: b.id, name: b.name, manager: b.manager, color: b.color, rank: 0,
      revenueCdf: cur.revenueCdf, revenueUsd: cur.revenueUsd,
      expenseCdf: cur.expenseCdf, expenseUsd: cur.expenseUsd,
      profitCdf: Math.max(0, cur.revenueCdf - cur.expenseCdf),
      productsReceivedQty: receipts.reduce((a, r) => a + r.quantity, 0),
      productsReceivedCount: new Set(receipts.map((r) => r.productId)).size,
      lastReportStatus: report ? (report.status === "approved" ? "approved" : "pending") : "missing",
      reportCreatedAt: report?.createdAt ?? null,
      trendPct, progressPct: 0, performanceScore: 0, badges: [],
    });
  }

  rows.sort((a, b) => b.revenueCdf - a.revenueCdf);
  rows.forEach((r, i) => (r.rank = i + 1));
  const topRevenue = Math.max(1, rows[0]?.revenueCdf ?? 0);
  rows.forEach((r) => {
    r.progressPct = Math.max(2, Math.round((r.revenueCdf / topRevenue) * 100));
    let score = r.lastReportStatus === "missing" ? 30 : r.lastReportStatus === "pending" ? 55 : 70;
    score += Math.round((r.revenueCdf / topRevenue) * 30);
    r.performanceScore = Math.max(0, Math.min(100, score));
  });

  if (rows.length) {
    if (rows[0].revenueCdf > 0) rows[0].badges.push("best");
    const mostImproved = [...rows].sort((a, b) => b.trendPct - a.trendPct)[0];
    if (mostImproved && mostImproved.trendPct > 0 && mostImproved.id !== rows[0].id) mostImproved.badges.push("improved");
    const worst = [...rows].sort((a, b) => a.revenueCdf - b.revenueCdf)[0];
    if (worst && (worst.lastReportStatus === "missing" || worst.trendPct < 0) && worst.id !== rows[0].id) worst.badges.push("attention");
  }

  return rows;
}

export type ProductsReceivedToday = { totalQty: number; productCount: number; deliveries: number };

export async function getProductsReceivedToday(): Promise<ProductsReceivedToday> {
  const today = startOfToday();
  const receipts = await prisma.stockReceipt.findMany({
    where: { date: { gte: today, lt: addDays(today, 1) }, OR: [{ reportId: null }, { report: { deletedAt: null } }] },
  });
  return {
    totalQty: receipts.reduce((a, r) => a + r.quantity, 0),
    productCount: new Set(receipts.map((r) => r.productId)).size,
    deliveries: new Set(receipts.map((r) => r.reportId ?? r.id)).size,
  };
}

export async function getTodayExpenseCount(): Promise<number> {
  const today = startOfToday();
  return prisma.expense.count({ where: { report: { date: today, deletedAt: null } } });
}

// All-time cash collected across every approved (locked) report on record — the "Overall"
// half of the dashboard's cash card. Pending/missing reports don't count as collected yet,
// and soft-deleted reports are excluded like everywhere else.
export async function getOverallCashCollected(): Promise<{ cashCdf: number; cashUsd: number }> {
  const agg = await prisma.dailyReport.aggregate({
    where: { status: "approved", deletedAt: null },
    _sum: { cashCdf: true, cashUsd: true },
  });
  return { cashCdf: agg._sum.cashCdf ?? 0, cashUsd: agg._sum.cashUsd ?? 0 };
}

// Total inventory value (USD, summed across branches + warehouse) at each valuation date on
// record, oldest to newest — for the dashboard's inventory trend chart.
export async function getInventoryTrend(): Promise<{ label: string; usd: number }[]> {
  const rows = await prisma.inventoryValuation.findMany({ orderBy: { periodEnding: "asc" } });
  const byDate = new Map<string, number>();
  for (const r of rows) {
    const key = r.periodEnding.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + r.valueUsd);
  }
  return [...byDate.entries()].slice(-8).map(([date, usd]) => ({ label: fmtShortDate(date), usd }));
}

function fmtShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export type BranchDetail = {
  id: string; name: string; manager: string; color: string; notes: string;
  status: "approved" | "pending" | "missing";
  revenueCdf: number; revenueUsd: number;
  expenseCdf: number; expenseUsd: number;
  profitCdf: number;
  productsReceivedQty: number;
  inventoryWeeklyUsd: number | null;
  inventoryMonthlyUsd: number | null;
  weekly: { revenueCdf: number; expenseCdf: number; profitCdf: number };
  monthly: { revenueCdf: number; expenseCdf: number; profitCdf: number };
  lastReportAt: Date | null;
  history: { label: string; revenueCdf: number }[];
  activity: { id: string; action: string; entity: string; detail: string; userName: string; createdAt: Date }[];
};

// Full drill-down for one branch, fetched on demand when the admin opens a branch's detail
// drawer from the dashboard's compact ranking cards (deliberately not prefetched for every
// branch — the ranking cards only need 4 numbers each, this is a lot more work per branch).
export async function getBranchDetail(branchId: string): Promise<BranchDetail | null> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return null;

  const today = startOfToday();
  const todayReport = await prisma.dailyReport.findUnique({ where: { branchId_date: { branchId, date: today }, deletedAt: null }, include: { expenses: true } });
  const lastReport = await prisma.dailyReport.findFirst({ where: { branchId, deletedAt: null }, orderBy: { date: "desc" } });
  const exp = todayReport ? sumExpenses(todayReport.expenses) : { cdf: 0, usd: 0 };

  const receipts = await prisma.stockReceipt.findMany({ where: { branchId, date: { gte: today, lt: addDays(today, 1) } } });

  const weeklyRange = await branchRevenueBetween(branchId, addDays(today, -6), addDays(today, 1));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyRange = await branchRevenueBetween(branchId, monthStart, addDays(today, 1));

  const weeklyVal = await prisma.inventoryValuation.findFirst({ where: { branchId, periodType: "weekly" }, orderBy: { periodEnding: "desc" } });
  const monthlyVal = await prisma.inventoryValuation.findFirst({ where: { branchId, periodType: "monthly" }, orderBy: { periodEnding: "desc" } });

  const history: { label: string; revenueCdf: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const r = await branchRevenueBetween(branchId, d, addDays(d, 1));
    history.push({ label: d.toLocaleDateString("en-GB", { weekday: "short" }), revenueCdf: r.revenueCdf });
  }

  const activityRows = await prisma.auditLog.findMany({ where: { branchName: branch.name }, orderBy: { createdAt: "desc" }, take: 8, include: { user: true } });

  return {
    id: branch.id, name: branch.name, manager: branch.manager, color: branch.color, notes: branch.notes,
    status: todayReport ? (todayReport.status === "approved" ? "approved" : "pending") : "missing",
    revenueCdf: todayReport?.cashCdf ?? 0, revenueUsd: todayReport?.cashUsd ?? 0,
    expenseCdf: exp.cdf, expenseUsd: exp.usd,
    profitCdf: (todayReport?.cashCdf ?? 0) - exp.cdf,
    productsReceivedQty: receipts.reduce((a, r) => a + r.quantity, 0),
    inventoryWeeklyUsd: weeklyVal?.valueUsd ?? null,
    inventoryMonthlyUsd: monthlyVal?.valueUsd ?? null,
    weekly: { revenueCdf: weeklyRange.revenueCdf, expenseCdf: weeklyRange.expenseCdf, profitCdf: weeklyRange.revenueCdf - weeklyRange.expenseCdf },
    monthly: { revenueCdf: monthlyRange.revenueCdf, expenseCdf: monthlyRange.expenseCdf, profitCdf: monthlyRange.revenueCdf - monthlyRange.expenseCdf },
    lastReportAt: lastReport?.createdAt ?? null,
    history,
    activity: activityRows.map((a) => ({ id: a.id, action: a.action, entity: a.entity, detail: a.detail, userName: a.user?.name ?? "System", createdAt: a.createdAt })),
  };
}

// ---- Suppliers ----

// Outstanding balance is never stored — always the live difference between everything
// purchased and everything paid, kept per-currency like every other money figure here.
function sumByCurrency(rows: { amount?: number; totalAmount?: number; currency: string }[]): { cdf: number; usd: number } {
  let cdf = 0, usd = 0;
  for (const r of rows) {
    const v = r.amount ?? r.totalAmount ?? 0;
    if (r.currency === "USD") usd += v; else cdf += v;
  }
  return { cdf, usd };
}

export type SupplierBalance = {
  id: string; name: string; company: string; contactPerson: string; phone: string; status: string; notes: string;
  balanceCdf: number; balanceUsd: number; lastPurchaseAt: Date | null;
};

export async function getSuppliersWithBalances(): Promise<SupplierBalance[]> {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { purchases: true, payments: true },
  });
  return suppliers.map((s) => {
    const purchased = sumByCurrency(s.purchases);
    const paid = sumByCurrency(s.payments);
    const lastPurchase = s.purchases.reduce<Date | null>((latest, p) => (!latest || p.date > latest ? p.date : latest), null);
    return {
      id: s.id, name: s.name, company: s.company, contactPerson: s.contactPerson, phone: s.phone, status: s.status, notes: s.notes,
      balanceCdf: purchased.cdf - paid.cdf, balanceUsd: purchased.usd - paid.usd,
      lastPurchaseAt: lastPurchase,
    };
  });
}

export type SupplierDetail = {
  id: string; name: string; company: string; contactPerson: string; phone: string; status: string; notes: string;
  balanceCdf: number; balanceUsd: number;
  purchases: { id: string; date: Date; invoiceNumber: string; totalAmount: number; currency: string; notes: string }[];
  payments: { id: string; date: Date; amount: number; currency: string; method: string; referenceNumber: string; notes: string }[];
  goodsReceipts: { id: string; date: Date; branchName: string; note: string; lines: { productName: string; quantity: number }[] }[];
};

export async function getSupplierDetail(supplierId: string): Promise<SupplierDetail | null> {
  const s = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      purchases: { orderBy: { date: "desc" } },
      payments: { orderBy: { date: "desc" } },
      goodsReceipts: { orderBy: { date: "desc" }, include: { branch: true, receipts: { include: { product: true } } } },
    },
  });
  if (!s) return null;
  const purchased = sumByCurrency(s.purchases);
  const paid = sumByCurrency(s.payments);
  return {
    id: s.id, name: s.name, company: s.company, contactPerson: s.contactPerson, phone: s.phone, status: s.status, notes: s.notes,
    balanceCdf: purchased.cdf - paid.cdf, balanceUsd: purchased.usd - paid.usd,
    purchases: s.purchases.map((p) => ({ id: p.id, date: p.date, invoiceNumber: p.invoiceNumber, totalAmount: p.totalAmount, currency: p.currency, notes: p.notes })),
    payments: s.payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, currency: p.currency, method: p.method, referenceNumber: p.referenceNumber, notes: p.notes })),
    goodsReceipts: s.goodsReceipts.map((g) => ({ id: g.id, date: g.date, branchName: g.branch.name, note: g.note, lines: g.receipts.map((r) => ({ productName: r.product.name, quantity: r.quantity })) })),
  };
}

// Total supplier payments in a scope — "today" for the dashboard's Today figure, "all" for
// Overall. Used to deduct from Total Cash Collected when computing Available Cash.
export async function getSupplierPaymentsTotal(scope: "today" | "all"): Promise<{ cdf: number; usd: number }> {
  const where = scope === "today" ? { date: startOfToday() } : {};
  const rows = await prisma.supplierPayment.findMany({ where, select: { amount: true, currency: true } });
  return sumByCurrency(rows);
}

// All-time expenses on *approved* reports only — mirrors getOverallCashCollected's
// approved-only boundary, so Overall Available Cash and Overall Total Cash Collected are
// computed over the exact same set of reports.
export async function getAllTimeApprovedExpenses(): Promise<{ cdf: number; usd: number }> {
  const rows = await prisma.expense.findMany({
    where: { report: { status: "approved", deletedAt: null } },
    select: { amount: true, currency: true },
  });
  return sumByCurrency(rows);
}

export type AvailableCash = { todayCdf: number; todayUsd: number; overallCdf: number; overallUsd: number };

// Available Cash = Total Cash Collected − Supplier Payments − Branch Expenses − Other Company
// Expenses. "Other Company Expenses" has no input mechanism yet (no page requested for it),
// so it's a reserved, hardcoded 0 here — deliberately named so it's easy to wire up later.
// Takes `overallCash` as a parameter (rather than re-fetching it) since the dashboard page
// already calls getOverallCashCollected() itself for the Total Cash Collected card.
export async function getAvailableCash(
  todayTotals: { cashCdf: number; cashUsd: number; expCdf: number; expUsd: number },
  overallCash: { cashCdf: number; cashUsd: number }
): Promise<AvailableCash> {
  const OTHER_COMPANY_EXPENSES_CDF = 0;
  const OTHER_COMPANY_EXPENSES_USD = 0;

  const [allTimeExpenses, todayPayments, allTimePayments] = await Promise.all([
    getAllTimeApprovedExpenses(),
    getSupplierPaymentsTotal("today"),
    getSupplierPaymentsTotal("all"),
  ]);

  return {
    todayCdf: todayTotals.cashCdf - todayTotals.expCdf - todayPayments.cdf - OTHER_COMPANY_EXPENSES_CDF,
    todayUsd: todayTotals.cashUsd - todayTotals.expUsd - todayPayments.usd - OTHER_COMPANY_EXPENSES_USD,
    overallCdf: overallCash.cashCdf - allTimeExpenses.cdf - allTimePayments.cdf - OTHER_COMPANY_EXPENSES_CDF,
    overallUsd: overallCash.cashUsd - allTimeExpenses.usd - allTimePayments.usd - OTHER_COMPANY_EXPENSES_USD,
  };
}

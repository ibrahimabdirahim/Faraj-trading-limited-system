import { prisma } from "./db";
import { getBranchComparison, getCashLedger, getOverallCashCollected, getAvailableCash, startOfToday, dayStart, addDays } from "./metrics";
import { fmtDate } from "./format";

export type ReportMeta = { slug: string; title: string; subtitle: string; color: string };

export const REPORTS: ReportMeta[] = [
  { slug: "daily", title: "Daily report", subtitle: "Full end-of-day snapshot", color: "var(--brand)" },
  { slug: "weekly", title: "Weekly report", subtitle: "Week ending summary", color: "var(--cdf)" },
  { slug: "monthly", title: "Monthly report", subtitle: "Month-end comparison", color: "var(--good)" },
  { slug: "annual", title: "Annual report", subtitle: "Full year comparison", color: "var(--brand)" },
  { slug: "custom", title: "Custom date report", subtitle: "Any date range you choose", color: "var(--warn)" },
  { slug: "inventory", title: "Inventory report", subtitle: "Stock value & movement", color: "var(--cdf)" },
  { slug: "finance", title: "Finance report", subtitle: "Cash, expenses & profit", color: "var(--good)" },
  { slug: "expense", title: "Expense report", subtitle: "Category breakdown", color: "var(--warn)" },
  { slug: "branch", title: "Branch report", subtitle: "Rank all branches", color: "var(--brand)" },
  { slug: "profit", title: "Profit report", subtitle: "Margins & net profit", color: "var(--brand)" },
  { slug: "cash", title: "Cash report", subtitle: "Ledger of every cash movement", color: "var(--good)" },
  { slug: "purchase", title: "Purchase report", subtitle: "Supplier invoices", color: "var(--warn)" },
  { slug: "payment", title: "Payment report", subtitle: "Supplier payment history", color: "var(--good)" },
  { slug: "goods-received", title: "Goods received report", subtitle: "Stock received from suppliers", color: "var(--cdf)" },
  { slug: "outstanding-balance", title: "Outstanding balance report", subtitle: "What's owed, per supplier", color: "var(--brand)" },
];

export function reportMeta(slug: string): ReportMeta {
  return REPORTS.find((r) => r.slug === slug) ?? REPORTS[0];
}

// Supplier-domain reports live behind /suppliers/reports (gated on "suppliers" view) —
// everything else lives behind /reports (gated on "reports" view). Shared here so the
// PDF/Excel export routes can require the same permission as whichever page linked to them,
// regardless of which page the request actually came from.
export const SUPPLIER_REPORT_SLUGS = ["purchase", "payment", "goods-received", "outstanding-balance"];

export function reportRequiredModule(slug: string): "suppliers" | "reports" {
  return SUPPLIER_REPORT_SLUGS.includes(slug) ? "suppliers" : "reports";
}

// Every filter is optional — omitted means "don't narrow this dimension" (e.g. no branchId
// means all branches). Each report type applies whichever of these are meaningful to it.
export type ReportFilters = {
  from?: Date;
  to?: Date; // exclusive
  branchId?: string;
  supplierId?: string;
  status?: "approved" | "pending";
  currency?: "CDF" | "USD";
};

// Parses the query-string shape shared by the excel/pdf routes and the print page —
// dates come in as yyyy-mm-dd, "to" is inclusive on the wire and converted to exclusive here.
export function parseReportFilters(sp: URLSearchParams): ReportFilters {
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const branchId = sp.get("branchId") || undefined;
  const supplierId = sp.get("supplierId") || undefined;
  const statusRaw = sp.get("status");
  const currencyRaw = sp.get("currency");
  return {
    from: fromStr ? dayStart(new Date(fromStr + "T00:00:00")) : undefined,
    to: toStr ? addDays(dayStart(new Date(toStr + "T00:00:00")), 1) : undefined,
    branchId,
    supplierId,
    status: statusRaw === "approved" || statusRaw === "pending" ? statusRaw : undefined,
    currency: currencyRaw === "CDF" || currencyRaw === "USD" ? currencyRaw : undefined,
  };
}

export type ReportSummary = {
  totalRevenueCdf: number; totalRevenueUsd: number;
  totalAvailableCashCdf: number; totalAvailableCashUsd: number;
  totalExpensesCdf: number; totalExpensesUsd: number;
  totalSupplierPaymentsCdf: number; totalSupplierPaymentsUsd: number;
  netCashPositionCdf: number; netCashPositionUsd: number;
  transactionCount: number; branchCount: number;
};

export type ReportTable = {
  slug: string;
  title: string;
  subtitle: string;
  generatedAt: Date;
  columns: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
  numericCols: number[];
  documentNo: string;
  reportingPeriod: string;
  summary: ReportSummary;
};

// What each individual builder returns — documentNo/reportingPeriod/summary are attached once,
// centrally, in getReportTable below, so no builder needs to know about them. resolvedFrom/To
// let a builder that defaults its own date range (e.g. "this month" when no filter is given)
// tell getReportTable what range it actually used, so the Summary section is scoped to match
// rather than falling back to the raw (absent) filters and reporting all-time totals instead.
type ReportTableBase = Omit<ReportTable, "documentNo" | "reportingPeriod" | "summary"> & { resolvedFrom?: Date; resolvedTo?: Date };

// A short, readable per-generation document number — not stored, these are regenerated live
// documents rather than persisted numbered records (same "compute, don't store" philosophy as
// the rest of this file's derived figures).
export function documentNumber(slug: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `FRJ-${slug.toUpperCase()}-${y}${m}${d}-${hh}${mm}`;
}

// Several builders (daily/monthly/annual/custom/finance) resolve a default date range
// internally when no explicit filter is given, and already bake that resolved range into
// their subtitle — deriving the header's "Period" from the raw filters instead would say
// "All time" even when the table itself is scoped to, say, the current year. Reusing the
// subtitle's own trailing clause keeps the two in agreement for every report type.
function reportingPeriodFromSubtitle(subtitle: string): string {
  const idx = subtitle.lastIndexOf(" — ");
  return idx === -1 ? subtitle : subtitle.slice(idx + 3);
}

// The universal 7-metric block appended to the end of every report regardless of type —
// "Total Available Cash" is the current, global Available Cash snapshot (same figure the
// dashboard shows, independent of this report's own filters); every other figure here is
// scoped to this report's own date/branch/supplier filters (all-time if no date range given).
async function getReportSummaryMetrics(filters: ReportFilters): Promise<ReportSummary> {
  const dateWhere = filters.from && filters.to ? { date: { gte: filters.from, lt: filters.to } } : {};
  const reports = await prisma.dailyReport.findMany({
    where: { status: "approved", deletedAt: null, ...dateWhere, ...(filters.branchId ? { branchId: filters.branchId } : {}) },
    include: { expenses: true },
  });
  const payments = await prisma.supplierPayment.findMany({
    where: { status: "approved", ...dateWhere, ...(filters.supplierId ? { supplierId: filters.supplierId } : {}) },
  });

  let revenueCdf = 0, revenueUsd = 0, expCdf = 0, expUsd = 0, transactionCount = 0;
  const branchIds = new Set<string>();
  for (const r of reports) {
    revenueCdf += r.cashCdf; revenueUsd += r.cashUsd;
    branchIds.add(r.branchId);
    transactionCount += 1;
    for (const e of r.expenses) {
      if (e.currency === "USD") expUsd += e.amount; else expCdf += e.amount;
      transactionCount += 1;
    }
  }
  let paymentsCdf = 0, paymentsUsd = 0;
  for (const p of payments) {
    if (p.currency === "USD") paymentsUsd += p.amount; else paymentsCdf += p.amount;
    transactionCount += 1;
  }

  // Delegates to getAvailableCash (lib/metrics.ts) rather than re-deriving the formula here —
  // that function is the single canonical source for this figure everywhere in the app.
  const overallCash = await getOverallCashCollected();
  const availableCash = await getAvailableCash(overallCash);

  return {
    totalRevenueCdf: revenueCdf, totalRevenueUsd: revenueUsd,
    totalAvailableCashCdf: availableCash.cdf, totalAvailableCashUsd: availableCash.usd,
    totalExpensesCdf: expCdf, totalExpensesUsd: expUsd,
    totalSupplierPaymentsCdf: paymentsCdf, totalSupplierPaymentsUsd: paymentsUsd,
    netCashPositionCdf: revenueCdf - expCdf - paymentsCdf, netCashPositionUsd: revenueUsd - expUsd - paymentsUsd,
    transactionCount, branchCount: branchIds.size,
  };
}

function sum<T extends Record<string, unknown>>(list: T[], key: keyof T): number {
  return list.reduce((a, b) => a + (Number(b[key]) || 0), 0);
}

function rangeLabel(from: Date, to: Date): string {
  const lastDay = addDays(to, -1);
  return lastDay.getTime() === from.getTime() ? fmtDate(from) : `${fmtDate(from)} → ${fmtDate(lastDay)}`;
}

// Drops the CDF or USD half of any "X CDF" / "X USD" column pair when filters.currency
// narrows the report to a single currency — applied once, after a table is built.
function applyCurrencyFilter(table: ReportTable, currency?: "CDF" | "USD"): ReportTable {
  if (!currency) return table;
  const drop = currency === "CDF" ? "USD" : "CDF";
  const keepIdx = table.columns.map((c, i) => (c.includes(drop) ? -1 : i)).filter((i) => i !== -1);
  if (keepIdx.length === table.columns.length) return table;
  const remap = (arr: (string | number)[]) => keepIdx.map((i) => arr[i]);
  return {
    ...table,
    columns: remap(table.columns) as string[],
    rows: table.rows.map(remap),
    totals: table.totals ? remap(table.totals) : undefined,
    numericCols: keepIdx.map((oldI, newI) => (table.numericCols.includes(oldI) ? newI : -1)).filter((i) => i !== -1),
  };
}

// Shared shape for Daily / Custom / Monthly / Finance — a per-branch cash+expense+profit
// summary over an arbitrary date range, optionally narrowed to one branch and/or one status.
async function branchSummaryTable(opts: { slug: string; title: string; subtitle: string; from: Date; to: Date; filters: ReportFilters }): Promise<ReportTableBase> {
  const { slug, title, subtitle, from, to, filters } = opts;
  const branches = filters.branchId
    ? await prisma.branch.findMany({ where: { id: filters.branchId } })
    : await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" } });

  const columns = ["Branch", "Manager", "Cash CDF", "Cash USD", "Expenses CDF", "Expenses USD", "Profit CDF", "Status"];
  const rows: (string | number)[][] = [];
  for (const b of branches) {
    const reports = await prisma.dailyReport.findMany({
      where: { branchId: b.id, date: { gte: from, lt: to }, deletedAt: null, ...(filters.status ? { status: filters.status } : {}) },
      include: { expenses: true },
      orderBy: { date: "desc" },
    });
    const cashCdf = reports.reduce((a, r) => a + r.cashCdf, 0);
    const cashUsd = reports.reduce((a, r) => a + r.cashUsd, 0);
    let expCdf = 0, expUsd = 0;
    for (const r of reports) for (const e of r.expenses) { if (e.currency === "USD") expUsd += e.amount; else expCdf += e.amount; }
    const profitCdf = Math.max(0, cashCdf - expCdf);
    const status = reports.length === 0 ? "missing" : reports[0].status === "approved" ? "approved" : "pending";
    rows.push([b.name, b.manager, cashCdf, cashUsd, expCdf, expUsd, profitCdf, status]);
  }

  const totals: (string | number)[] = ["Total", ""];
  for (let i = 2; i <= 6; i++) totals.push(rows.reduce((a, r) => a + (Number(r[i]) || 0), 0));
  totals.push("");

  return { slug, title, subtitle, generatedAt: new Date(), columns, rows, totals, numericCols: [2, 3, 4, 5, 6], resolvedFrom: from, resolvedTo: to };
}

async function dailyTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  return branchSummaryTable({ slug: "daily", title: "Daily Report", subtitle: `Branch snapshot — ${rangeLabel(from, to)}`, from, to, filters });
}

async function customTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  return branchSummaryTable({ slug: "custom", title: "Custom Date Report", subtitle: rangeLabel(from, to), from, to, filters });
}

async function monthlyTable(filters: ReportFilters): Promise<ReportTableBase> {
  let from = filters.from, to = filters.to;
  let label: string;
  if (from && to) {
    label = rangeLabel(from, to);
  } else {
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    label = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  return branchSummaryTable({ slug: "monthly", title: "Monthly Report", subtitle: label, from, to, filters });
}

async function annualTable(filters: ReportFilters): Promise<ReportTableBase> {
  let from = filters.from, to = filters.to;
  let label: string;
  if (from && to) {
    label = rangeLabel(from, to);
  } else {
    const now = new Date();
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
    label = String(now.getFullYear());
  }
  return branchSummaryTable({ slug: "annual", title: "Annual Report", subtitle: label, from, to, filters });
}

async function financeTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  return branchSummaryTable({ slug: "finance", title: "Finance Report", subtitle: `Cash, expenses & profit — ${rangeLabel(from, to)}`, from, to, filters });
}

async function weeklyTable(filters: ReportFilters): Promise<ReportTableBase> {
  const endDay = filters.to ? dayStart(addDays(filters.to, -1)) : startOfToday();
  const columns = ["Date", "Cash CDF", "Cash USD", "Expenses CDF", "Expenses USD"];
  const rows: (string | number)[][] = [];
  let tCdf = 0, tUsd = 0, tExpCdf = 0, tExpUsd = 0;
  for (let i = 6; i >= 0; i--) {
    const d = addDays(endDay, -i);
    const reps = await prisma.dailyReport.findMany({
      where: { date: d, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}), ...(filters.status ? { status: filters.status } : {}) },
      include: { expenses: true },
    });
    const cdf = reps.reduce((a, r) => a + r.cashCdf, 0);
    const usd = reps.reduce((a, r) => a + r.cashUsd, 0);
    let expCdf = 0, expUsd = 0;
    for (const r of reps) for (const e of r.expenses) { if (e.currency === "USD") expUsd += e.amount; else expCdf += e.amount; }
    tCdf += cdf; tUsd += usd; tExpCdf += expCdf; tExpUsd += expUsd;
    rows.push([fmtDate(d), cdf, usd, expCdf, expUsd]);
  }
  return {
    slug: "weekly", title: "Weekly Report", subtitle: `Week ending ${fmtDate(endDay)}`, generatedAt: new Date(), columns, rows,
    totals: ["Total", tCdf, tUsd, tExpCdf, tExpUsd], numericCols: [1, 2, 3, 4],
    resolvedFrom: addDays(endDay, -6), resolvedTo: addDays(endDay, 1),
  };
}

async function branchTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  let rows = await getBranchComparison(from, to);
  if (filters.branchId) rows = rows.filter((r) => r.id === filters.branchId);
  if (filters.status) rows = rows.filter((r) => r.lastReportStatus === filters.status);

  const columns = ["Rank", "Branch", "Manager", "Revenue CDF", "Revenue USD", "Expenses CDF", "Profit CDF", "Products Received", "Status"];
  const tableRows = rows.map((r) => [r.rank, r.name, r.manager, r.revenueCdf, r.revenueUsd, r.expenseCdf, r.profitCdf, r.productsReceivedQty, r.lastReportStatus]);
  const totals: (string | number)[] = ["", "Total", ""];
  for (const i of [3, 4, 5, 6, 7]) totals.push(tableRows.reduce((a, r) => a + (Number(r[i]) || 0), 0));
  totals.push("");
  return { slug: "branch", title: "Branch Report", subtitle: `Ranked by performance — ${rangeLabel(from, to)}`, generatedAt: new Date(), columns, rows: tableRows, totals, numericCols: [0, 3, 4, 5, 6, 7], resolvedFrom: from, resolvedTo: to };
}

async function inventoryTable(filters: ReportFilters): Promise<ReportTableBase> {
  const branches = filters.branchId
    ? await prisma.branch.findMany({ where: { id: filters.branchId } })
    : await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" } });
  const valuations = await prisma.inventoryValuation.findMany({ orderBy: { periodEnding: "desc" } });
  const latest: Record<string, { weeklyUsd?: number; weeklyCdf?: number; monthlyUsd?: number; monthlyCdf?: number }> = {};
  for (const v of valuations) {
    const key = v.branchId ?? "wh";
    latest[key] ??= {};
    if (v.periodType === "weekly" && latest[key].weeklyUsd === undefined) { latest[key].weeklyUsd = v.valueUsd; latest[key].weeklyCdf = v.valueCdf; }
    else if (v.periodType === "monthly" && latest[key].monthlyUsd === undefined) { latest[key].monthlyUsd = v.valueUsd; latest[key].monthlyCdf = v.valueCdf; }
  }
  const columns = ["Branch", "Weekly USD", "Weekly CDF", "Monthly USD", "Monthly CDF"];
  const rows = branches.map((b) => {
    const l = latest[b.id] ?? {};
    return [b.name, l.weeklyUsd ?? 0, l.weeklyCdf ?? 0, l.monthlyUsd ?? 0, l.monthlyCdf ?? 0];
  });
  return { slug: "inventory", title: "Inventory Report", subtitle: `Latest valuations — ${fmtDate(new Date())}`, generatedAt: new Date(), columns, rows, numericCols: [1, 2, 3, 4] };
}

async function expenseTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  const expenses = await prisma.expense.findMany({
    where: { report: { date: { gte: from, lt: to }, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}), ...(filters.status ? { status: filters.status } : {}) } },
  });
  const byCat: Record<string, { cdf: number; usd: number }> = {};
  for (const e of expenses) {
    const k = e.description.split(" ")[0] || "Other";
    byCat[k] ??= { cdf: 0, usd: 0 };
    if (e.currency === "USD") byCat[k].usd += e.amount; else byCat[k].cdf += e.amount;
  }
  const entries = Object.entries(byCat).sort((a, b) => b[1].cdf - a[1].cdf);
  const columns = ["Category", "CDF", "USD"];
  const rows = entries.map(([cat, v]) => [cat, v.cdf, v.usd]);
  const totals = ["Total", entries.reduce((a, [, v]) => a + v.cdf, 0), entries.reduce((a, [, v]) => a + v.usd, 0)];
  return { slug: "expense", title: "Expense Report", subtitle: `By category — ${rangeLabel(from, to)}`, generatedAt: new Date(), columns, rows, totals, numericCols: [1, 2], resolvedFrom: from, resolvedTo: to };
}

async function profitTable(filters: ReportFilters): Promise<ReportTableBase> {
  const from = filters.from ?? startOfToday();
  const to = filters.to ?? addDays(from, 1);
  let rows = await getBranchComparison(from, to);
  if (filters.branchId) rows = rows.filter((r) => r.id === filters.branchId);
  rows = [...rows].sort((a, b) => b.profitCdf - a.profitCdf);
  const columns = ["Rank", "Branch", "Cash CDF", "Expenses CDF", "Profit CDF"];
  const tableRows = rows.map((r, i) => [i + 1, r.name, r.revenueCdf, r.expenseCdf, r.profitCdf]);
  const totals = ["Total", "", sum(tableRows.map((r) => ({ v: r[2] })), "v"), sum(tableRows.map((r) => ({ v: r[3] })), "v"), sum(tableRows.map((r) => ({ v: r[4] })), "v")];
  return { slug: "profit", title: "Profit Report", subtitle: `Margins & net profit — ${rangeLabel(from, to)}`, generatedAt: new Date(), columns, rows: tableRows, totals, numericCols: [0, 2, 3, 4], resolvedFrom: from, resolvedTo: to };
}

// Purchase/Payment rows are each in a single currency (not a CDF+USD pair per row), so they
// don't fit applyCurrencyFilter's column-substring convention — narrow by currency at the
// query level instead, which is the correct shape for this kind of raw transaction ledger.
async function purchaseTable(filters: ReportFilters): Promise<ReportTableBase> {
  const purchases = await prisma.supplierPurchase.findMany({
    where: {
      ...(filters.from && filters.to ? { date: { gte: filters.from, lt: filters.to } } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.currency ? { currency: filters.currency } : {}),
    },
    include: { supplier: true, createdBy: true },
    orderBy: { date: "desc" },
  });
  const columns = ["Date", "Supplier", "Invoice #", "Amount", "Currency", "Recorded By"];
  const rows = purchases.map((p) => [fmtDate(p.date), p.supplier.name, p.invoiceNumber || "—", p.totalAmount, p.currency, p.createdBy?.name ?? "—"]);
  const totalsByCurrency: Record<string, number> = {};
  for (const p of purchases) totalsByCurrency[p.currency] = (totalsByCurrency[p.currency] ?? 0) + p.totalAmount;
  const totalsLabel = Object.entries(totalsByCurrency).map(([cur, amt]) => `${cur} ${amt.toLocaleString()}`).join(" · ") || "—";
  return { slug: "purchase", title: "Purchase Report", subtitle: `Supplier invoices — ${filters.from && filters.to ? rangeLabel(filters.from, filters.to) : "all time"}`, generatedAt: new Date(), columns, rows, totals: ["Total", "", "", totalsLabel, "", ""], numericCols: [3] };
}

async function paymentTable(filters: ReportFilters): Promise<ReportTableBase> {
  const payments = await prisma.supplierPayment.findMany({
    where: {
      ...(filters.from && filters.to ? { date: { gte: filters.from, lt: filters.to } } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.currency ? { currency: filters.currency } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { supplier: true, createdBy: true },
    orderBy: { date: "desc" },
  });
  const columns = ["Date", "Supplier", "Amount", "Currency", "Method", "Reference", "Status", "Recorded By"];
  const rows = payments.map((p) => [fmtDate(p.date), p.supplier.name, p.amount, p.currency, p.method, p.referenceNumber || "—", p.status, p.createdBy?.name ?? "—"]);
  const totalsByCurrency: Record<string, number> = {};
  for (const p of payments.filter((p) => p.status === "approved")) totalsByCurrency[p.currency] = (totalsByCurrency[p.currency] ?? 0) + p.amount;
  const totalsLabel = Object.entries(totalsByCurrency).map(([cur, amt]) => `${cur} ${amt.toLocaleString()}`).join(" · ") || "—";
  return { slug: "payment", title: "Payment Report", subtitle: `Supplier payments — ${filters.from && filters.to ? rangeLabel(filters.from, filters.to) : "all time"}`, generatedAt: new Date(), columns, rows, totals: ["Total (approved)", "", totalsLabel, "", "", "", "", ""], numericCols: [2] };
}

async function goodsReceivedTable(filters: ReportFilters): Promise<ReportTableBase> {
  const receipts = await prisma.stockReceipt.findMany({
    where: {
      goodsReceiptId: { not: null },
      ...(filters.from && filters.to ? { date: { gte: filters.from, lt: filters.to } } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.supplierId ? { goodsReceipt: { supplierId: filters.supplierId } } : {}),
    },
    include: { branch: true, product: true, goodsReceipt: { include: { supplier: true, createdBy: true } } },
    orderBy: { date: "desc" },
  });
  const columns = ["Date", "Supplier", "Branch", "Goods", "Quantity", "Recorded By"];
  const rows = receipts.map((r) => [fmtDate(r.date), r.goodsReceipt?.supplier.name ?? r.supplier, r.branch.name, r.product.name, r.quantity, r.goodsReceipt?.createdBy?.name ?? "—"]);
  const totals = ["Total", "", "", "", rows.reduce((a, r) => a + (Number(r[4]) || 0), 0), ""];
  return { slug: "goods-received", title: "Goods Received Report", subtitle: `Stock received from suppliers — ${filters.from && filters.to ? rangeLabel(filters.from, filters.to) : "all time"}`, generatedAt: new Date(), columns, rows, totals, numericCols: [4] };
}

async function cashTable(filters: ReportFilters): Promise<ReportTableBase> {
  const ledger = await getCashLedger({ from: filters.from, to: filters.to, branchId: filters.branchId, supplierId: filters.supplierId });
  const columns = ["Date", "Type", "Description", "In CDF", "Out CDF", "In USD", "Out USD", "Balance CDF", "Balance USD"];
  const rows = ledger.map((e) => [fmtDate(e.date), e.type, e.description, e.inCdf, e.outCdf, e.inUsd, e.outUsd, e.balanceCdf, e.balanceUsd]);
  const last = ledger[ledger.length - 1];
  const totals: (string | number)[] = [
    "Total", "", "",
    ledger.reduce((a, e) => a + e.inCdf, 0), ledger.reduce((a, e) => a + e.outCdf, 0),
    ledger.reduce((a, e) => a + e.inUsd, 0), ledger.reduce((a, e) => a + e.outUsd, 0),
    last?.balanceCdf ?? 0, last?.balanceUsd ?? 0,
  ];
  return {
    slug: "cash", title: "Cash Report", subtitle: `Ledger of every cash movement — ${filters.from && filters.to ? rangeLabel(filters.from, filters.to) : "all time"}`,
    generatedAt: new Date(), columns, rows, totals, numericCols: [3, 4, 5, 6, 7, 8],
  };
}

async function outstandingBalanceTable(filters: ReportFilters): Promise<ReportTableBase> {
  const suppliers = await prisma.supplier.findMany({
    where: filters.supplierId ? { id: filters.supplierId } : {},
    include: { purchases: true, payments: true },
    orderBy: { name: "asc" },
  });
  const columns = ["Supplier", "Company", "Purchases CDF", "Payments CDF", "Outstanding CDF", "Purchases USD", "Payments USD", "Outstanding USD"];
  const rows = suppliers.map((s) => {
    let pCdf = 0, pUsd = 0, payCdf = 0, payUsd = 0;
    for (const p of s.purchases) { if (p.currency === "USD") pUsd += p.totalAmount; else pCdf += p.totalAmount; }
    for (const p of s.payments.filter((p) => p.status === "approved")) { if (p.currency === "USD") payUsd += p.amount; else payCdf += p.amount; }
    return [s.name, s.company || "—", pCdf, payCdf, pCdf - payCdf, pUsd, payUsd, pUsd - payUsd];
  });
  const totals: (string | number)[] = ["Total", ""];
  for (let i = 2; i <= 7; i++) totals.push(rows.reduce((a, r) => a + (Number(r[i]) || 0), 0));
  return { slug: "outstanding-balance", title: "Outstanding Balance Report", subtitle: `As of ${fmtDate(new Date())}`, generatedAt: new Date(), columns, rows, totals, numericCols: [2, 3, 4, 5, 6, 7] };
}

export async function getReportTable(slug: string, filters: ReportFilters = {}): Promise<ReportTable> {
  let table: ReportTableBase;
  switch (slug) {
    case "daily": table = await dailyTable(filters); break;
    case "weekly": table = await weeklyTable(filters); break;
    case "monthly": table = await monthlyTable(filters); break;
    case "annual": table = await annualTable(filters); break;
    case "custom": table = await customTable(filters); break;
    case "inventory": table = await inventoryTable(filters); break;
    case "finance": table = await financeTable(filters); break;
    case "expense": table = await expenseTable(filters); break;
    case "branch": table = await branchTable(filters); break;
    case "profit": table = await profitTable(filters); break;
    case "cash": table = await cashTable(filters); break;
    case "purchase": table = await purchaseTable(filters); break;
    case "payment": table = await paymentTable(filters); break;
    case "goods-received": table = await goodsReceivedTable(filters); break;
    case "outstanding-balance": table = await outstandingBalanceTable(filters); break;
    default: table = await dailyTable(filters);
  }
  const summaryFilters: ReportFilters = { ...filters, from: table.resolvedFrom ?? filters.from, to: table.resolvedTo ?? filters.to };
  const [documentNo, reportingPeriod, summary] = [documentNumber(slug), reportingPeriodFromSubtitle(table.subtitle), await getReportSummaryMetrics(summaryFilters)];
  const full: ReportTable = { ...table, documentNo, reportingPeriod, summary };
  return applyCurrencyFilter(full, filters.currency);
}

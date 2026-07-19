import "server-only";
import { prisma } from "./db";
import { getEffectivePermissions } from "./permissions";
import type { PermissionMap } from "./permissionTypes";
import { REPORTS } from "./reports";

// Global search — every query below reads straight from the database on each call (no
// cache, no denormalized search index to keep in sync). For this dataset's size that is
// the simplest correct design: a result is stale only for as long as the request itself
// takes, and every create/update/delete is reflected on the very next search.
//
// Case-insensitivity: Postgres's default `contains` is case-SENSITIVE (unlike SQLite, which
// defaulted to case-insensitive for ASCII) — every text match below goes through `ci()`,
// which adds `mode: "insensitive"`, to keep search behavior unchanged across the migration.
function ci(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export type SearchResult = {
  module: string;
  id: string;
  title: string;
  subtitle: string;
  createdAt: Date | null;
  status: string | null;
  href: string;
  rank: number; // lower = more relevant; used to order results, not shown to the user
};

function parseKeywords(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
}

// Every keyword must match at least one of the given fields (AND of per-keyword ORs) —
// standard "all these words, any order, any field" multi-keyword search.
function keywordWhere<T extends object>(keywords: string[], fieldsFor: (k: string) => T[]): { AND: { OR: T[] }[] } {
  return { AND: keywords.map((k) => ({ OR: fieldsFor(k) })) };
}

// Exact/prefix title matches rank above pure substring matches, most recent first as a tiebreak.
function rankOf(title: string, keywords: string[], createdAt: Date | null): number {
  const t = title.toLowerCase();
  const q = keywords.join(" ").toLowerCase();
  const base = t.startsWith(q) ? 0 : t.includes(q) ? 1 : 2;
  return base * 1e15 - (createdAt?.getTime() ?? 0);
}

const TAKE = 8;

export async function globalSearch(rawQuery: string, userId: string): Promise<SearchResult[]> {
  const keywords = parseKeywords(rawQuery);
  if (keywords.length === 0) return [];

  const perms: PermissionMap = await getEffectivePermissions(userId);
  const can = (m: keyof PermissionMap) => perms[m]?.view;

  const tasks: Promise<SearchResult[]>[] = [];

  if (can("products")) {
    tasks.push(
      prisma.product.findMany({
        where: keywordWhere(keywords, (k) => [
          { name: ci(k) },
          { barcode: ci(k) },
          { category: { name: ci(k) } },
        ]),
        include: { category: true },
        take: TAKE,
      }).then((rows) => rows.map((p) => ({
        module: "Products", id: p.id, title: p.name,
        subtitle: [p.category?.name, p.unit, p.barcode].filter(Boolean).join(" · "),
        createdAt: p.createdAt, status: p.status, href: "/products",
        rank: rankOf(p.name, keywords, p.createdAt),
      })))
    );
  }

  if (can("branches")) {
    tasks.push(
      prisma.branch.findMany({
        where: keywordWhere(keywords, (k) => [{ name: ci(k) }, { manager: ci(k) }]),
        take: TAKE,
      }).then((rows) => rows.map((b) => ({
        module: "Branches", id: b.id, title: b.name,
        subtitle: b.manager ? `Manager: ${b.manager}` : b.type,
        createdAt: b.createdAt, status: b.active ? "Active" : "Inactive", href: "/branches",
        rank: rankOf(b.name, keywords, b.createdAt),
      })))
    );
  }

  if (can("suppliers")) {
    tasks.push(
      prisma.supplier.findMany({
        where: keywordWhere(keywords, (k) => [
          { name: ci(k) }, { company: ci(k) },
          { contactPerson: ci(k) }, { phone: ci(k) },
        ]),
        take: TAKE,
      }).then((rows) => rows.map((s) => ({
        module: "Suppliers", id: s.id, title: s.name,
        subtitle: [s.company, s.contactPerson, s.phone].filter(Boolean).join(" · "),
        createdAt: s.createdAt, status: s.status, href: "/suppliers",
        rank: rankOf(s.name, keywords, s.createdAt),
      })))
    );

    tasks.push(
      prisma.supplierPayment.findMany({
        where: keywordWhere(keywords, (k) => [
          { supplier: { name: ci(k) } }, { referenceNumber: ci(k) },
          { notes: ci(k) }, { method: ci(k) },
        ]),
        include: { supplier: true },
        take: TAKE,
      }).then((rows) => rows.map((p) => ({
        module: "Supplier Payments", id: p.id, title: `${p.supplier.name} — ${p.currency} ${p.amount}`,
        subtitle: [p.method, p.referenceNumber].filter(Boolean).join(" · "),
        createdAt: p.createdAt, status: p.status, href: "/suppliers/payments",
        rank: rankOf(p.supplier.name, keywords, p.createdAt),
      })))
    );

    tasks.push(
      prisma.supplierPurchase.findMany({
        where: keywordWhere(keywords, (k) => [
          { supplier: { name: ci(k) } }, { invoiceNumber: ci(k) }, { notes: ci(k) },
        ]),
        include: { supplier: true },
        take: TAKE,
      }).then((rows) => rows.map((p) => ({
        module: "Supplier Purchases", id: p.id, title: `${p.supplier.name} — ${p.currency} ${p.totalAmount}`,
        subtitle: p.invoiceNumber ? `Invoice ${p.invoiceNumber}` : "",
        createdAt: p.createdAt, status: null, href: "/suppliers/purchases",
        rank: rankOf(p.supplier.name, keywords, p.createdAt),
      })))
    );

    tasks.push(
      prisma.goodsReceipt.findMany({
        where: keywordWhere(keywords, (k) => [
          { supplier: { name: ci(k) } }, { branch: { name: ci(k) } }, { note: ci(k) },
        ]),
        include: { supplier: true, branch: true },
        take: TAKE,
      }).then((rows) => rows.map((g) => ({
        module: "Goods Received", id: g.id, title: `${g.supplier.name} → ${g.branch.name}`,
        subtitle: g.note || "Goods receipt",
        createdAt: g.createdAt, status: null, href: "/suppliers/goods-received",
        rank: rankOf(g.supplier.name, keywords, g.createdAt),
      })))
    );
  }

  if (can("daily-reports")) {
    tasks.push(
      prisma.dailyReport.findMany({
        where: { deletedAt: null, ...keywordWhere(keywords, (k) => [
          { branch: { name: ci(k) } }, { note: ci(k) },
        ]) },
        include: { branch: true },
        take: TAKE,
      }).then((rows) => rows.map((r) => ({
        module: "Daily Reports", id: r.id, title: `${r.branch.name} — ${r.date.toISOString().slice(0, 10)}`,
        subtitle: r.note || `${r.cashCdf} CDF collected`,
        createdAt: r.createdAt, status: r.status, href: "/reports-daily",
        rank: rankOf(r.branch.name, keywords, r.createdAt),
      })))
    );

    // Expenses are children of Daily Reports (no separate module/page) — gated on the same
    // permission, surfaced under the Finance page where they're actually shown.
    tasks.push(
      prisma.expense.findMany({
        where: { report: { deletedAt: null }, ...keywordWhere(keywords, (k) => [{ description: ci(k) }]) },
        include: { report: { include: { branch: true } } },
        take: TAKE,
      }).then((rows) => rows.map((e) => ({
        module: "Expenses", id: e.id, title: e.description || "Expense",
        subtitle: `${e.report.branch.name} · ${e.currency} ${e.amount}`,
        createdAt: e.report.createdAt, status: e.report.status, href: "/finance",
        rank: rankOf(e.description, keywords, e.report.createdAt),
      })))
    );
  }

  if (can("inventory")) {
    tasks.push(
      prisma.stockMovement.findMany({
        where: keywordWhere(keywords, (k) => [
          { product: { name: ci(k) } }, { branch: { name: ci(k) } }, { type: ci(k) },
        ]),
        include: { product: true, branch: true },
        take: TAKE,
      }).then((rows) => rows.map((m) => ({
        module: "Inventory", id: m.id, title: `${m.product?.name ?? "Stock"} · ${m.branch.name}`,
        subtitle: `${m.type} · ${m.quantity}`,
        createdAt: m.date, status: m.type, href: "/inventory",
        rank: rankOf(m.product?.name ?? m.branch.name, keywords, m.date),
      })))
    );
  }

  if (can("user-management")) {
    tasks.push(
      prisma.user.findMany({
        where: keywordWhere(keywords, (k) => [
          { name: ci(k) }, { email: ci(k) }, { username: ci(k) },
          { roleRef: { name: ci(k) } },
        ]),
        include: { roleRef: true },
        take: TAKE,
      }).then((rows) => rows.map((u) => ({
        module: "Users", id: u.id, title: u.name,
        subtitle: [u.email, u.roleRef.name].filter(Boolean).join(" · "),
        createdAt: u.createdAt, status: u.active ? (u.locked ? "Locked" : "Active") : "Inactive", href: "/users",
        rank: rankOf(u.name, keywords, u.createdAt),
      })))
    );

    tasks.push(
      prisma.role.findMany({
        where: keywordWhere(keywords, (k) => [{ name: ci(k) }, { key: ci(k) }]),
        take: TAKE,
      }).then((rows) => rows.map((r) => ({
        module: "Roles", id: r.id, title: r.name, subtitle: r.key,
        createdAt: r.createdAt, status: null, href: "/users",
        rank: rankOf(r.name, keywords, r.createdAt),
      })))
    );
  }

  if (can("reports")) {
    const q = keywords.join(" ").toLowerCase();
    const staticMatches = REPORTS.filter((r) =>
      keywords.every((k) => `${r.title} ${r.subtitle} ${r.slug}`.toLowerCase().includes(k.toLowerCase()))
    ).map((r) => ({
      module: "Reports", id: r.slug, title: r.title, subtitle: r.subtitle,
      createdAt: null, status: null, href: `/reports?type=${r.slug}`,
      rank: r.title.toLowerCase().startsWith(q) ? 0 : 1,
    }));
    tasks.push(Promise.resolve(staticMatches));
  }

  const settled = await Promise.all(tasks);
  return settled.flat().sort((a, b) => a.rank - b.rank).slice(0, 40);
}

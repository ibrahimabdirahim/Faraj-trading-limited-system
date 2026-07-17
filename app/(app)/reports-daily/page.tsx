import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/metrics";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { getEffectivePermissions } from "@/lib/permissions";
import DailyReportsTable, { type DailyReportRow } from "@/components/daily-reports/DailyReportsTable";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  const user = await getCurrentUser();
  const [reports, branches, settings, permissions, trashedCount] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { branch: true, expenses: true, createdBy: true },
      take: 300,
    }),
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, manager: true } }),
    getSettings(),
    user ? getEffectivePermissions(user.id) : null,
    prisma.dailyReport.count({ where: { NOT: { deletedAt: null } } }),
  ]);

  const today = startOfToday();
  const branchCount = branches.length;
  const reportedToday = reports.filter((r) => r.date.getTime() === today.getTime()).length;
  const pendingToday = reports.filter((r) => r.date.getTime() === today.getTime() && r.status === "pending").length;
  const missing = branchCount - reportedToday;

  const rows: DailyReportRow[] = reports.map((r) => {
    let expCdf = 0, expUsd = 0;
    for (const e of r.expenses) { if (e.currency === "USD") expUsd += e.amount; else expCdf += e.amount; }
    return {
      id: r.id,
      date: r.date,
      branchId: r.branchId,
      branchName: r.branch.name,
      branchManager: r.branch.manager,
      cashCdf: r.cashCdf,
      cashUsd: r.cashUsd,
      expCdf, expUsd,
      status: r.status === "approved" ? "approved" : "pending",
      locked: r.locked,
      createdByName: r.createdBy?.name ?? "—",
      note: r.note,
      expenses: r.expenses.map((e) => ({ id: e.id, description: e.description, amount: e.amount, currency: e.currency })),
    };
  });

  return (
    <DailyReportsTable
      rows={rows}
      branches={branches}
      fxRate={settings.fxRate}
      canEdit={permissions?.["daily-reports"]?.edit ?? false}
      canDelete={permissions?.["daily-reports"]?.delete ?? false}
      missing={missing}
      pendingToday={pendingToday}
      trashedCount={trashedCount}
    />
  );
}

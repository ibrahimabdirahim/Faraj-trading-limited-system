import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import Icon from "@/components/shared/Icon";
import TrashTable, { type TrashedReportRow } from "@/components/daily-reports/TrashTable";

export const dynamic = "force-dynamic";

export default async function ReportsTrashPage() {
  await requirePermission("daily-reports", "delete");

  const reports = await prisma.dailyReport.findMany({
    where: { NOT: { deletedAt: null } },
    orderBy: { deletedAt: "desc" },
    include: { branch: true, deletedBy: true },
    take: 300,
  });

  const rows: TrashedReportRow[] = reports.map((r) => ({
    id: r.id,
    date: r.date,
    branchName: r.branch.name,
    branchManager: r.branch.manager,
    cashCdf: r.cashCdf,
    cashUsd: r.cashUsd,
    deletedAt: r.deletedAt as Date,
    deletedByName: r.deletedBy?.name ?? "—",
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Trash</div>
          <div className="page-sub">Deleted daily reports — restore them or remove them for good</div>
        </div>
        <div className="head-actions">
          <Link href="/reports-daily" className="btn"><Icon name="report" className="ico" size={15} />Back to Daily Reports</Link>
        </div>
      </div>
      <TrashTable rows={rows} />
    </>
  );
}

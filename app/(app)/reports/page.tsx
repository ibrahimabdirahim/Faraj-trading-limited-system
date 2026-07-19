import { prisma } from "@/lib/db";
import { REPORTS } from "@/lib/reports";
import { checkPageAccess } from "@/lib/permissions";
import ReportsPageClient from "@/components/reports/ReportsPageClient";
import AccessDenied from "@/components/shared/AccessDenied";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { allowed } = await checkPageAccess("reports", "view");
  if (!allowed) return <AccessDenied module="Reports" />;

  const [branches, suppliers] = await Promise.all([
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <ReportsPageClient reports={REPORTS} branches={branches} suppliers={suppliers} />;
}

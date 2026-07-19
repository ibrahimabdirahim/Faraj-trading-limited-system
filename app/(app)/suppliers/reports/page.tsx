import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { REPORTS } from "@/lib/reports";
import SupplierReportsPageClient from "@/components/suppliers/SupplierReportsPageClient";

export const dynamic = "force-dynamic";

const SUPPLIER_REPORT_SLUGS = ["purchase", "payment", "goods-received", "outstanding-balance"];

export default async function SupplierReportsPage() {
  await requirePermission("suppliers", "view");
  const [suppliers, branches] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const reports = REPORTS.filter((r) => SUPPLIER_REPORT_SLUGS.includes(r.slug));

  return <SupplierReportsPageClient reports={reports} suppliers={suppliers} branches={branches} />;
}

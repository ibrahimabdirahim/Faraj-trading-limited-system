import { prisma } from "@/lib/db";
import { checkPageAccess } from "@/lib/permissions";
import { REPORTS, SUPPLIER_REPORT_SLUGS } from "@/lib/reports";
import SupplierReportsPageClient from "@/components/suppliers/SupplierReportsPageClient";
import AccessDenied from "@/components/shared/AccessDenied";

export const dynamic = "force-dynamic";

export default async function SupplierReportsPage() {
  const { allowed } = await checkPageAccess("suppliers", "view");
  if (!allowed) return <AccessDenied module="Supplier Reports" />;
  const [suppliers, branches] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const reports = REPORTS.filter((r) => SUPPLIER_REPORT_SLUGS.includes(r.slug));

  return <SupplierReportsPageClient reports={reports} suppliers={suppliers} branches={branches} />;
}

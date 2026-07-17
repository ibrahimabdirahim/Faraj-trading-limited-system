import { prisma } from "@/lib/db";
import { REPORTS } from "@/lib/reports";
import ReportsPageClient from "@/components/reports/ReportsPageClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return <ReportsPageClient reports={REPORTS} branches={branches} />;
}

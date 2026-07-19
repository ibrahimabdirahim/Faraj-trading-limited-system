import { prisma } from "@/lib/db";
import { checkPageAccess } from "@/lib/permissions";
import SupplierTabs from "@/components/suppliers/SupplierTabs";
import RecordPurchaseForm from "@/components/suppliers/RecordPurchaseForm";
import PurchasesTable, { type PurchaseRow } from "@/components/suppliers/PurchasesTable";
import AccessDenied from "@/components/shared/AccessDenied";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const { allowed } = await checkPageAccess("suppliers", "view");
  if (!allowed) return <AccessDenied module="Purchases" />;

  const [purchases, suppliers] = await Promise.all([
    prisma.supplierPurchase.findMany({ orderBy: { date: "desc" }, include: { supplier: true, createdBy: true }, take: 300 }),
    prisma.supplier.findMany({ where: { status: "Active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: PurchaseRow[] = purchases.map((p) => ({
    id: p.id, supplierId: p.supplierId, supplierName: p.supplier.name, date: p.date, invoiceNumber: p.invoiceNumber,
    totalAmount: p.totalAmount, currency: p.currency, notes: p.notes, createdByName: p.createdBy?.name ?? "—",
  }));

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Purchases</div><div className="page-sub">Supplier invoices &amp; outstanding balance</div></div>
        <div className="head-actions"><RecordPurchaseForm suppliers={suppliers} /></div>
      </div>
      <SupplierTabs />
      <PurchasesTable rows={rows} suppliers={suppliers} />
    </>
  );
}

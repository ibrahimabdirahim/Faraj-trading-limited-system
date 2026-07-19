import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { getSuppliersWithBalances } from "@/lib/metrics";
import SupplierTabs from "@/components/suppliers/SupplierTabs";
import PaySupplierForm from "@/components/suppliers/PaySupplierForm";
import PaymentsTable, { type PaymentRow } from "@/components/suppliers/PaymentsTable";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requirePermission("suppliers", "view");

  const [payments, suppliers] = await Promise.all([
    prisma.supplierPayment.findMany({ orderBy: { date: "desc" }, include: { supplier: true, createdBy: true }, take: 300 }),
    getSuppliersWithBalances(),
  ]);

  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id, supplierId: p.supplierId, supplierName: p.supplier.name, date: p.date, amount: p.amount, currency: p.currency,
    method: p.method, referenceNumber: p.referenceNumber, notes: p.notes, createdByName: p.createdBy?.name ?? "—",
    status: p.status, locked: p.locked,
  }));
  const activeSuppliers = suppliers.filter((s) => s.status === "Active");

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Payments</div><div className="page-sub">Payment history &amp; remaining balance</div></div>
        <div className="head-actions"><PaySupplierForm suppliers={activeSuppliers} /></div>
      </div>
      <SupplierTabs />
      <PaymentsTable rows={rows} suppliers={activeSuppliers} />
    </>
  );
}

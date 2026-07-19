import { prisma } from "@/lib/db";
import { checkPageAccess } from "@/lib/permissions";
import SupplierTabs from "@/components/suppliers/SupplierTabs";
import RecordGoodsReceivedForm from "@/components/suppliers/RecordGoodsReceivedForm";
import GoodsReceivedTable, { type GoodsReceiptRow } from "@/components/suppliers/GoodsReceivedTable";
import AccessDenied from "@/components/shared/AccessDenied";

export const dynamic = "force-dynamic";

export default async function GoodsReceivedPage() {
  const { allowed } = await checkPageAccess("suppliers", "view");
  if (!allowed) return <AccessDenied module="Goods Received" />;

  const [receipts, suppliers, branches, products] = await Promise.all([
    prisma.goodsReceipt.findMany({
      orderBy: { date: "desc" },
      include: { supplier: true, branch: true, createdBy: true, receipts: { include: { product: true } } },
      take: 300,
    }),
    prisma.supplier.findMany({ where: { status: "Active" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
  ]);

  const rows: GoodsReceiptRow[] = receipts.map((r) => ({
    id: r.id, date: r.date, supplierName: r.supplier.name, branchName: r.branch.name, note: r.note,
    createdByName: r.createdBy?.name ?? "—",
    lines: r.receipts.map((l) => ({ productName: l.product.name, quantity: l.quantity })),
  }));

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Goods Received</div><div className="page-sub">Stock delivered from suppliers into branches</div></div>
        <div className="head-actions"><RecordGoodsReceivedForm suppliers={suppliers} branches={branches} products={products} /></div>
      </div>
      <SupplierTabs />
      <GoodsReceivedTable rows={rows} />
    </>
  );
}

import { checkPageAccess } from "@/lib/permissions";
import { getSuppliersWithBalances } from "@/lib/metrics";
import SupplierTabs from "@/components/suppliers/SupplierTabs";
import SuppliersTable from "@/components/suppliers/SuppliersTable";
import AddSupplierForm from "@/components/suppliers/AddSupplierForm";
import AccessDenied from "@/components/shared/AccessDenied";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const { allowed } = await checkPageAccess("suppliers", "view");
  if (!allowed) return <AccessDenied module="Suppliers" />;

  const suppliers = await getSuppliersWithBalances();

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Suppliers</div><div className="page-sub">{suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} · purchases, payments &amp; outstanding balances</div></div>
        <div className="head-actions"><AddSupplierForm /></div>
      </div>
      <SupplierTabs />
      <SuppliersTable suppliers={suppliers} />
    </>
  );
}

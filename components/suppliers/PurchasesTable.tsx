"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { deleteSupplierPurchase } from "@/app/actions";
import { fmt, fmtDate } from "@/lib/format";
import RecordPurchaseForm from "./RecordPurchaseForm";

export type PurchaseRow = {
  id: string; supplierId: string; supplierName: string; date: Date; invoiceNumber: string;
  totalAmount: number; currency: string; notes: string; createdByName: string;
};

function RowActions({ row, suppliers }: { row: PurchaseRow; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    const res = await deleteSupplierPurchase(row.id);
    setBusy(false);
    if (res.ok) { setConfirmDelete(false); toast("Purchase deleted", row.supplierName); router.refresh(); }
  }

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      <RecordPurchaseForm suppliers={suppliers} purchase={{ id: row.id, supplierId: row.supplierId, date: row.date.toISOString().slice(0, 10), invoiceNumber: row.invoiceNumber, totalAmount: row.totalAmount, currency: row.currency, notes: row.notes }} />
      <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={15} /></button>
      {confirmDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>Delete this purchase?</h3>
              <button className="close" onClick={() => setConfirmDelete(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body"><p style={{ fontSize: 13 }}>This reduces {row.supplierName}&apos;s outstanding balance calculation. This can&apos;t be undone.</p></div>
            <div className="modal-foot"><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy} onClick={doDelete}>{busy ? "Deleting…" : "Delete"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchasesTable({ rows, suppliers }: { rows: PurchaseRow[]; suppliers: { id: string; name: string }[] }) {
  if (rows.length === 0) {
    return (
      <div className="card"><div className="empty">
        <Icon name="finance" className="ico" size={44} stroke={1.5} />
        <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No purchases yet</div>
        <div style={{ margin: "4px auto 0", maxWidth: 360 }}>Record an invoice to start tracking what&apos;s owed to each supplier.</div>
      </div></div>
    );
  }
  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Supplier</th><th>Invoice #</th><th>Amount</th><th>Currency</th><th>Recorded By</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{fmtDate(r.date)}</td>
              <td className="t-name">{r.supplierName}</td>
              <td className="t-sub">{r.invoiceNumber || "—"}</td>
              <td className="num">{fmt(r.totalAmount)}</td>
              <td className="t-sub">{r.currency}</td>
              <td className="t-sub">{r.createdByName}</td>
              <td><RowActions row={r} suppliers={suppliers} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

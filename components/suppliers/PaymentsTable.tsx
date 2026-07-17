"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { deleteSupplierPayment } from "@/app/actions";
import { fmt, fmtDate } from "@/lib/format";
import PaySupplierForm from "./PaySupplierForm";

export type PaymentRow = {
  id: string; supplierId: string; supplierName: string; date: Date; amount: number; currency: string;
  method: string; referenceNumber: string; notes: string; createdByName: string;
};

function RowActions({ row, suppliers }: { row: PaymentRow; suppliers: { id: string; name: string; balanceCdf: number; balanceUsd: number }[] }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    const res = await deleteSupplierPayment(row.id);
    setBusy(false);
    if (res.ok) { setConfirmDelete(false); toast("Payment deleted", row.supplierName); router.refresh(); }
  }

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
      <PaySupplierForm suppliers={suppliers} payment={{ id: row.id, supplierId: row.supplierId, date: row.date.toISOString().slice(0, 10), amount: row.amount, currency: row.currency, method: row.method, referenceNumber: row.referenceNumber, notes: row.notes }} />
      <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={15} /></button>
      {confirmDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>Delete this payment?</h3>
              <button className="close" onClick={() => setConfirmDelete(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body"><p style={{ fontSize: 13 }}>This increases {row.supplierName}&apos;s outstanding balance back and restores Available Cash by the same amount. This can&apos;t be undone.</p></div>
            <div className="modal-foot"><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy} onClick={doDelete}>{busy ? "Deleting…" : "Delete"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsTable({ rows, suppliers }: { rows: PaymentRow[]; suppliers: { id: string; name: string; balanceCdf: number; balanceUsd: number }[] }) {
  if (rows.length === 0) {
    return (
      <div className="card"><div className="empty">
        <Icon name="coins" className="ico" size={44} stroke={1.5} />
        <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No payments yet</div>
        <div style={{ margin: "4px auto 0", maxWidth: 360 }}>Pay a supplier to reduce their outstanding balance and update Available Cash.</div>
      </div></div>
    );
  }
  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Supplier</th><th>Amount</th><th>Currency</th><th>Method</th><th>Reference</th><th>Recorded By</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{fmtDate(r.date)}</td>
              <td className="t-name">{r.supplierName}</td>
              <td className="num">{fmt(r.amount)}</td>
              <td className="t-sub">{r.currency}</td>
              <td className="t-sub">{r.method}</td>
              <td className="t-sub">{r.referenceNumber || "—"}</td>
              <td className="t-sub">{r.createdByName}</td>
              <td><RowActions row={r} suppliers={suppliers} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { deleteGoodsReceipt } from "@/app/actions";
import { fmt, fmtDate } from "@/lib/format";

export type GoodsReceiptRow = {
  id: string; date: Date; supplierName: string; branchName: string; note: string; createdByName: string;
  lines: { productName: string; quantity: number }[];
};

function RowActions({ row }: { row: GoodsReceiptRow }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    const res = await deleteGoodsReceipt(row.id);
    setBusy(false);
    if (res.ok) { setConfirmDelete(false); toast("Goods receipt deleted", row.supplierName); router.refresh(); }
  }

  return (
    <>
      <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={15} /></button>
      {confirmDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>Delete this goods receipt?</h3>
              <button className="close" onClick={() => setConfirmDelete(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body"><p style={{ fontSize: 13 }}>This removes the record from {row.supplierName} at {row.branchName} on {fmtDate(row.date)}. Stock movement history is kept.</p></div>
            <div className="modal-foot"><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy} onClick={doDelete}>{busy ? "Deleting…" : "Delete"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GoodsReceivedTable({ rows }: { rows: GoodsReceiptRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card"><div className="empty">
        <Icon name="inventory" className="ico" size={44} stroke={1.5} />
        <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No goods received yet</div>
        <div style={{ margin: "4px auto 0", maxWidth: 360 }}>Record a delivery to update branch inventory and track what came from each supplier.</div>
      </div></div>
    );
  }
  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Supplier</th><th>Branch</th><th>Goods</th><th>Recorded By</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{fmtDate(r.date)}</td>
              <td className="t-name">{r.supplierName}</td>
              <td className="t-sub">{r.branchName}</td>
              <td className="t-sub">{r.lines.map((l) => `${l.productName} ×${fmt(l.quantity)}`).join(", ")}</td>
              <td className="t-sub">{r.createdByName}</td>
              <td><div style={{ display: "flex", justifyContent: "flex-end" }}><RowActions row={r} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

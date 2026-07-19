"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import { deleteGoodsReceipt } from "@/app/actions";
import { fmt, fmtDate } from "@/lib/format";

export type GoodsReceiptRow = {
  id: string; date: Date; supplierName: string; branchName: string; note: string; createdByName: string;
  lines: { productName: string; quantity: number }[];
};

function RowActions({ row }: { row: GoodsReceiptRow }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={15} /></button>
      {confirmDelete && (
        <ConfirmDeleteModal
          title="Delete this goods receipt?"
          description={`This removes the record from ${row.supplierName} at ${row.branchName} on ${fmtDate(row.date)}. Stock movement history is kept.`}
          onClose={() => setConfirmDelete(false)}
          onConfirm={(password) => deleteGoodsReceipt(row.id, password)}
          onSuccess={() => { setConfirmDelete(false); toast("Goods receipt deleted", row.supplierName); router.refresh(); }}
        />
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

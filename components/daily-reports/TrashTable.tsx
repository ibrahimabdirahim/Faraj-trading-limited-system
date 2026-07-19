"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import { restoreReport, permanentlyDeleteReport } from "@/app/actions";
import { fmt, fmtDate, reportNumber } from "@/lib/format";

export type TrashedReportRow = {
  id: string;
  date: Date;
  branchName: string;
  branchManager: string;
  cashCdf: number;
  cashUsd: number;
  deletedAt: Date;
  deletedByName: string;
};

function RowActions({ row }: { row: TrashedReportRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const number = reportNumber(row.branchName, row.date);

  async function doRestore() {
    setBusy(true);
    const res = await restoreReport(row.id);
    setBusy(false);
    if (res.ok) { toast("Report restored", `${row.branchName} · ${fmtDate(row.date)}`); router.refresh(); }
  }

  return (
    <>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button className="icon-btn" title="Restore" aria-label="Restore" disabled={busy} onClick={doRestore}><Icon name="transfer" size={15} /></button>
        <button className="icon-btn" title="Delete permanently" aria-label="Delete permanently" disabled={busy} onClick={() => setConfirmPurge(true)}><Icon name="trash" size={15} /></button>
      </div>

      {confirmPurge && (
        <ConfirmDeleteModal
          title={`Permanently delete ${number}?`}
          description="This cannot be undone — the report and its expense lines are removed for good."
          confirmLabel="Delete permanently"
          onClose={() => setConfirmPurge(false)}
          onConfirm={(password) => permanentlyDeleteReport(row.id, password)}
          onSuccess={() => { setConfirmPurge(false); toast("Permanently deleted", `${row.branchName} · ${fmtDate(row.date)}`); router.refresh(); }}
        />
      )}
    </>
  );
}

export default function TrashTable({ rows }: { rows: TrashedReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="card"><div className="empty">
        <Icon name="trash" className="ico" size={44} stroke={1.5} />
        <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>Trash is empty</div>
        <div style={{ margin: "4px auto 0", maxWidth: 360 }}>Deleted daily reports show up here, so nothing is lost by mistake.</div>
      </div></div>
    );
  }

  return (
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Report #</th><th>Date</th><th>Branch</th><th>Cash CDF</th><th>Cash USD</th><th>Deleted</th><th>Deleted By</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="t-sub" style={{ fontFamily: "var(--mono)" }}>{reportNumber(r.branchName, r.date)}</td>
              <td className="num">{fmtDate(r.date)}</td>
              <td><div className="t-name">{r.branchName}</div><div className="t-sub">{r.branchManager}</div></td>
              <td className="num">{fmt(r.cashCdf)}</td>
              <td className="num">{r.cashUsd ? "$" + fmt(r.cashUsd) : "—"}</td>
              <td className="t-sub">{fmtDate(r.deletedAt)}</td>
              <td className="t-sub">{r.deletedByName}</td>
              <td><RowActions row={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

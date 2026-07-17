"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { updateDailyReport, softDeleteReport, unlockReport } from "@/app/actions";
import { fmt, fmtDate, fmtDateInput, reportNumber } from "@/lib/format";
import type { DailyReportRow } from "./DailyReportsTable";

const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;

function singleDayQuery(row: DailyReportRow): string {
  const d = fmtDateInput(row.date);
  const p = new URLSearchParams({ from: d, to: d, branchId: row.branchId });
  return p.toString();
}

export default function ReportRowActions({ row, canEdit, canDelete }: { row: DailyReportRow; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cashCdf, setCashCdf] = useState(String(row.cashCdf || ""));
  const [cashUsd, setCashUsd] = useState(String(row.cashUsd || ""));
  const [note, setNote] = useState(row.note);
  const [expenses, setExpenses] = useState(row.expenses.length ? row.expenses.map((e) => ({ description: e.description, amount: String(e.amount), currency: e.currency })) : [{ description: "", amount: "", currency: "CDF" }]);

  const qs = singleDayQuery(row);
  const number = reportNumber(row.branchName, row.date);

  async function doUnlock() {
    setBusy(true);
    const res = await unlockReport(row.id);
    setBusy(false);
    if (res.ok) { toast("Report unlocked", `${row.branchName} · ${fmtDate(row.date)}`); router.refresh(); }
  }

  async function doSave() {
    setError(null);
    setBusy(true);
    const res = await updateDailyReport({
      id: row.id, cashCdf: parseNum(cashCdf), cashUsd: parseNum(cashUsd), note,
      expenses: expenses.filter((e) => e.description && e.amount).map((e) => ({ description: e.description, amount: parseNum(e.amount), currency: e.currency })),
    });
    setBusy(false);
    if (res.ok) { setEdit(false); toast("Report updated", `${row.branchName} · ${fmtDate(row.date)}`); router.refresh(); }
    else setError(res.error ?? "Could not save changes.");
  }

  async function doDelete() {
    setBusy(true);
    const res = await softDeleteReport(row.id);
    setBusy(false);
    if (res.ok) { setConfirmDelete(false); toast("Moved to Trash", `${row.branchName} · ${fmtDate(row.date)}`); router.refresh(); }
    else { setError(res.error ?? "Could not delete report."); }
  }

  function download(kind: "excel" | "pdf") {
    const a = document.createElement("a");
    a.href = `/api/reports/custom/${kind}?${qs}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(number, `Downloading ${kind === "excel" ? "Excel" : "PDF"}…`);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button className="icon-btn" title="View" aria-label="View" onClick={() => setView(true)}><Icon name="eye" size={15} /></button>
        {row.locked ? (
          canEdit && <button className="icon-btn" title="Unlock to edit/delete" aria-label="Unlock" disabled={busy} onClick={doUnlock}><Icon name="unlock" size={15} /></button>
        ) : (
          <>
            {canEdit && <button className="icon-btn" title="Edit" aria-label="Edit" onClick={() => { setError(null); setEdit(true); }}><Icon name="edit" size={15} /></button>}
            {canDelete && <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => { setError(null); setConfirmDelete(true); }}><Icon name="trash" size={15} /></button>}
          </>
        )}
        <button className="icon-btn" title="Print" aria-label="Print" onClick={() => window.open(`/print/custom?${qs}`, "_blank")}><Icon name="printer" size={15} /></button>
        <button className="icon-btn" title="Export Excel" aria-label="Export Excel" onClick={() => download("excel")}><Icon name="download" size={15} /></button>
        <button className="icon-btn" title="Export PDF" aria-label="Export PDF" onClick={() => download("pdf")}><Icon name="file" size={15} /></button>
      </div>

      {view && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setView(false); }}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-head"><Icon name="report" size={20} stroke={2} /><h3>{number}</h3>
              <button className="close" onClick={() => setView(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="review-block">
                <div className="review-line"><span className="rl">Branch</span><span className="rv">{row.branchName} — {row.branchManager}</span></div>
                <div className="review-line"><span className="rl">Date</span><span className="rv">{fmtDate(row.date)}</span></div>
                <div className="review-line"><span className="rl">Cash CDF</span><span className="rv num">{fmt(row.cashCdf)} FC</span></div>
                <div className="review-line"><span className="rl">Cash USD</span><span className="rv num">${fmt(row.cashUsd)}</span></div>
                <div className="review-line"><span className="rl">Expenses</span><span className="rv num">{fmt(row.expCdf)} FC{row.expUsd ? ` + $${fmt(row.expUsd)}` : ""}</span></div>
                <div className="review-line"><span className="rl">Status</span><span className="rv">{row.status === "approved" ? "Approved · Locked" : "Pending review"}</span></div>
                <div className="review-line"><span className="rl">Created by</span><span className="rv">{row.createdByName}</span></div>
              </div>
              {row.expenses.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label className="field-label">Expense lines</label>
                  {row.expenses.map((e) => (
                    <div key={e.id} className="review-line"><span className="rl">{e.description}</span><span className="rv num">{e.currency === "USD" ? "$" : ""}{fmt(e.amount)}{e.currency === "CDF" ? " FC" : ""}</span></div>
                  ))}
                </div>
              )}
              {row.note && <div style={{ marginTop: 14 }}><label className="field-label">Note</label><p style={{ fontSize: 13 }}>{row.note}</p></div>}
            </div>
            <div className="modal-foot"><button className="btn btn-primary" onClick={() => setView(false)}>Close</button></div>
          </div>
        </div>
      )}

      {edit && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="edit" size={20} stroke={2} /><h3>Edit {number}</h3>
              <button className="close" onClick={() => setEdit(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Cash CDF</label><input className="field num" value={cashCdf} onChange={(e) => setCashCdf(e.target.value)} /></div>
                <div className="fg"><label className="field-label">Cash USD</label><input className="field num" value={cashUsd} onChange={(e) => setCashUsd(e.target.value)} /></div>
              </div>
              <label className="field-label">Expenses</label>
              {expenses.map((ex, i) => (
                <div className="exp-line" key={i}>
                  <input className="field" placeholder="Description" value={ex.description} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  <div className="cur-input"><span className="pre">{ex.currency === "USD" ? "$" : "FC"}</span><input className="num" placeholder="0" value={ex.amount} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} /></div>
                  <select className="field" style={{ padding: 8 }} value={ex.currency} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, currency: e.target.value } : x))}><option>CDF</option><option>USD</option></select>
                  <button className="rm-line" onClick={() => setExpenses((p) => p.filter((_, j) => j !== i))}><Icon name="x" size={15} /></button>
                </div>
              ))}
              <button className="add-line" onClick={() => setExpenses((p) => [...p, { description: "", amount: "", currency: "CDF" }])}><Icon name="plus" size={15} stroke={2.2} />Add another expense</button>
              <label className="field-label" style={{ marginTop: 14 }}>Note</label>
              <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setEdit(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={busy} onClick={doSave}>{busy ? "Saving…" : "Save changes"}</button></div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>Delete {number}?</h3>
              <button className="close" onClick={() => setConfirmDelete(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>This moves the report to Trash. It can be restored later, or permanently deleted from there.</p>
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy} onClick={doDelete}>{busy ? "Deleting…" : "Move to Trash"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

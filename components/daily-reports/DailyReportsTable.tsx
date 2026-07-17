"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/shared/Icon";
import NewReportButton from "@/components/daily-reports/NewReportButton";
import ApproveButton from "@/components/daily-reports/ApproveButton";
import ReportRowActions from "@/components/daily-reports/ReportRowActions";
import { fmt, fmtDate, reportNumber } from "@/lib/format";

export type DailyReportRow = {
  id: string;
  date: Date;
  branchId: string;
  branchName: string;
  branchManager: string;
  cashCdf: number;
  cashUsd: number;
  expCdf: number;
  expUsd: number;
  status: "approved" | "pending";
  locked: boolean;
  createdByName: string;
  note: string;
  expenses: { id: string; description: string; amount: number; currency: string }[];
};

export default function DailyReportsTable({
  rows, branches, fxRate, canEdit, canDelete, missing, pendingToday, trashedCount,
}: {
  rows: DailyReportRow[];
  branches: { id: string; name: string; manager: string }[];
  fxRate: number;
  canEdit: boolean;
  canDelete: boolean;
  missing: number;
  pendingToday: number;
  trashedCount: number;
}) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !`${r.branchName} ${r.branchManager} ${r.createdByName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (branchId !== "all" && r.branchId !== branchId) return false;
    if (status !== "all" && r.status !== status) return false;
    if (from && r.date < new Date(from + "T00:00:00")) return false;
    if (to && r.date > new Date(to + "T23:59:59")) return false;
    return true;
  }), [rows, q, branchId, status, from, to]);

  const active = !!(q || from || to || branchId !== "all" || status !== "all");
  const reset = () => { setQ(""); setFrom(""); setTo(""); setBranchId("all"); setStatus("all"); };

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Daily Reports</div><div className="page-sub">Every evening&apos;s branch report — transcribed from WhatsApp into the system</div></div>
        <div className="head-actions">
          <Link href="/reports-daily/trash" className="btn">
            <Icon name="trash" className="ico" size={15} />Trash{trashedCount > 0 ? ` (${trashedCount})` : ""}
          </Link>
          <Link href="/reports" className="btn"><Icon name="download" className="ico" size={15} />Export</Link>
          <NewReportButton />
        </div>
      </div>

      {(missing > 0 || pendingToday > 0) && (
        <div className="notice"><Icon name="info" className="ico" size={18} />
          <div>{pendingToday > 0 && <><b>{pendingToday} report(s) awaiting approval today.</b> </>}{missing > 0 && <>{missing} branch(es) have not reported today.</>}</div></div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="fg" style={{ minWidth: 180 }}>
            <label className="field-label">Search</label>
            <input className="field" placeholder="Branch, manager, creator…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Start date</label>
            <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">End date</label>
            <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="fg" style={{ minWidth: 160 }}>
            <label className="field-label">Branch</label>
            <select className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="all">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Status</label>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Any status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {active && <button className="btn" onClick={reset}><Icon name="x" size={14} className="ico" />Reset filters</button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="report" className="ico" size={44} stroke={1.5} />
          <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>{rows.length === 0 ? "No reports yet" : "No reports match these filters"}</div>
          <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>
            {rows.length === 0 ? "As branches send their evening WhatsApp reports, enter them here. Each one updates the dashboard, inventory and branch scores automatically." : "Try widening the date range or clearing a filter."}
          </div>
          {rows.length === 0 ? <NewReportButton label="Enter first report" /> : <button className="btn" onClick={reset}>Reset filters</button>}
        </div></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr>
              <th>Report #</th><th>Date</th><th>Branch</th><th>Revenue</th><th>Cash CDF</th><th>Cash USD</th><th>Expenses</th><th>Profit</th><th>Status</th><th>Created By</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((r) => {
                const revenue = r.cashCdf + r.cashUsd * fxRate;
                const profit = r.cashCdf - r.expCdf;
                return (
                  <tr key={r.id}>
                    <td className="t-sub" style={{ fontFamily: "var(--mono)" }}>{reportNumber(r.branchName, r.date)}</td>
                    <td className="num">{fmtDate(r.date)}</td>
                    <td><div className="t-name">{r.branchName}</div><div className="t-sub">{r.branchManager}</div></td>
                    <td className="num">{fmt(Math.round(revenue))} FC</td>
                    <td className="num">{fmt(r.cashCdf)}</td>
                    <td className="num">{r.cashUsd ? "$" + fmt(r.cashUsd) : "—"}</td>
                    <td className="num">{r.expCdf ? fmt(r.expCdf) + " FC" : "—"}{r.expUsd ? " + $" + fmt(r.expUsd) : ""}</td>
                    <td className="num" style={{ color: profit < 0 ? "var(--crit)" : undefined }}>{fmt(profit)} FC</td>
                    <td><span className={`status ${r.status === "approved" ? "locked" : "pending"}`}><i />{r.status === "approved" ? "Approved · Locked" : "Pending review"}</span></td>
                    <td className="t-sub">{r.createdByName}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                        {r.status === "pending" && <ApproveButton id={r.id} name={r.branchName} />}
                        <ReportRowActions row={r} canEdit={canEdit} canDelete={canDelete} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

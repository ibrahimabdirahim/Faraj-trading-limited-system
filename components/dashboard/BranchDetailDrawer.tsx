"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { getBranchDetail, updateBranchNotes } from "@/app/actions";
import { fmt, fmtDate, fmtTime, compact } from "@/lib/format";
import type { BranchDetail } from "@/lib/metrics";

const STATUS_LABEL: Record<BranchDetail["status"], string> = { approved: "Approved · Locked", pending: "Pending review", missing: "Not reported today" };

export default function BranchDetailDrawer({ branchId, branchName, onClose }: { branchId: string | null; branchName: string; onClose: () => void }) {
  const [detail, setDetail] = useState<BranchDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    getBranchDetail(branchId).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setNotes(d?.notes ?? "");
    });
    return () => { cancelled = true; };
  }, [branchId]);

  if (!branchId) return null;
  const loading = !detail || detail.id !== branchId;

  async function saveNotes() {
    if (!branchId) return;
    setSavingNotes(true);
    const res = await updateBranchNotes(branchId, notes);
    setSavingNotes(false);
    if (res.ok) toast("Notes saved", branchName);
  }

  return (
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer">
        <div className="modal-head">
          <Icon name="building" size={20} stroke={2} />
          <h3>{branchName}</h3>
          <button className="close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        <div className="modal-body" style={{ minHeight: 0 }}>
          {loading || !detail ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "30px 0", textAlign: "center" }}>Loading branch details…</div>
          ) : (
            <>
              <div className="review-block">
                <div className="review-line"><span className="rl">Manager</span><span className="rv">{detail.manager || "—"}</span></div>
                <div className="review-line"><span className="rl">Report status</span><span className={`rv status ${detail.status === "approved" ? "locked" : detail.status}`}><i />{STATUS_LABEL[detail.status]}</span></div>
                <div className="review-line"><span className="rl">Last report submitted</span><span className="rv">{detail.lastReportAt ? `${fmtDate(detail.lastReportAt)} · ${fmtTime(detail.lastReportAt)}` : "—"}</span></div>
              </div>

              <label className="field-label">Today</label>
              <div className="review-block">
                <div className="review-line"><span className="rl">Revenue</span><span className="rv num">{fmt(detail.revenueCdf)} FC</span></div>
                <div className="review-line"><span className="rl">Cash collected</span><span className="rv num">{fmt(detail.revenueCdf)} FC · ${fmt(detail.revenueUsd)}</span></div>
                <div className="review-line"><span className="rl">Expenses</span><span className="rv num">{fmt(detail.expenseCdf)} FC{detail.expenseUsd ? ` + $${fmt(detail.expenseUsd)}` : ""}</span></div>
                <div className="review-line"><span className="rl">Profit</span><span className="rv num" style={{ color: detail.profitCdf < 0 ? "var(--crit)" : undefined }}>{fmt(detail.profitCdf)} FC</span></div>
                <div className="review-line"><span className="rl">Products received</span><span className="rv num">{detail.productsReceivedQty ? fmt(detail.productsReceivedQty) : "—"}</span></div>
              </div>

              <label className="field-label">Performance</label>
              <div className="review-block">
                <div className="review-line"><span className="rl">Weekly revenue</span><span className="rv num">{compact(detail.weekly.revenueCdf)} CDF</span></div>
                <div className="review-line"><span className="rl">Weekly profit</span><span className="rv num">{compact(detail.weekly.profitCdf)} CDF</span></div>
                <div className="review-line"><span className="rl">Monthly revenue</span><span className="rv num">{compact(detail.monthly.revenueCdf)} CDF</span></div>
                <div className="review-line"><span className="rl">Monthly profit</span><span className="rv num">{compact(detail.monthly.profitCdf)} CDF</span></div>
                <div className="review-line"><span className="rl">Inventory value (weekly)</span><span className="rv num">{detail.inventoryWeeklyUsd != null ? "$" + fmt(detail.inventoryWeeklyUsd) : "—"}</span></div>
                <div className="review-line"><span className="rl">Inventory value (monthly)</span><span className="rv num">{detail.inventoryMonthlyUsd != null ? "$" + fmt(detail.inventoryMonthlyUsd) : "—"}</span></div>
              </div>

              <label className="field-label">Last 7 days</label>
              <div className="drawer-sparkline">
                {detail.history.map((h) => {
                  const max = Math.max(1, ...detail.history.map((x) => x.revenueCdf));
                  const pct = Math.max(3, Math.round((h.revenueCdf / max) * 100));
                  return (
                    <div className="drawer-spark-col" key={h.label}>
                      <div className="drawer-spark-bar" style={{ height: `${pct}%` }} title={`${h.label}: ${fmt(h.revenueCdf)} CDF`} />
                      <span>{h.label}</span>
                    </div>
                  );
                })}
              </div>

              <label className="field-label">Recent activity</label>
              {detail.activity.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>No recent activity recorded for this branch.</div>
              ) : (
                <div className="review-block">
                  {detail.activity.map((a) => (
                    <div className="review-line" key={a.id}>
                      <span className="rl">{a.action} {a.entity}{a.detail ? ` · ${a.detail}` : ""}</span>
                      <span className="rv" style={{ fontWeight: 500, color: "var(--muted)" }}>{a.userName} · {fmtTime(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              <label className="field-label">Branch notes</label>
              <textarea className="field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note about this branch…" />
              <button className="btn" style={{ marginTop: 8 }} disabled={savingNotes} onClick={saveNotes}>{savingNotes ? "Saving…" : "Save note"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

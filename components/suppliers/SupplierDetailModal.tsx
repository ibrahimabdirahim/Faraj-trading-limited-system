"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/shared/Icon";
import { getSupplierDetailAction } from "@/app/actions";
import { fmt, fmtDate } from "@/lib/format";
import type { SupplierDetail } from "@/lib/metrics";

export default function SupplierDetailModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupplierDetailAction(supplierId).then((d) => { if (!cancelled) setDetail(d); });
    return () => { cancelled = true; };
  }, [supplierId]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-head"><Icon name="truck" size={20} stroke={2} /><h3>{detail?.name ?? "Supplier"}</h3>
          <button className="close" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {!detail ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "30px 0", textAlign: "center" }}>Loading…</div>
          ) : (
            <>
              <div className="review-block">
                <div className="review-line"><span className="rl">Company</span><span className="rv">{detail.company || "—"}</span></div>
                <div className="review-line"><span className="rl">Contact person</span><span className="rv">{detail.contactPerson || "—"}</span></div>
                <div className="review-line"><span className="rl">Phone</span><span className="rv">{detail.phone || "—"}</span></div>
                <div className="review-line"><span className="rl">Status</span><span className={`rv status ${detail.status === "Active" ? "approved" : "missing"}`}><i />{detail.status}</span></div>
                <div className="review-line"><span className="rl">Outstanding balance</span><span className="rv num">{fmt(detail.balanceCdf)} CDF{detail.balanceUsd ? ` · $${fmt(detail.balanceUsd)}` : ""}</span></div>
              </div>

              <label className="field-label">Purchase history</label>
              {detail.purchases.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>No purchases recorded yet.</div>
              ) : (
                <div className="review-block">
                  {detail.purchases.map((p) => (
                    <div className="review-line" key={p.id}><span className="rl">{fmtDate(p.date)} · {p.invoiceNumber || "no invoice #"}</span><span className="rv num">{p.currency === "USD" ? "$" : ""}{fmt(p.totalAmount)}{p.currency === "CDF" ? " FC" : ""}</span></div>
                  ))}
                </div>
              )}

              <label className="field-label">Payment history</label>
              {detail.payments.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 14 }}>No payments recorded yet.</div>
              ) : (
                <div className="review-block">
                  {detail.payments.map((p) => (
                    <div className="review-line" key={p.id}>
                      <span className="rl">{fmtDate(p.date)} · {p.method} <span className={`status ${p.status === "approved" ? "locked" : "pending"}`} style={{ marginLeft: 6 }}><i />{p.status === "approved" ? "Approved" : "Pending"}</span></span>
                      <span className="rv num">{p.currency === "USD" ? "$" : ""}{fmt(p.amount)}{p.currency === "CDF" ? " FC" : ""}</span>
                    </div>
                  ))}
                </div>
              )}

              <label className="field-label">Goods received</label>
              {detail.goodsReceipts.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No goods received yet.</div>
              ) : (
                <div className="review-block">
                  {detail.goodsReceipts.map((g) => (
                    <div className="review-line" key={g.id}>
                      <span className="rl">{fmtDate(g.date)} · {g.branchName}</span>
                      <span className="rv" style={{ fontWeight: 500 }}>{g.lines.map((l) => `${l.productName} ×${fmt(l.quantity)}`).join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}

              {detail.notes && <><label className="field-label">Notes</label><p style={{ fontSize: 13 }}>{detail.notes}</p></>}
            </>
          )}
        </div>
        <div className="modal-foot"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

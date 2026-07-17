"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { compact, fmt } from "@/lib/format";
import type { BranchComparisonRow } from "@/lib/metrics";
import BranchDetailDrawer from "./BranchDetailDrawer";

const SORTS: { key: "revenueCdf" | "revenueUsd" | "performanceScore"; label: string }[] = [
  { key: "revenueCdf", label: "Revenue" },
  { key: "revenueUsd", label: "Cash Collected" },
  { key: "performanceScore", label: "Performance Score" },
];

const MEDAL = ["🥇", "🥈", "🥉"];

function scoreColor(score: number): string {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--crit)";
}

export default function BranchRankingPanel({ rows }: { rows: BranchComparisonRow[] }) {
  const [sortKey, setSortKey] = useState<(typeof SORTS)[number]["key"]>("revenueCdf");
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => [...rows].sort((a, b) => b[sortKey] - a[sortKey]), [rows, sortKey]);

  return (
    <>
      <div className="card" style={{ padding: 18 }}>
        <div className="card-head" style={{ padding: 0, marginBottom: 14 }}>
          <div><h3>Branch Ranking</h3><div className="sub">Today, at a glance — click a branch for full detail</div></div>
          <select className="field" style={{ width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as (typeof SORTS)[number]["key"])}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort by {s.label}</option>)}
          </select>
        </div>

        {sorted.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0" }}>No active branches yet.</div>
        ) : (
          <div className="rank-grid">
            {sorted.map((r, i) => (
              <button className="rank-card" key={r.id} onClick={() => setOpenId(r.id)}>
                <div className="rank-card-top">
                  <span className={`rank-badge ${i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : ""}`}>{i < 3 ? MEDAL[i] : r.rank}</span>
                  <span className="rank-card-name">{r.name}</span>
                  <span className={`bc-trend ${r.trendPct > 0 ? "up" : r.trendPct < 0 ? "down" : ""}`}>
                    {r.trendPct > 0 ? <ArrowUpRight size={12} /> : r.trendPct < 0 ? <ArrowDownRight size={12} /> : null}
                    {Math.abs(r.trendPct).toFixed(0)}%
                  </span>
                </div>
                <div className="rank-card-metric">
                  <span className="rank-card-label">Revenue</span>
                  <span className="rank-card-value">{compact(r.revenueCdf)} CDF</span>
                </div>
                <div className="rank-card-metric">
                  <span className="rank-card-label">Cash</span>
                  <span className="rank-card-value cash">{compact(r.revenueCdf)} CDF <i>·</i> ${fmt(r.revenueUsd)}</span>
                </div>
                <div className="rank-card-foot">
                  <span>Performance</span>
                  <b style={{ color: scoreColor(r.performanceScore) }}>{r.performanceScore}/100</b>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BranchDetailDrawer branchId={openId} branchName={rows.find((r) => r.id === openId)?.name ?? ""} onClose={() => setOpenId(null)} />
    </>
  );
}

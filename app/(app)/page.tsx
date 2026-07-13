import { getDashboard } from "@/lib/metrics";
import { getSettings } from "@/lib/settings";
import { fmt, compact, timeAgo, fmtDate } from "@/lib/format";
import { Spark, AreaChart, BarChart, Donut } from "@/components/charts";
import Icon from "@/components/Icon";
import NewReportButton from "@/components/NewReportButton";
import ToastButton from "@/components/ToastButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

function pct(cur: number, prev: number) {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

const EXP_COLORS = ["var(--brand)", "var(--cdf)", "var(--warn)", "var(--good)", "var(--crit)"];

export default async function DashboardPage() {
  const { branchMetrics, submitted, totalBranches, totals, days, invUsd, expByCat, activity } = await getDashboard();
  const settings = await getSettings();
  const fx = settings.fxRate;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayCdf = days[6]?.cdf ?? 0;
  const cashDelta = pct(todayCdf, days[5]?.cdf ?? 0);
  const combinedCash = totals.cashCdf + totals.cashUsd * fx;
  const ranked = [...branchMetrics];
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const expEntries = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const expTotal = expEntries.reduce((a, e) => a + e[1], 0);

  const hasData = submitted > 0;
  const aiText = hasData
    ? `Today ${submitted} of ${totalBranches} branches reported, collecting ${fmt(totals.cashCdf)} CDF and ${fmt(totals.cashUsd)} USD. ${best?.reportedToday ? `${best.name} leads on performance (score ${best.score}).` : ""} ${worst && !worst.reportedToday ? `${worst.name} has not reported${worst.lastReport ? ` since ${fmtDate(worst.lastReport)}` : " yet"} — worth a direct call.` : ""} Total expenses recorded: ${fmt(totals.expCdf)} CDF.`
    : `No reports have been entered yet today. As you transcribe each branch's evening WhatsApp report, this dashboard, the branch scores and the financial totals will update automatically.`;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">{greeting}</div>
          <div className="page-sub">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {submitted} of {totalBranches} branches reported</div>
        </div>
        <div className="head-actions">
          <NewReportButton variant="plain" />
          <ToastButton title="Receive Products" message="Opening product intake" label="Receive Products" icon="inventory" />
          <ToastButton title="Weekly report" message="Generating this week's summary…" label="Weekly" icon="chart" />
          <ToastButton title="AI Monthly summary" message="Analysing month-over-month performance…" label="AI Monthly" icon="spark" variant="primary" />
        </div>
      </div>

      {/* report status strip */}
      <div className="card strip">
        <div className="strip-lead">
          <div className="ring" style={{ "--p": Math.round((submitted / (totalBranches || 1)) * 100) } as React.CSSProperties}><span>{submitted}/{totalBranches}</span></div>
          <div>
            <div style={{ fontWeight: 640, fontSize: 14 }}>Daily reports submitted</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{totalBranches - submitted > 0 ? `${totalBranches - submitted} still pending today` : "All branches in — great work"}</div>
          </div>
        </div>
        <div className="branch-pips">
          {branchMetrics.map((b) => <div key={b.id} className={`pip ${b.status === "approved" ? "done" : b.status === "pending" ? "pend" : "miss"}`}><i />{b.name}</div>)}
        </div>
      </div>

      {/* KPI dual currency */}
      <div className="grid kpis">
        <div className="card kpi">
          <div className="kpi-top"><div className="kpi-ico" style={{ background: "var(--good-soft)", color: "var(--good)" }}><Icon name="coins" size={16} /></div><div className="kpi-label">Total Cash Today</div><span className="kpi-cur chip-cdf">CDF</span></div>
          <div className="kpi-val num">{fmt(totals.cashCdf)}<span className="unit">CDF</span></div>
          <div className="kpi-second"><span className="chip-usd kpi-cur" style={{ margin: 0 }}>USD</span><b className="num">{fmt(totals.cashUsd)}</b><span className="sm">≈ {compact(combinedCash)} CDF combined</span></div>
          <div className={`kpi-delta ${cashDelta >= 0 ? "up" : "down"}`}>{cashDelta >= 0 ? "▲" : "▼"} {Math.abs(cashDelta).toFixed(1)}% <span style={{ color: "var(--muted)", fontWeight: 500 }}>vs yesterday</span></div>
          <div className="kpi-spark"><Spark data={days.map((d) => d.cdf)} color="var(--good)" /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><div className="kpi-ico" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}><Icon name="bars" size={16} /></div><div className="kpi-label">Today&apos;s Expenses</div><span className="kpi-cur chip-cdf">CDF</span></div>
          <div className="kpi-val num">{fmt(totals.expCdf)}<span className="unit">CDF</span></div>
          <div className="kpi-second"><span className="chip-usd kpi-cur" style={{ margin: 0 }}>USD</span><b className="num">{fmt(totals.expUsd)}</b><span className="sm">across {submitted} report(s)</span></div>
          <div className="kpi-delta"><span style={{ color: "var(--muted)", fontWeight: 500 }}>{hasData ? "recorded today" : "—"}</span></div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><div className="kpi-ico" style={{ background: "var(--brand-soft)", color: "var(--brand-2)" }}><Icon name="trendUp" size={16} /></div><div className="kpi-label">Today&apos;s Profit</div><span className="kpi-cur chip-cdf">CDF</span></div>
          <div className="kpi-val num">{fmt(totals.profitCdf)}<span className="unit">CDF</span></div>
          <div className="kpi-second"><span className="kpi-cur" style={{ margin: 0, background: "var(--good-soft)", color: "var(--good)" }}>NET</span><span className="sm">cash minus expenses</span></div>
          <div className="kpi-delta"><span style={{ color: "var(--muted)", fontWeight: 500 }}>after base cost (once products are set)</span></div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><div className="kpi-ico" style={{ background: "var(--cdf-soft)", color: "var(--cdf)" }}><Icon name="box" size={16} /></div><div className="kpi-label">Inventory Value</div><span className="kpi-cur chip-usd">USD</span></div>
          <div className="kpi-val num">{invUsd ? "$" + compact(invUsd) : "—"}</div>
          <div className="kpi-second"><span className="chip-cdf kpi-cur" style={{ margin: 0 }}>CDF</span><b className="num">{invUsd ? compact(invUsd * fx) : "—"}</b><span className="sm">latest valuations</span></div>
          <div className="kpi-delta"><span style={{ color: "var(--muted)", fontWeight: 500 }}>{invUsd ? "from stock counts" : "enter in Branches"}</span></div>
        </div>
      </div>

      {/* dashboard grid */}
      <div className="grid dash">
        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><div><h3>Cash flow this week</h3><div className="sub">Daily collections across all branches — CDF</div></div></div>
            <div className="chart-wrap"><AreaChart series={[{ data: days.map((d) => d.cdf), color: "var(--brand)" }]} labels={days.map((d) => d.label)} /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <div className="card">
              <div className="card-head"><div><h3>Branch comparison</h3><div className="sub">Today&apos;s cash — CDF</div></div></div>
              <div className="chart-wrap"><BarChart data={branchMetrics.map((b) => ({ name: b.name, lab: b.cashCdf ? compact(b.cashCdf) : "0", v: b.cashCdf, color: b.rank <= 2 && b.cashCdf > 0 ? "var(--brand)" : "var(--brand-soft)" }))} /></div>
            </div>
            <div className="card">
              <div className="card-head"><div><h3>Expenses</h3><div className="sub">By type · today</div></div></div>
              <div className="chart-wrap" style={{ display: "grid", placeItems: "center", paddingTop: 4 }}>
                <Donut data={expEntries.length ? expEntries.map((e, i) => ({ v: e[1], color: EXP_COLORS[i % EXP_COLORS.length] })) : [{ v: 1, color: "var(--border)" }]} centerTop={expTotal ? compact(expTotal) : "0"} centerSub="CDF" />
              </div>
              <div className="legend" style={{ flexDirection: "column", gap: 8, paddingTop: 0 }}>
                {expEntries.length ? expEntries.map((e, i) => <span key={e[0]}><i style={{ background: EXP_COLORS[i % EXP_COLORS.length] }} />{e[0]} · {compact(e[1])}</span>) : <span style={{ color: "var(--muted)" }}>No expenses recorded today</span>}
              </div>
            </div>
          </div>
          <div className="card ai-card">
            <div className="ai-head"><span className="ai-badge"><Icon name="spark" size={13} />AI Daily Summary</span><span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: "auto" }}>Auto-generated</span></div>
            <div className="ai-body">{aiText}</div>
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-head"><div><h3>Business intelligence</h3><div className="sub">Auto-detected</div></div></div>
            {hasData ? (
              <>
                <div className="insight"><div className="insight-ico" style={{ background: "var(--good-soft)", color: "var(--good)" }}><Icon name="trophy" size={18} /></div>
                  <div><h4>Best branch <span className="tag good">Rank 1</span></h4><p>{best.name} — {compact(best.cashCdf)} CDF, score {best.score}</p></div></div>
                <div className="insight"><div className="insight-ico" style={{ background: "var(--crit-soft)", color: "var(--crit)" }}><Icon name="alert" size={18} /></div>
                  <div><h4>Needs attention <span className="tag crit">Rank {worst.rank}</span></h4><p>{worst.name} — {worst.reportedToday ? `score ${worst.score}` : "not reported"}</p></div></div>
                <div className="insight"><div className="insight-ico" style={{ background: "var(--brand-soft)", color: "var(--brand-2)" }}><Icon name="trendUp" size={18} /></div>
                  <div><h4>Highest profit <span className="tag brand">{ranked.slice().sort((a, b) => b.profitCdf - a.profitCdf)[0]?.name}</span></h4><p>{compact(ranked.slice().sort((a, b) => b.profitCdf - a.profitCdf)[0]?.profitCdf ?? 0)} CDF net</p></div></div>
              </>
            ) : (
              <div className="insight"><div className="insight-ico" style={{ background: "var(--brand-soft)", color: "var(--brand-2)" }}><Icon name="info" size={18} /></div>
                <div><h4>Insights appear as you enter reports</h4><p>Best/worst branch, profit leaders and inventory trends are detected automatically.</p></div></div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><div><h3>Branch health</h3><div className="sub">Performance score</div></div><Link className="mini-btn" href="/branches" style={{ marginLeft: "auto" }}>View all</Link></div>
            {branchMetrics.map((b, i) => (
              <div className="lb-row" key={b.id}>
                <div className={`lb-rank ${i < 3 ? "top" : ""}`}>{i + 1}</div>
                <div><div className="lb-name">{b.name}</div><div className="lb-meta">{b.manager} · {b.lastReport ? fmtDate(b.lastReport) : "no report"}</div><div className="lb-bar"><i style={{ width: `${b.score}%` }} /></div></div>
                <div className="lb-score num">{b.score}<span className="sc">/100</span></div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head"><div><h3>Recent activity</h3></div></div>
            <div className="feed">
              {activity.length ? activity.map((a) => {
                const type = a.entity === "Product" || a.entity === "InventoryValuation" ? "stock" : a.entity === "Settings" ? "exp" : "";
                const label = a.entity === "DailyReport" ? (a.action === "approve" ? "Report approved" : "Report entered") : a.entity === "Product" ? "Product added" : a.entity === "InventoryValuation" ? "Inventory value saved" : a.entity === "Settings" ? "Settings updated" : a.action;
                return <div className={`feed-item ${type}`} key={a.id}><div className="feed-dot" /><div><div className="feed-txt"><b>{label}</b>{a.detail ? ` · ${a.detail}` : ""}</div><div className="feed-time">{timeAgo(a.createdAt)}</div></div></div>;
              }) : <div className="feed-item"><div className="feed-dot" /><div><div className="feed-txt">Your activity log will appear here.</div><div className="feed-time">—</div></div></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

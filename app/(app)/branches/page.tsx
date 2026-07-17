import { getBranchMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { fmt, compact, fmtDate } from "@/lib/format";
import { Spark } from "@/components/shared/ChartPrimitives";
import Icon from "@/components/shared/Icon";
import ValuationForm from "@/components/branches/ValuationForm";
import EditBranchForm from "@/components/branches/EditBranchForm";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const metrics = await getBranchMetrics();
  const branches = await prisma.branch.findMany({ where: { type: "branch", active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  const valuations = await prisma.inventoryValuation.findMany({ orderBy: { periodEnding: "desc" }, include: { branch: true } });

  // latest weekly + monthly per branch
  const latest: Record<string, { weekly?: number; weeklyPrev?: number; monthly?: number }> = {};
  for (const v of valuations) {
    const key = v.branchId ?? "wh";
    latest[key] ??= {};
    if (v.periodType === "weekly") {
      if (latest[key].weekly === undefined) latest[key].weekly = v.valueUsd;
      else if (latest[key].weeklyPrev === undefined) latest[key].weeklyPrev = v.valueUsd;
    } else if (v.periodType === "monthly" && latest[key].monthly === undefined) latest[key].monthly = v.valueUsd;
  }

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Branches</div><div className="page-sub">{metrics.length} active locations · ranked by today&apos;s performance score</div></div>
        <div className="head-actions"><ValuationForm branches={branches} /></div>
      </div>

      <div className="grid branch-grid">
        {metrics.map((b) => {
          const initials = b.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
          return (
            <div className="card branch-card" key={b.id}>
              <div className="bc-top">
                <div className="bc-logo" style={{ background: `linear-gradient(140deg,${b.color},color-mix(in srgb,${b.color} 55%,#000))` }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div className="bc-name">{b.name}</div><div className="bc-mgr">{b.manager}</div></div>
                <EditBranchForm branch={{ id: b.id, name: b.name, manager: b.manager, color: b.color, type: "branch" }} />
                <div className="bc-rank">#{b.rank}</div>
              </div>
              <div className="bc-stats">
                <div className="bc-stat"><div className="l">Today&apos;s cash</div><div className="v num">{b.cashCdf ? compact(b.cashCdf) : "—"}</div></div>
                <div className="bc-stat"><div className="l">USD cash</div><div className="v num">{b.cashUsd ? "$" + fmt(b.cashUsd) : "—"}</div></div>
                <div className="bc-stat"><div className="l">Expenses</div><div className="v num">{b.expCdf ? compact(b.expCdf) : "—"}</div></div>
                <div className="bc-stat"><div className="l">Inventory</div><div className="v num">{b.monthlyValUsd ? "$" + compact(b.monthlyValUsd) : "—"}</div></div>
              </div>
              <div className="bc-foot">
                <div className="health">
                  <div className="health-ring" style={{ "--p": b.score, "--hc": b.health } as React.CSSProperties}><b>{b.score}</b></div>
                  <div className="health-lab"><b>{b.score >= 85 ? "Excellent" : b.score >= 65 ? "Healthy" : "At risk"}</b>Last report {b.lastReport ? fmtDate(b.lastReport) : "—"}</div>
                </div>
                <span className={`status ${b.status === "approved" ? "approved" : b.status === "pending" ? "pending" : "missing"}`}><i />{b.status === "approved" ? "Reported" : b.status === "pending" ? "Pending" : "Late"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" />
      <div className="card">
        <div className="card-head"><div><h3>Weekly & monthly inventory valuation</h3><div className="sub">Entered every Friday and month-end by the administrator</div></div></div>
        {valuations.length === 0 ? (
          <div className="empty" style={{ padding: "36px 20px" }}>
            <Icon name="inventory" className="ico" size={40} stroke={1.5} />
            <div style={{ fontWeight: 620, color: "var(--text)" }}>No valuations entered yet</div>
            <div style={{ margin: "4px auto 14px", maxWidth: 340 }}>Every Friday, record each branch&apos;s stock value in CDF and USD. Month-end adds cash-on-hand and warehouse value.</div>
            <ValuationForm branches={branches} />
          </div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Branch</th><th>Latest weekly (USD)</th><th>Δ Week</th><th>Latest monthly</th><th>Trend</th></tr></thead>
            <tbody>
              {metrics.map((b) => {
                const l = latest[b.id] ?? {};
                const dw = l.weekly !== undefined && l.weeklyPrev ? ((l.weekly - l.weeklyPrev) / l.weeklyPrev) * 100 : null;
                return (
                  <tr key={b.id}>
                    <td className="t-name">{b.name}</td>
                    <td className="num" style={{ fontWeight: 640 }}>{l.weekly !== undefined ? "$" + compact(l.weekly) : "—"}</td>
                    <td className={`num ${dw !== null ? (dw >= 0 ? "up" : "down") : ""}`} style={{ fontWeight: 640 }}>{dw !== null ? `${dw >= 0 ? "▲" : "▼"} ${Math.abs(dw).toFixed(1)}%` : "—"}</td>
                    <td className="num">{l.monthly !== undefined ? "$" + compact(l.monthly) : "—"}</td>
                    <td><Spark data={[l.weeklyPrev ?? l.weekly ?? 0, l.weekly ?? 0]} w={70} h={26} color={dw !== null && dw < 0 ? "var(--crit)" : "var(--good)"} fill={false} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

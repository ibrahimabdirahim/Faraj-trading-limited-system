import { prisma } from "@/lib/db";
import { getBranchMetrics } from "@/lib/metrics";
import { compact, fmt, timeAgo } from "@/lib/format";
import Icon from "@/components/Icon";
import ToastButton from "@/components/ToastButton";
import NewReportButton from "@/components/NewReportButton";

export const dynamic = "force-dynamic";

function MiniStat({ label, value, color, delta }: { label: string; value: string; color: string; delta: string }) {
  return <div className="card mini"><div className="l"><span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: "inline-block" }} />{label}</div><div className="v num">{value}</div><div className="d" style={{ color: "var(--muted)" }}>{delta}</div></div>;
}

export default async function InventoryPage() {
  const metrics = await getBranchMetrics();
  const valuations = await prisma.inventoryValuation.findMany({ orderBy: { periodEnding: "desc" } });
  const movements = await prisma.stockMovement.findMany({ orderBy: { date: "desc" }, take: 12, include: { product: true, branch: true } });

  const latestMonthly: Record<string, number> = {};
  let warehouse = 0;
  for (const v of valuations) { const k = v.branchId ?? "wh"; if (v.periodType === "monthly" && latestMonthly[k] === undefined) { latestMonthly[k] = v.valueUsd; if (v.branchId === null) warehouse = v.valueUsd; } }
  const totalUsd = Object.values(latestMonthly).reduce((a, b) => a + b, 0);
  const branchTotal = metrics.reduce((a, b) => a + (b.monthlyValUsd ?? 0), 0);
  const maxBranch = Math.max(1, ...metrics.map((b) => b.monthlyValUsd ?? 0));

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Inventory</div><div className="page-sub">Warehouse &amp; branch stock · valuations · movement history</div></div>
        <div className="head-actions"><ToastButton title="Transfer Stock" message="Move stock between locations" label="Transfer Stock" icon="transfer" /><NewReportButton label="Receive Products" /></div>
      </div>

      <div className="grid mini-stats">
        <MiniStat label="Total inventory value" value={totalUsd ? "$" + compact(totalUsd) : "—"} color="var(--brand)" delta="warehouse + branches" />
        <MiniStat label="Warehouse" value={warehouse ? "$" + compact(warehouse) : "—"} color="var(--cdf)" delta="Head Office stock" />
        <MiniStat label="Branch stock" value={branchTotal ? "$" + compact(branchTotal) : "—"} color="var(--good)" delta="6 branches" />
        <MiniStat label="Movements logged" value={String(movements.length)} color="var(--warn)" delta="recent" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-head"><div><h3>Stock value by branch</h3><div className="sub">Latest monthly valuation — USD</div></div></div>
          <div style={{ padding: "8px 18px 18px" }}>
            {metrics.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ width: 70, fontWeight: 600, fontSize: 13 }}>{b.name}</div>
                <div style={{ flex: 1, height: 8, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${((b.monthlyValUsd ?? 0) / maxBranch) * 100}%`, borderRadius: 5, background: "linear-gradient(90deg,var(--brand),var(--brand-2))" }} /></div>
                <div className="num" style={{ fontWeight: 660, width: 70, textAlign: "right" }}>{b.monthlyValUsd ? "$" + compact(b.monthlyValUsd) : "—"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Recent movements</h3></div></div>
          <div className="feed" style={{ paddingBottom: 14 }}>
            {movements.length ? movements.map((m) => (
              <div className="feed-item stock" key={m.id}><div className="feed-dot" /><div><div className="feed-txt"><b>{m.type === "receipt" ? "+" : "−"}{fmt(m.quantity)}</b> {m.product?.name ?? "stock"} · {m.branch.name}</div><div className="feed-time">{timeAgo(m.date)}</div></div></div>
            )) : <div className="empty" style={{ padding: "40px 20px" }}><Icon name="inventory" className="ico" size={38} stroke={1.5} /><div>Stock movements appear here as you record receipts and transfers.</div></div>}
          </div>
        </div>
      </div>
    </>
  );
}

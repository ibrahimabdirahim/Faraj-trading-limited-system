import { prisma } from "@/lib/db";
import { startOfToday, addDays } from "@/lib/metrics";
import { getSettings } from "@/lib/settings";
import { fmt, compact } from "@/lib/format";
import { AreaChart } from "@/components/charts";
import ToastButton from "@/components/ToastButton";

export const dynamic = "force-dynamic";

function MiniStat({ label, value, color, delta }: { label: string; value: string; color: string; delta: string }) {
  return <div className="card mini"><div className="l"><span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: "inline-block" }} />{label}</div><div className="v num">{value}</div><div className="d" style={{ color: "var(--muted)" }}>{delta}</div></div>;
}

export default async function FinancePage() {
  const settings = await getSettings();
  const today = startOfToday();

  // last 7 days revenue + expenses
  const days: { label: string; rev: number; exp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const reps = await prisma.dailyReport.findMany({ where: { date: d }, include: { expenses: true } });
    const rev = reps.reduce((a, r) => a + r.cashCdf, 0);
    const exp = reps.reduce((a, r) => a + r.expenses.filter((e) => e.currency === "CDF").reduce((s, e) => s + e.amount, 0), 0);
    days.push({ label: d.toLocaleDateString("en-GB", { weekday: "short" }), rev, exp });
  }
  const todayRev = days[6].rev, todayExp = days[6].exp;

  // month vs previous (by report date)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const thisMonth = await prisma.dailyReport.findMany({ where: { date: { gte: monthStart } }, include: { expenses: true } });
  const prevMonth = await prisma.dailyReport.findMany({ where: { date: { gte: prevMonthStart, lt: monthStart } }, include: { expenses: true } });
  const sum = (reps: typeof thisMonth) => ({ rev: reps.reduce((a, r) => a + r.cashCdf, 0), exp: reps.reduce((a, r) => a + r.expenses.filter((e) => e.currency === "CDF").reduce((s, e) => s + e.amount, 0), 0) });
  const tm = sum(thisMonth), pm = sum(prevMonth);
  const growth = (c: number, p: number) => (p ? ((c - p) / p) * 100 : c > 0 ? 100 : 0);

  const rows: [string, string, number][] = [
    ["Cash collected", compact(tm.rev), growth(tm.rev, pm.rev)],
    ["Expenses", compact(tm.exp), growth(tm.exp, pm.exp)],
    ["Net profit", compact(tm.rev - tm.exp), growth(tm.rev - tm.exp, pm.rev - pm.exp)],
  ];

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Finance</div><div className="page-sub">Cash collection · profit &amp; loss · daily, weekly and monthly summaries</div></div>
        <div className="head-actions"><ToastButton title="Export financials" message="Excel or PDF" label="Export" icon="download" /></div>
      </div>

      <div className="grid mini-stats">
        <MiniStat label="Cash today" value={compact(todayRev) + " CDF"} color="var(--good)" delta="all branches" />
        <MiniStat label="Expenses today" value={compact(todayExp) + " CDF"} color="var(--warn)" delta="recorded" />
        <MiniStat label="Net profit today" value={compact(todayRev - todayExp) + " CDF"} color="var(--brand)" delta="cash − expenses" />
        <MiniStat label="This month" value={compact(tm.rev) + " CDF"} color="var(--cdf)" delta={`${thisMonth.length} report(s)`} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-head"><div><h3>Profit &amp; loss — this week</h3><div className="sub">Revenue vs expenses, CDF</div></div></div>
          <div className="chart-wrap"><AreaChart series={[{ data: days.map((d) => d.rev), color: "var(--good)" }, { data: days.map((d) => d.exp), color: "var(--warn)" }]} labels={days.map((d) => d.label)} /></div>
          <div className="legend"><span><i style={{ background: "var(--good)" }} />Revenue</span><span><i style={{ background: "var(--warn)" }} />Expenses</span></div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Month vs previous</h3><div className="sub">{today.toLocaleDateString("en-GB", { month: "short", year: "numeric" })} vs {prevMonthStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</div></div></div>
          <div style={{ padding: "6px 18px 18px" }}>
            {rows.map((r) => (
              <div key={r[0]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>{r[0]}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><b className="num" style={{ fontSize: 14 }}>{r[1]}</b><span className={`num ${r[2] >= 0 ? "up" : "down"}`} style={{ fontWeight: 660, fontSize: 12.5 }}>{r[2] >= 0 ? "▲" : "▼"} {Math.abs(r[2]).toFixed(1)}%</span></div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "var(--muted)", paddingTop: 12 }}>USD figures are tracked separately per report and never auto-converted.</div>
          </div>
        </div>
      </div>
    </>
  );
}

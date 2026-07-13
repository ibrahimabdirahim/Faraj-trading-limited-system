import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/metrics";
import { fmt, fmtDate } from "@/lib/format";
import Icon from "@/components/Icon";
import NewReportButton from "@/components/NewReportButton";
import ToastButton from "@/components/ToastButton";
import ApproveButton from "@/components/ApproveButton";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage() {
  const reports = await prisma.dailyReport.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { branch: true, expenses: true }, take: 100 });
  const today = startOfToday();
  const branches = await prisma.branch.count({ where: { type: "branch", active: true } });
  const reportedToday = await prisma.dailyReport.count({ where: { date: today } });
  const pendingToday = await prisma.dailyReport.count({ where: { date: today, status: "pending" } });
  const missing = branches - reportedToday;

  const expSum = (e: { amount: number; currency: string }[], cur: string) => e.filter((x) => x.currency === cur).reduce((a, x) => a + x.amount, 0);

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Daily Reports</div><div className="page-sub">Every evening&apos;s branch report — transcribed from WhatsApp into the system</div></div>
        <div className="head-actions">
          <ToastButton title="Export" message="Choose Excel, PDF or Print" label="Export" icon="download" />
          <NewReportButton />
        </div>
      </div>

      {(missing > 0 || pendingToday > 0) && (
        <div className="notice"><Icon name="info" className="ico" size={18} />
          <div>{pendingToday > 0 && <><b>{pendingToday} report(s) awaiting approval today.</b> </>}{missing > 0 && <>{missing} branch(es) have not reported for {fmtDate(today)}.</>}</div></div>
      )}

      {reports.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="report" className="ico" size={44} stroke={1.5} />
          <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No reports yet</div>
          <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>As branches send their evening WhatsApp reports, enter them here. Each one updates the dashboard, inventory and branch scores automatically.</div>
          <NewReportButton label="Enter first report" />
        </div></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Branch</th><th>Date</th><th>Cash (CDF)</th><th>Cash (USD)</th><th>Expenses</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td><div className="t-name">{r.branch.name}</div><div className="t-sub">{r.branch.manager}</div></td>
                  <td className="num">{fmtDate(r.date)}</td>
                  <td className="num">{fmt(r.cashCdf)}</td>
                  <td className="num">{r.cashUsd ? fmt(r.cashUsd) : "—"}</td>
                  <td className="num">{expSum(r.expenses, "CDF") ? fmt(expSum(r.expenses, "CDF")) + " FC" : "—"}{expSum(r.expenses, "USD") ? " + $" + fmt(expSum(r.expenses, "USD")) : ""}</td>
                  <td><span className={`status ${r.status === "approved" ? "locked" : "pending"}`}><i />{r.status === "approved" ? "Approved · Locked" : "Pending review"}</span></td>
                  <td>{r.status === "pending" ? <ApproveButton id={r.id} name={r.branch.name} /> : <span className="t-sub">Locked</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

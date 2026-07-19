import { ClipboardList, Receipt, PackageCheck } from "lucide-react";
import { fmt } from "@/lib/format";

function Card({ icon, iconBg, iconColor, label, children }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="card kpi-v2 hover-lift fade-in-up">
      <div className="kpi-top">
        <div className="kpi-ico" style={{ background: iconBg, color: iconColor }}>{icon}</div>
        <div className="kpi-label">{label}</div>
      </div>
      {children}
    </div>
  );
}

export default function TodaySummaryGrid({
  submitted, totalBranches, totals, expenseCount, productsReceived,
}: {
  submitted: number; totalBranches: number;
  totals: { cashCdf: number; cashUsd: number; expCdf: number; expUsd: number; profitCdf: number };
  expenseCount: number;
  productsReceived: { totalQty: number; productCount: number; deliveries: number };
}) {
  const pending = Math.max(0, totalBranches - submitted);

  return (
    <div className="kpi-grid-v2">
      <Card icon={<ClipboardList size={17} />} iconBg="var(--warn-soft)" iconColor="var(--warn)" label="Pending Reports">
        <div className="kpi-val num">{pending}</div>
        <div className="kpi-second"><span className="sm">{pending > 0 ? "awaiting submission" : "nothing outstanding"}</span></div>
      </Card>

      <Card icon={<Receipt size={17} />} iconBg="var(--crit-soft)" iconColor="var(--crit)" label="Today's Expenses">
        <div className="kpi-val num">{fmt(totals.expCdf)}<span className="unit">CDF</span></div>
        <div className="kpi-second"><span className="sm">${fmt(totals.expUsd)} USD · {expenseCount} expense{expenseCount === 1 ? "" : "s"} recorded</span></div>
      </Card>

      <Card icon={<PackageCheck size={17} />} iconBg="var(--faraj-blue)" iconColor="#fff" label="Goods Received Today">
        <div className="kpi-val num">{fmt(productsReceived.totalQty)}<span className="unit">units</span></div>
        <div className="kpi-second"><span className="sm">{productsReceived.productCount} product{productsReceived.productCount === 1 ? "" : "s"} · {productsReceived.deliveries} deliver{productsReceived.deliveries === 1 ? "y" : "ies"}</span></div>
      </Card>
    </div>
  );
}

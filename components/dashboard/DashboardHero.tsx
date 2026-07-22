import { ClipboardCheck } from "lucide-react";
import LiveClock from "./LiveClock";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export default function DashboardHero({
  companyName, userName, greeting, dateLabel, submitted, totalBranches,
}: {
  companyName: string; userName: string; greeting: string; dateLabel: string;
  submitted: number; totalBranches: number;
}) {
  const pending = Math.max(0, totalBranches - submitted);
  const progressPct = totalBranches ? Math.round((submitted / totalBranches) * 100) : 0;

  return (
    <div className="dash-greet fade-in-up">
      <div className="dash-greet-body">
        <div className="dash-greet-eyebrow">{companyName}</div>
        <div className="dash-greet-title">{greeting}, {firstName(userName)} 👋</div>
        <div className="dash-greet-sub">{dateLabel} · <LiveClock /></div>
      </div>

      <div className="dash-greet-reports">
        <div className="dash-greet-reports-ico"><ClipboardCheck size={18} /></div>
        <div>
          <div className="dash-greet-reports-label">Reports Submitted Today</div>
          <div className="dash-greet-reports-val">{submitted}<span>of {totalBranches}</span></div>
          <div className="dash-greet-reports-track"><div className="dash-greet-reports-fill" style={{ width: `${progressPct}%` }} /></div>
          <div className="dash-greet-reports-sub">{pending > 0 ? `${pending} pending` : "All branches in"}</div>
        </div>
      </div>
    </div>
  );
}

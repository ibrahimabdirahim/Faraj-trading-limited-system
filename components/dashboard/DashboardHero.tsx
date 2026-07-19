import { Building2, ClipboardCheck } from "lucide-react";
import LiveClock from "./LiveClock";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export default function DashboardHero({
  companyName, companyLogo, userName, greeting, dateLabel, submitted, totalBranches,
}: {
  companyName: string; companyLogo: string; userName: string; greeting: string; dateLabel: string;
  submitted: number; totalBranches: number;
}) {
  const pending = Math.max(0, totalBranches - submitted);
  const progressPct = totalBranches ? Math.round((submitted / totalBranches) * 100) : 0;

  return (
    <div className="dash-hero fade-in-up">
      <div className="dash-hero-blob b1" />
      <div className="dash-hero-blob b2" />
      <div className="dash-hero-logo">
        {companyLogo ? <img src={companyLogo} alt={companyName} /> : <Building2 size={30} color="var(--faraj-blue-deep)" />}
      </div>
      <div className="dash-hero-body">
        <div className="dash-hero-eyebrow">{companyName}</div>
        <div className="dash-hero-title">{greeting}, {firstName(userName)} 👋</div>
        <div className="dash-hero-sub">{dateLabel} · <LiveClock /></div>
      </div>

      <div className="dash-hero-reports">
        <div className="dash-hero-reports-ico"><ClipboardCheck size={18} /></div>
        <div>
          <div className="dash-hero-reports-label">Reports Submitted Today</div>
          <div className="dash-hero-reports-val">{submitted}<span>of {totalBranches}</span></div>
          <div className="dash-hero-reports-track"><div className="dash-hero-reports-fill" style={{ width: `${progressPct}%` }} /></div>
          <div className="dash-hero-reports-sub">{pending > 0 ? `${pending} pending` : "All branches in"}</div>
        </div>
      </div>
    </div>
  );
}

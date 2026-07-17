import { Building2 } from "lucide-react";
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
        <div className="dash-hero-sub" style={{ marginTop: 2 }}>
          <b style={{ color: "#fff" }}>{submitted} of {totalBranches}</b>{" "}branches have submitted today&apos;s report.
        </div>
      </div>
    </div>
  );
}

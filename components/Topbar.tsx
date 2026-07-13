import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import NewReportButton from "./NewReportButton";
import { fmt } from "@/lib/format";

export default function Topbar({ fxRate, hasNotifications }: { fxRate: number; hasNotifications: boolean }) {
  return (
    <header className="topbar">
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder="Search branches, products, reports…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="fx-pill">
        <span className="fx-dot" />
        <span>1&nbsp;USD&nbsp;=&nbsp;<b className="num">{fmt(fxRate)}</b>&nbsp;CDF</span>
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          {hasNotifications && <span className="dot" />}
          <Icon name="bell" size={18} />
        </button>
        <ThemeToggle />
        <NewReportButton />
      </div>
    </header>
  );
}

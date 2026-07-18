"use client";
import { usePathname } from "next/navigation";
import Icon from "@/components/shared/Icon";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NewReportButton from "@/components/daily-reports/NewReportButton";

export default function Topbar({ hasNotifications }: { hasNotifications: boolean }) {
  const path = usePathname();
  const inSuppliers = path.startsWith("/suppliers");

  return (
    <header className="topbar">
      <div className="search">
        <Icon name="search" size={15} />
        <input placeholder="Search branches, products, reports…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          {hasNotifications && <span className="dot" />}
          <Icon name="bell" size={18} />
        </button>
        <ThemeToggle />
        {!inSuppliers && <NewReportButton />}
      </div>
    </header>
  );
}

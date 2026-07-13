"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV = [
  { group: "Overview", items: [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/reports-daily", label: "Daily Reports", icon: "report", badgeKey: "pending" },
  ] },
  { group: "Operations", items: [
    { href: "/products", label: "Products", icon: "box" },
    { href: "/inventory", label: "Inventory", icon: "inventory" },
    { href: "/branches", label: "Branches", icon: "branch" },
  ] },
  { group: "Finance & Insight", items: [
    { href: "/finance", label: "Finance", icon: "finance" },
    { href: "/reports", label: "Reports", icon: "chart" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ] },
];

export default function Sidebar({ userName, role, pending }: { userName: string; role: string; pending: number }) {
  const path = usePathname();
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <div><div className="brand-name">Faraj&nbsp;OS</div><div className="brand-sub">Business Operating System</div></div>
      </div>
      <nav>
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => {
              const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
              return (
                <Link key={it.href} href={it.href} className={`nav-item ${active ? "active" : ""}`}>
                  <Icon name={it.icon} className="ico" size={18} />
                  {it.label}
                  {it.badgeKey === "pending" && pending > 0 && <span className="nav-badge">{pending}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="admin">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="admin-name">{userName}</div>
            <div className="admin-role">{role === "admin" ? "General Administrator" : role}</div>
          </div>
        </div>
        <form action="/api/logout" method="post">
          <button className="icon-btn" title="Sign out" aria-label="Sign out" type="submit"><Icon name="logout" size={17} /></button>
        </form>
      </div>
    </aside>
  );
}

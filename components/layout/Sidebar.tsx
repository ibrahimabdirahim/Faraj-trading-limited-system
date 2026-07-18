"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/shared/Icon";
import type { PermissionMap, Module } from "@/lib/permissionTypes";

const NAV: { group: string; items: { href: string; label: string; icon: string; module: Module; badgeKey?: string }[] }[] = [
  { group: "Overview", items: [
    { href: "/", label: "Dashboard", icon: "dashboard", module: "dashboard" },
    { href: "/reports-daily", label: "Daily Reports", icon: "report", module: "daily-reports", badgeKey: "pending" },
  ] },
  { group: "Operations", items: [
    { href: "/products", label: "Products", icon: "box", module: "products" },
    { href: "/inventory", label: "Inventory", icon: "inventory", module: "inventory" },
    { href: "/branches", label: "Branches", icon: "branch", module: "branches" },
    { href: "/suppliers", label: "Suppliers", icon: "truck", module: "suppliers" },
  ] },
  { group: "Finance & Insight", items: [
    { href: "/finance", label: "Finance", icon: "finance", module: "finance" },
    { href: "/reports", label: "Reports", icon: "chart", module: "reports" },
  ] },
  { group: "Administration", items: [
    { href: "/users", label: "User Management", icon: "users", module: "user-management" },
    { href: "/settings", label: "Settings", icon: "settings", module: "settings" },
  ] },
];

export default function Sidebar({ userName, role, pending, companyName, companyLogo, permissions }: { userName: string; role: string; pending: number; companyName: string; companyLogo: string; permissions: PermissionMap }) {
  const path = usePathname();
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" title="Go to Dashboard">
        <div className="brand-mark" style={companyLogo ? { padding: 0, overflow: "hidden", background: "var(--surface-2)" } : undefined}>
          {companyLogo ? <img src={companyLogo} alt={companyName} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "F"}
        </div>
        <div><div className="brand-name">Faraj&nbsp;OS</div><div className="brand-sub">Business Operating System</div></div>
      </Link>
      <nav>
        {NAV.map((g) => {
          const items = g.items.filter((it) => permissions[it.module]?.view);
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <div className="nav-label">{g.group}</div>
              {items.map((it) => {
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
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="admin">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="admin-name">{userName}</div>
            <div className="admin-role">{role}</div>
          </div>
        </div>
        <form action="/api/logout" method="post">
          <button className="icon-btn" title="Sign out" aria-label="Sign out" type="submit"><Icon name="logout" size={17} /></button>
        </form>
      </div>
    </aside>
  );
}

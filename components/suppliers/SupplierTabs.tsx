"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/suppliers", label: "Supplier List" },
  { href: "/suppliers/goods-received", label: "Goods Received" },
  { href: "/suppliers/purchases", label: "Purchases" },
  { href: "/suppliers/payments", label: "Payments" },
  { href: "/suppliers/reports", label: "Reports" },
];

export default function SupplierTabs() {
  const path = usePathname();
  return (
    <div className="supplier-tabs">
      {TABS.map((t) => {
        const active = t.href === "/suppliers" ? path === "/suppliers" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`supplier-tab ${active ? "active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

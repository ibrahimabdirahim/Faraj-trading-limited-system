"use client";
import Link from "next/link";
import { FilePlus2, PackagePlus, FileBarChart } from "lucide-react";
import { openReportWizard } from "@/lib/toast";

const TILE_ICON_STYLE = { width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center" } as const;

export default function QuickActionsGrid() {
  return (
    <div className="qa-grid">
      <button className="qa-tile hover-lift" onClick={() => openReportWizard()}>
        <div className="qa-tile-ico" style={{ ...TILE_ICON_STYLE, background: "var(--brand-soft)", color: "var(--brand-2)" }}><FilePlus2 size={15} /></div>
        <div className="qa-tile-text">
          <div className="qa-tile-label">New Daily Report</div>
          <div className="qa-tile-sub">Start a fresh submission</div>
        </div>
      </button>

      <Link href="/products" className="qa-tile hover-lift">
        <div className="qa-tile-ico" style={{ ...TILE_ICON_STYLE, background: "var(--cdf-soft)", color: "var(--cdf)" }}><PackagePlus size={15} /></div>
        <div className="qa-tile-text">
          <div className="qa-tile-label">Receive Goods</div>
          <div className="qa-tile-sub">Log new stock intake</div>
        </div>
      </Link>

      <Link href="/reports" className="qa-tile hover-lift">
        <div className="qa-tile-ico" style={{ ...TILE_ICON_STYLE, background: "var(--faraj-blue)", color: "#fff" }}><FileBarChart size={15} /></div>
        <div className="qa-tile-text">
          <div className="qa-tile-label">Generate Report</div>
          <div className="qa-tile-sub">Export or print any report</div>
        </div>
      </Link>
    </div>
  );
}

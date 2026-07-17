"use client";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import type { ReportFilterState } from "./ReportsPageClient";

function toQueryString(filters?: ReportFilterState): string {
  if (!filters) return "";
  const p = new URLSearchParams();
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.branchId) p.set("branchId", filters.branchId);
  if (filters.supplierId) p.set("supplierId", filters.supplierId);
  if (filters.status) p.set("status", filters.status);
  if (filters.currency) p.set("currency", filters.currency);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default function ReportCard({ slug, title, sub, color, filters }: { slug: string; title: string; sub: string; color: string; filters?: ReportFilterState }) {
  function download(kind: "excel" | "pdf") {
    const a = document.createElement("a");
    a.href = `/api/reports/${slug}/${kind}${toQueryString(filters)}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(title, `Downloading ${kind === "excel" ? "Excel" : "PDF"}…`);
  }

  function print() {
    window.open(`/print/${slug}${toQueryString(filters)}`, "_blank");
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <div className="kpi-ico" style={{ width: 38, height: 38, background: `color-mix(in srgb,${color} 14%,transparent)`, color }}><Icon name="file" size={18} /></div>
      <div><div style={{ fontWeight: 640, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div></div>
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} onClick={() => download("excel")}><Icon name="download" size={11} style={{ marginRight: 4 }} />Excel</button>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} onClick={() => download("pdf")}><Icon name="download" size={11} style={{ marginRight: 4 }} />PDF</button>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} onClick={print}><Icon name="printer" size={11} style={{ marginRight: 4 }} />Print</button>
      </div>
    </div>
  );
}

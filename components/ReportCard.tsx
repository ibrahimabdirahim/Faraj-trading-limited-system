"use client";
import Icon from "./Icon";
import { toast } from "@/lib/toast";

export default function ReportCard({ title, sub, color }: { title: string; sub: string; color: string }) {
  return (
    <button className="card" style={{ padding: 18, textAlign: "left", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}
      onClick={() => toast(title, "Generating — choose Excel, PDF or Print")}>
      <div className="kpi-ico" style={{ width: 38, height: 38, background: `color-mix(in srgb,${color} 14%,transparent)`, color }}><Icon name="file" size={18} /></div>
      <div><div style={{ fontWeight: 640, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div></div>
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <span className="prod-cat" style={{ fontSize: 10.5 }}>Excel</span><span className="prod-cat" style={{ fontSize: 10.5 }}>PDF</span><span className="prod-cat" style={{ fontSize: 10.5 }}>Print</span>
      </div>
    </button>
  );
}

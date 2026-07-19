"use client";
import { useState } from "react";
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

function filenameFromHeader(contentDisposition: string | null, fallback: string): string {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

export default function ReportCard({ slug, title, sub, color, filters }: { slug: string; title: string; sub: string; color: string; filters?: ReportFilterState }) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);

  // Fetches the file ourselves instead of just pointing an <a download> at the API route —
  // that older approach couldn't tell a real file apart from a failed request (e.g. an expired
  // session), so the browser would happily "download" the JSON error body as a fake report.
  async function download(kind: "excel" | "pdf") {
    setBusy(kind);
    try {
      const res = await fetch(`/api/reports/${slug}/${kind}${toQueryString(filters)}`);
      if (res.status === 401) {
        toast("Session expired", "Please sign in again to download this report.", "err");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast("Download failed", "Could not generate the file. Please try again.", "err");
        return;
      }
      const blob = await res.blob();
      const filename = filenameFromHeader(res.headers.get("Content-Disposition"), `${slug}-report.${kind === "excel" ? "xlsx" : "pdf"}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(title, `Downloaded ${kind === "excel" ? "Excel" : "PDF"}`);
    } catch {
      toast("Download failed", "A network error occurred. Please try again.", "err");
    } finally {
      setBusy(null);
    }
  }

  function print() {
    window.open(`/print/${slug}${toQueryString(filters)}`, "_blank");
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <div className="kpi-ico" style={{ width: 38, height: 38, background: `color-mix(in srgb,${color} 14%,transparent)`, color }}><Icon name="file" size={18} /></div>
      <div><div style={{ fontWeight: 640, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div></div>
      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} disabled={busy === "excel"} onClick={() => download("excel")}><Icon name="download" size={11} style={{ marginRight: 4 }} />{busy === "excel" ? "Downloading…" : "Excel"}</button>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} disabled={busy === "pdf"} onClick={() => download("pdf")}><Icon name="download" size={11} style={{ marginRight: 4 }} />{busy === "pdf" ? "Downloading…" : "PDF"}</button>
        <button className="prod-cat" style={{ fontSize: 10.5, cursor: "pointer" }} onClick={print}><Icon name="printer" size={11} style={{ marginRight: 4 }} />Print</button>
      </div>
    </div>
  );
}

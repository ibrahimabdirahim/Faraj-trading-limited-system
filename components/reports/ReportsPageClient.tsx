"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import ReportCard from "./ReportCard";

export type ReportFilterState = { from: string; to: string; branchId: string; supplierId: string; status: string; currency: string };

const EMPTY: ReportFilterState = { from: "", to: "", branchId: "", supplierId: "", status: "", currency: "" };

export default function ReportsPageClient({
  reports,
  branches,
}: {
  reports: { slug: string; title: string; subtitle: string; color: string }[];
  branches: { id: string; name: string }[];
}) {
  const [filters, setFilters] = useState<ReportFilterState>(EMPTY);
  const active = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Reports</div><div className="page-sub">Generate, export and print any report — Excel, PDF or paper</div></div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Start date</label>
            <input type="date" className="field" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">End date</label>
            <input type="date" className="field" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <div className="fg" style={{ minWidth: 160 }}>
            <label className="field-label">Branch</label>
            <select className="field" value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Status</label>
            <select className="field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Any status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Currency</label>
            <select className="field" value={filters.currency} onChange={(e) => setFilters({ ...filters, currency: e.target.value })}>
              <option value="">Both</option>
              <option value="CDF">CDF only</option>
              <option value="USD">USD only</option>
            </select>
          </div>
          {active && (
            <button className="btn" onClick={() => setFilters(EMPTY)}>
              <Icon name="x" size={14} className="ico" />Reset filters
            </button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {reports.map((r) => <ReportCard key={r.slug} slug={r.slug} title={r.title} sub={r.subtitle} color={r.color} filters={filters} />)}
      </div>
    </>
  );
}

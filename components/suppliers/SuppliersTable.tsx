"use client";
import { useMemo, useState } from "react";
import Icon from "@/components/shared/Icon";
import { fmt, fmtDate } from "@/lib/format";
import AddSupplierForm from "./AddSupplierForm";
import SupplierRowActions from "./SupplierRowActions";
import type { SupplierBalance } from "@/lib/metrics";

export default function SuppliersTable({ suppliers }: { suppliers: SupplierBalance[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => suppliers.filter((s) => {
    if (q && !`${s.name} ${s.company} ${s.contactPerson}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  }), [suppliers, q, status]);

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="fg" style={{ minWidth: 200 }}>
            <label className="field-label">Search</label>
            <input className="field" placeholder="Name, company, contact…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Status</label>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Any status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="truck" className="ico" size={44} stroke={1.5} />
          <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>{suppliers.length === 0 ? "No suppliers yet" : "No suppliers match these filters"}</div>
          <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>{suppliers.length === 0 ? "Add your first supplier to start recording purchases and payments." : "Try a different search or status."}</div>
          {suppliers.length === 0 && <AddSupplierForm />}
        </div></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Supplier</th><th>Company</th><th>Contact</th><th>Phone</th><th>Status</th><th>Outstanding Balance</th><th>Last Purchase</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="t-name">{s.name}</td>
                  <td className="t-sub">{s.company || "—"}</td>
                  <td className="t-sub">{s.contactPerson || "—"}</td>
                  <td className="t-sub">{s.phone || "—"}</td>
                  <td><span className={`status ${s.status === "Active" ? "approved" : "missing"}`}><i />{s.status}</span></td>
                  <td className="num">{fmt(s.balanceCdf)} FC{s.balanceUsd ? ` · $${fmt(s.balanceUsd)}` : ""}</td>
                  <td className="num">{s.lastPurchaseAt ? fmtDate(s.lastPurchaseAt) : "—"}</td>
                  <td><SupplierRowActions supplier={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

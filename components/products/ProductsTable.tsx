"use client";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import Icon from "@/components/shared/Icon";
import AddProductForm from "@/components/products/AddProductForm";

export type ProductRow = {
  id: string; name: string; categoryName: string | null;
  baseCost: number; currency: "CDF" | "USD"; unit: string; barcode: string | null; status: string;
};

export default function ProductsTable({
  products, categories,
}: {
  products: ProductRow[];
  categories: { id: string; name: string }[];
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => products.filter((p) => {
    if (q && !`${p.name} ${p.barcode ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (category !== "all" && p.categoryName !== category) return false;
    if (status !== "all" && p.status !== status) return false;
    return true;
  }), [products, q, category, status]);

  const active = !!(q || category !== "all" || status !== "all");
  const reset = () => { setQ(""); setCategory("all"); setStatus("all"); };

  if (products.length === 0) {
    return (
      <div className="card"><div className="empty">
        <Icon name="box" className="ico" size={44} stroke={1.5} />
        <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No products yet</div>
        <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>Head Office adds the catalogue and sets each item&apos;s base cost. Import your existing list from Excel, or add products one by one.</div>
        <AddProductForm categories={categories} />
      </div></div>
    );
  }

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="fg" style={{ minWidth: 200 }}>
            <label className="field-label">Search</label>
            <input className="field" placeholder="Product name, barcode…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="fg" style={{ minWidth: 160 }}>
            <label className="field-label">Category</label>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="fg" style={{ minWidth: 140 }}>
            <label className="field-label">Status</label>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Any status</option>
              <option value="Active">Active</option>
              <option value="Low">Low</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {active && <button className="btn" onClick={reset}>Clear filters</button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="search" className="ico" size={44} stroke={1.5} />
          <div style={{ fontWeight: 640, fontSize: 15, color: "var(--text)" }}>No products match your filters</div>
          <div style={{ margin: "4px auto 16px", maxWidth: 360 }}>Try a different search term or clear the filters.</div>
          <button className="btn" onClick={reset}>Clear filters</button>
        </div></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th>Base cost</th><th>Unit</th><th>Barcode</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="t-name">{p.name}</td>
                  <td><span className="prod-cat">{p.categoryName ?? "—"}</span></td>
                  <td className="num" style={{ fontWeight: 600 }}>{money(p.baseCost, p.currency)}</td>
                  <td className="dot-unit">{p.unit}</td>
                  <td className="dot-unit num">{p.barcode || "—"}</td>
                  <td><span className={`status ${p.status === "Active" ? "approved" : p.status === "Low" ? "pending" : "missing"}`}><i />{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

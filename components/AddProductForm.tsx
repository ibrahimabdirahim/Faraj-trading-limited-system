"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { toast } from "@/lib/toast";
import { createProduct } from "@/app/actions";

const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;

export default function AddProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", categoryId: categories[0]?.id ?? "", baseCost: "", currency: "CDF", unit: "Unit", barcode: "", status: "Active" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) { toast("Name required", "Enter a product name", "err"); return; }
    setSaving(true);
    const res = await createProduct({ name: f.name.trim(), categoryId: f.categoryId, baseCost: parseNum(f.baseCost), currency: f.currency, unit: f.unit, barcode: f.barcode, status: f.status });
    setSaving(false);
    if (res.ok) { setOpen(false); setF({ name: "", categoryId: categories[0]?.id ?? "", baseCost: "", currency: "CDF", unit: "Unit", barcode: "", status: "Active" }); toast("Product added", f.name); router.refresh(); }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Add Product</button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head"><Icon name="box" size={20} stroke={2} /><h3>Add Product</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row"><div className="fg" style={{ flex: 2 }}><label className="field-label">Product name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Sac de ciment 50kg" autoFocus /></div>
                <div className="fg"><label className="field-label">Category</label><select className="field" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Base cost (Head Office)</label><div className="cur-input"><span className="pre">{f.currency === "USD" ? "$" : "FC"}</span><input className="num" value={f.baseCost} onChange={(e) => set("baseCost", e.target.value)} placeholder="0" /></div></div>
                <div className="fg" style={{ maxWidth: 110 }}><label className="field-label">Currency</label><select className="field" value={f.currency} onChange={(e) => set("currency", e.target.value)}><option>CDF</option><option>USD</option></select></div>
                <div className="fg" style={{ maxWidth: 120 }}><label className="field-label">Unit</label><input className="field" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="Bag" /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Barcode (optional)</label><input className="field" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="—" /></div>
                <div className="fg" style={{ maxWidth: 140 }}><label className="field-label">Status</label><select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}><option>Active</option><option>Inactive</option><option>Low</option></select></div>
              </div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Add product"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

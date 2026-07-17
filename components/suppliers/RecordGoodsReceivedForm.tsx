"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createGoodsReceipt } from "@/app/actions";

type Supplier = { id: string; name: string };
type Branch = { id: string; name: string };
type Product = { id: string; name: string; unit: string };
type Line = { productId: string; quantity: string };

const today = () => new Date().toISOString().slice(0, 10);
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
const EMPTY_LINE: Line = { productId: "", quantity: "" };

export default function RecordGoodsReceivedForm({ suppliers, branches, products }: { suppliers: Supplier[]; branches: Branch[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  function reset() {
    setSupplierId(""); setBranchId(branches[0]?.id ?? ""); setDate(today()); setNote(""); setLines([{ ...EMPTY_LINE }]);
  }

  async function save() {
    setError(null);
    const validLines = lines.filter((l) => l.productId && parseNum(l.quantity) > 0);
    if (!supplierId || !branchId || validLines.length === 0) { setError("Supplier, branch and at least one product/quantity are required."); return; }
    setSaving(true);
    const res = await createGoodsReceipt({
      supplierId, branchId, date, note,
      lines: validLines.map((l) => ({ productId: l.productId, quantity: parseNum(l.quantity) })),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      reset();
      toast("Goods received recorded", "Inventory updated");
      router.refresh();
    } else setError(res.error ?? "Could not record goods received.");
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Record goods received</button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head"><Icon name="inventory" size={20} stroke={2} /><h3>Record Goods Received</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Supplier</label>
                  <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="field-label">Branch</label>
                  <select className="field" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ maxWidth: 160 }}><label className="field-label">Date</label>
                  <input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>

              <label className="field-label">Goods &amp; quantity</label>
              {products.length === 0 ? (
                <div className="notice"><Icon name="alert" className="ico" size={18} /><div>No products in the catalogue yet. Add them in <b>Products</b> first.</div></div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  {lines.map((l, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 30px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <select className="field" value={l.productId} onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, productId: e.target.value } : x))}>
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input className="field num" placeholder="Qty" value={l.quantity} onChange={(e) => setLines((p) => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                      <button className="rm-line" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Icon name="x" size={15} /></button>
                    </div>
                  ))}
                  <button className="add-line" onClick={() => setLines((p) => [...p, { ...EMPTY_LINE }])}><Icon name="plus" size={15} stroke={2.2} />Add another product</button>
                </div>
              )}

              <label className="field-label" style={{ marginTop: 14 }}>Notes</label>
              <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Record goods received"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

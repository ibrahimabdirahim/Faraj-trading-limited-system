"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createSupplierPurchase, updateSupplierPurchase } from "@/app/actions";

type Supplier = { id: string; name: string };
type Purchase = { id: string; supplierId: string; date: string; invoiceNumber: string; totalAmount: number; currency: string; notes: string };

const today = () => new Date().toISOString().slice(0, 10);
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;

export default function RecordPurchaseForm({ suppliers, purchase }: { suppliers: Supplier[]; purchase?: Purchase }) {
  const router = useRouter();
  const editing = !!purchase;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(purchase?.supplierId ?? suppliers[0]?.id ?? "");
  const [date, setDate] = useState(purchase?.date ?? today());
  const [invoiceNumber, setInvoiceNumber] = useState(purchase?.invoiceNumber ?? "");
  const [amount, setAmount] = useState(purchase ? String(purchase.totalAmount) : "");
  const [currency, setCurrency] = useState(purchase?.currency ?? "CDF");
  const [notes, setNotes] = useState(purchase?.notes ?? "");

  function reset() {
    setSupplierId(suppliers[0]?.id ?? ""); setDate(today()); setInvoiceNumber(""); setAmount(""); setCurrency("CDF"); setNotes("");
  }

  async function save() {
    setError(null);
    const totalAmount = parseNum(amount);
    if (!supplierId || !totalAmount) { setError("Supplier and amount are required."); return; }
    setSaving(true);
    const input = { supplierId, date, invoiceNumber, totalAmount, currency, notes };
    const res = editing ? await updateSupplierPurchase({ id: purchase.id, ...input }) : await createSupplierPurchase(input);
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      if (!editing) reset();
      toast(editing ? "Purchase updated" : "Purchase recorded", invoiceNumber || undefined);
      router.refresh();
    } else setError(res.error ?? "Could not save purchase.");
  }

  return (
    <>
      {editing ? (
        <button className="icon-btn" title="Edit purchase" aria-label="Edit purchase" onClick={() => setOpen(true)}><Icon name="edit" size={15} /></button>
      ) : (
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Record purchase</button>
      )}
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="finance" size={20} stroke={2} /><h3>{editing ? "Edit Purchase" : "Record Purchase"}</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Supplier</label>
                  <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    {suppliers.length === 0 && <option value="">No suppliers yet</option>}
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ maxWidth: 160 }}><label className="field-label">Purchase date</label>
                  <input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Invoice number</label><input className="field" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="fg"><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, letterSpacing: ".04em" }}>AMOUNT</div>
                  <div className="cur-input"><span className="pre">{currency === "USD" ? "$" : "FC"}</span><input className="num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div></div>
                <div className="fg" style={{ maxWidth: 130 }}><label className="field-label">Currency</label>
                  <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}><option>CDF</option><option>USD</option></select></div>
              </div>
              <label className="field-label">Notes</label>
              <textarea className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : editing ? "Save changes" : "Record purchase"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

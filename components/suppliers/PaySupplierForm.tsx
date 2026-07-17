"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createSupplierPayment, updateSupplierPayment } from "@/app/actions";
import { fmt } from "@/lib/format";

type SupplierOption = { id: string; name: string; balanceCdf: number; balanceUsd: number };
type Payment = { id: string; supplierId: string; date: string; amount: number; currency: string; method: string; referenceNumber: string; notes: string };

const today = () => new Date().toISOString().slice(0, 10);
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
const METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Other"];

export default function PaySupplierForm({ suppliers, payment }: { suppliers: SupplierOption[]; payment?: Payment }) {
  const router = useRouter();
  const editing = !!payment;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(payment?.supplierId ?? suppliers[0]?.id ?? "");
  const [date, setDate] = useState(payment?.date ?? today());
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [currency, setCurrency] = useState(payment?.currency ?? "CDF");
  const [method, setMethod] = useState(payment?.method ?? "Cash");
  const [referenceNumber, setReferenceNumber] = useState(payment?.referenceNumber ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");

  const selectedSupplier = useMemo(() => suppliers.find((s) => s.id === supplierId), [suppliers, supplierId]);

  function reset() {
    setSupplierId(suppliers[0]?.id ?? ""); setDate(today()); setAmount(""); setCurrency("CDF"); setMethod("Cash"); setReferenceNumber(""); setNotes("");
  }

  async function save() {
    setError(null);
    const amt = parseNum(amount);
    if (!supplierId || !amt) { setError("Supplier and amount are required."); return; }
    setSaving(true);
    const input = { supplierId, date, amount: amt, currency, method, referenceNumber, notes };
    const res = editing ? await updateSupplierPayment({ id: payment.id, ...input }) : await createSupplierPayment(input);
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      if (!editing) reset();
      toast(editing ? "Payment updated" : "Payment recorded", selectedSupplier?.name);
      router.refresh();
    } else setError(res.error ?? "Could not save payment.");
  }

  return (
    <>
      {editing ? (
        <button className="icon-btn" title="Edit payment" aria-label="Edit payment" onClick={() => setOpen(true)}><Icon name="edit" size={15} /></button>
      ) : (
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Pay supplier</button>
      )}
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="coins" size={20} stroke={2} /><h3>{editing ? "Edit Payment" : "Pay Supplier"}</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Supplier</label>
                  <select className="field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    {suppliers.length === 0 && <option value="">No suppliers yet</option>}
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="fg" style={{ maxWidth: 160 }}><label className="field-label">Payment date</label>
                  <input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              </div>
              {selectedSupplier && (
                <div className="notice" style={{ margin: "0 0 16px" }}>
                  <Icon name="info" className="ico" size={18} />
                  <div>Outstanding balance: <b>{fmt(selectedSupplier.balanceCdf)} FC</b>{selectedSupplier.balanceUsd ? <> · <b>${fmt(selectedSupplier.balanceUsd)}</b></> : ""}</div>
                </div>
              )}
              <div className="field-row">
                <div className="fg"><div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, letterSpacing: ".04em" }}>AMOUNT</div>
                  <div className="cur-input"><span className="pre">{currency === "USD" ? "$" : "FC"}</span><input className="num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div></div>
                <div className="fg" style={{ maxWidth: 130 }}><label className="field-label">Currency</label>
                  <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}><option>CDF</option><option>USD</option></select></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Payment method</label>
                  <select className="field" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
                <div className="fg"><label className="field-label">Reference number</label><input className="field" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} /></div>
              </div>
              <label className="field-label">Notes</label>
              <textarea className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : editing ? "Save changes" : "Pay supplier"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

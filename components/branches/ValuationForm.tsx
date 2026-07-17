"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { saveValuation } from "@/app/actions";

const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
const today = () => new Date().toISOString().slice(0, 10);

export default function ValuationForm({ branches, defaultPeriodType = "weekly", trigger }: { branches: { id: string; name: string }[]; defaultPeriodType?: "weekly" | "monthly"; trigger?: (open: () => void) => React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ branchId: branches[0]?.id ?? "", periodType: defaultPeriodType, periodEnding: today(), valueCdf: "", valueUsd: "", remarks: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await saveValuation({ branchId: f.branchId, periodType: f.periodType, periodEnding: f.periodEnding, valueCdf: parseNum(f.valueCdf), valueUsd: parseNum(f.valueUsd), remarks: f.remarks });
    setSaving(false);
    if (res.ok) { setOpen(false); toast("Inventory value saved", `${f.periodType} · week ending ${f.periodEnding}`); router.refresh(); }
  }

  return (
    <>
      {trigger ? trigger(() => setOpen(true)) : <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Enter inventory value</button>}
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head"><Icon name="inventory" size={20} stroke={2} /><h3>Inventory Valuation</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Branch</label><select className="field" value={f.branchId} onChange={(e) => set("branchId", e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div className="fg" style={{ maxWidth: 150 }}><label className="field-label">Period</label><select className="field" value={f.periodType} onChange={(e) => set("periodType", e.target.value)}><option value="weekly">Weekly (Friday)</option><option value="monthly">Monthly</option></select></div>
              </div>
              <div className="field-row"><div className="fg"><label className="field-label">Period ending</label><input type="date" className="field num" value={f.periodEnding} onChange={(e) => set("periodEnding", e.target.value)} /></div></div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Value — CDF</label><div className="cur-input"><span className="pre">FC</span><input className="num" value={f.valueCdf} onChange={(e) => set("valueCdf", e.target.value)} placeholder="0" /></div></div>
                <div className="fg"><label className="field-label">Value — USD</label><div className="cur-input"><span className="pre">$</span><input className="num" value={f.valueUsd} onChange={(e) => set("valueUsd", e.target.value)} placeholder="0" /></div></div>
              </div>
              <label className="field-label">Remarks</label>
              <textarea className="field" rows={2} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Stock count notes…" />
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save valuation"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

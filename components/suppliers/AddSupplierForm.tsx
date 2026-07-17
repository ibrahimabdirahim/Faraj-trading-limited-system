"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createSupplier } from "@/app/actions";

const EMPTY = { name: "", company: "", contactPerson: "", phone: "", status: "Active", notes: "" };

export default function AddSupplierForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    const res = await createSupplier(f);
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setF(EMPTY);
      toast("Supplier added", f.name);
      router.refresh();
    } else setError(res.error ?? "Could not create supplier.");
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Add supplier</button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="truck" size={20} stroke={2} /><h3>Add Supplier</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Supplier name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kamoa Trading Co." autoFocus /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Company</label><input className="field" value={f.company} onChange={(e) => set("company", e.target.value)} placeholder="Company / business name" /></div>
                <div className="fg" style={{ maxWidth: 150 }}><label className="field-label">Status</label>
                  <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}><option>Active</option><option>Inactive</option></select></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Contact person</label><input className="field" value={f.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></div>
                <div className="fg"><label className="field-label">Phone number</label><input className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              </div>
              <label className="field-label">Notes</label>
              <textarea className="field" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving || !f.name.trim()} onClick={save}>{saving ? "Adding…" : "Add supplier"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

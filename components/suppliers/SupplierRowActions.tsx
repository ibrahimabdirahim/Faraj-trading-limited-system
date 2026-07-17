"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { updateSupplier, deleteSupplier } from "@/app/actions";
import SupplierDetailModal from "./SupplierDetailModal";
import type { SupplierBalance } from "@/lib/metrics";

export default function SupplierRowActions({ supplier }: { supplier: SupplierBalance }) {
  const router = useRouter();
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: supplier.name, company: supplier.company, contactPerson: supplier.contactPerson, phone: supplier.phone, status: supplier.status, notes: supplier.notes });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true); setError(null);
    const res = await updateSupplier({ id: supplier.id, ...f });
    setBusy(false);
    if (res.ok) { setEdit(false); toast("Supplier updated", f.name); router.refresh(); }
    else setError(res.error ?? "Could not update supplier.");
  }

  async function doDelete() {
    setBusy(true); setError(null);
    const res = await deleteSupplier(supplier.id);
    setBusy(false);
    if (res.ok) { setConfirmDelete(false); toast("Supplier deleted", supplier.name); router.refresh(); }
    else setError(res.error ?? "Could not delete supplier.");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button className="icon-btn" title="View details" aria-label="View details" onClick={() => setView(true)}><Icon name="eye" size={15} /></button>
        <button className="icon-btn" title="Edit supplier" aria-label="Edit supplier" onClick={() => { setError(null); setEdit(true); }}><Icon name="edit" size={15} /></button>
        <button className="icon-btn" title="Delete supplier" aria-label="Delete supplier" onClick={() => { setError(null); setConfirmDelete(true); }}><Icon name="trash" size={15} /></button>
      </div>

      {view && <SupplierDetailModal supplierId={supplier.id} onClose={() => setView(false)} />}

      {edit && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="edit" size={20} stroke={2} /><h3>Edit Supplier</h3>
              <button className="close" onClick={() => setEdit(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Supplier name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Company</label><input className="field" value={f.company} onChange={(e) => set("company", e.target.value)} /></div>
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
            <div className="modal-foot"><button className="btn" onClick={() => setEdit(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={busy || !f.name.trim()} onClick={save}>{busy ? "Saving…" : "Save changes"}</button></div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>Delete {supplier.name}?</h3>
              <button className="close" onClick={() => setConfirmDelete(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <p style={{ fontSize: 13 }}>This can&apos;t be undone. Suppliers with purchase, payment, or goods-received history can&apos;t be deleted — mark them Inactive instead.</p>
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy} onClick={doDelete}>{busy ? "Deleting…" : "Delete supplier"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

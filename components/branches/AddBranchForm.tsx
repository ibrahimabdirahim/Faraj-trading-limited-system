"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createBranch } from "@/app/actions";

const COLORS = ["#0E7C6B", "#DC2626", "#0EA5E9", "#C77300", "#DB2777", "#7C5CE0", "#0A5D50"];

export default function AddBranchForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", manager: "", color: COLORS[0], type: "branch" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    const res = await createBranch(f);
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setF({ name: "", manager: "", color: COLORS[0], type: "branch" });
      toast("Branch added", f.name);
      router.refresh();
    } else setError(res.error ?? "Could not create branch.");
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Add branch</button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-head"><Icon name="branch" size={20} stroke={2} /><h3>Add Branch</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Branch name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kolwezi 1" /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Manager</label><input className="field" value={f.manager} onChange={(e) => set("manager", e.target.value)} placeholder="Manager name" /></div>
                <div className="fg" style={{ maxWidth: 160 }}><label className="field-label">Type</label><select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}><option value="branch">Branch</option><option value="warehouse">Warehouse</option></select></div>
              </div>
              <label className="field-label">Colour</label>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => set("color", c)} style={{ width: 26, height: 26, borderRadius: 8, background: c, border: f.color === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer" }} />
                ))}
              </div>
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving || !f.name.trim()} onClick={save}>{saving ? "Adding…" : "Add branch"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

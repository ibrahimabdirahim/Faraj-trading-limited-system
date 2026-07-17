"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { updateUser } from "@/app/actions";
import BranchAssignmentField, { type BranchAssignmentValue } from "@/components/users/BranchAssignmentField";

export type EditableUser = {
  id: string; name: string; email: string; active: boolean; roleId: string | null;
  allBranches: boolean; branchIds: string[];
};

export default function EditUserForm({ user, branches, roles }: { user: EditableUser; branches: { id: string; name: string }[]; roles: { id: string; key: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: user.name, email: user.email, roleId: user.roleId ?? roles[0]?.id ?? "", active: user.active });
  const [assignment, setAssignment] = useState<BranchAssignmentValue>({
    mode: user.allBranches ? "all" : user.branchIds.length > 1 ? "multiple" : "one",
    branchIds: user.branchIds,
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const selectedRole = roles.find((r) => r.id === f.roleId);
  const isAdminTier = selectedRole?.key === "super_admin" || selectedRole?.key === "general_admin";

  async function save() {
    setSaving(true);
    setError(null);
    const res = await updateUser({ id: user.id, name: f.name, email: f.email, roleId: f.roleId, branchIds: assignment.branchIds, allBranches: assignment.mode === "all", active: f.active });
    setSaving(false);
    if (res.ok) { setOpen(false); toast("User updated", f.name); router.refresh(); }
    else setError(res.error ?? "Could not update user.");
  }

  return (
    <>
      <button className="icon-btn" title="Edit user" aria-label="Edit user" onClick={() => setOpen(true)}><Icon name="edit" size={15} /></button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head"><Icon name="users" size={20} stroke={2} /><h3>Edit User</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Full name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Email</label><input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div className="fg" style={{ maxWidth: 180 }}><label className="field-label">Role</label><select className="field" value={f.roleId} onChange={(e) => set("roleId", e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              {!isAdminTier && <BranchAssignmentField branches={branches} value={assignment} onChange={setAssignment} />}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13 }}>
                <input type="checkbox" checked={f.active} onChange={(e) => setF((p) => ({ ...p, active: e.target.checked }))} />
                Account active
              </label>
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving || !f.name.trim() || !f.email.trim()} onClick={save}>{saving ? "Saving…" : "Save changes"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

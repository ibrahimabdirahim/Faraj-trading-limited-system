"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createUser } from "@/app/actions";
import BranchAssignmentField, { type BranchAssignmentValue } from "@/components/users/BranchAssignmentField";

export default function AddUserForm({ branches, roles }: { branches: { id: string; name: string }[]; roles: { id: string; key: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultRoleId = roles.find((r) => r.key === "branch_manager")?.id ?? roles[0]?.id ?? "";
  const [f, setF] = useState({ name: "", email: "", password: "", roleId: defaultRoleId });
  const [assignment, setAssignment] = useState<BranchAssignmentValue>({ mode: "one", branchIds: branches[0] ? [branches[0].id] : [] });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const selectedRole = roles.find((r) => r.id === f.roleId);
  const isAdminTier = selectedRole?.key === "super_admin" || selectedRole?.key === "general_admin";

  async function save() {
    setSaving(true);
    setError(null);
    const res = await createUser({ name: f.name, email: f.email, password: f.password, roleId: f.roleId, branchIds: assignment.branchIds, allBranches: assignment.mode === "all" });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setF({ name: "", email: "", password: "", roleId: defaultRoleId });
      setAssignment({ mode: "one", branchIds: branches[0] ? [branches[0].id] : [] });
      toast("Login created", `${f.name} can now sign in`);
      router.refresh();
    } else setError(res.error ?? "Could not create login.");
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" className="ico" size={16} />Add user</button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head"><Icon name="users" size={20} stroke={2} /><h3>Add User</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <div className="field-row">
                <div className="fg"><label className="field-label">Full name</label><input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kabongo M." /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Email</label><input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="name@faraj.cd" /></div>
                <div className="fg"><label className="field-label">Password</label><input className="field" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="Temporary password" /></div>
              </div>
              <div className="field-row">
                <div className="fg"><label className="field-label">Role</label><select className="field" value={f.roleId} onChange={(e) => set("roleId", e.target.value)}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              {!isAdminTier && <BranchAssignmentField branches={branches} value={assignment} onChange={setAssignment} />}
              {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving || !f.name.trim() || !f.email.trim() || !f.password} onClick={save}>{saving ? "Creating…" : "Create user"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

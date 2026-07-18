"use client";
import { useMemo, useState } from "react";
import { timeAgo } from "@/lib/format";
import type { PermissionMap } from "@/lib/permissionTypes";
import AddUserForm from "@/components/users/AddUserForm";
import EditUserForm, { type EditableUser } from "@/components/users/EditUserForm";
import UserRowActions from "@/components/users/UserRowActions";
import UserDetailModal, { type UserDetail } from "@/components/users/UserDetailModal";
import PermissionMatrixForm from "@/components/users/PermissionMatrixForm";

export type UserRow = {
  id: string; name: string; email: string; username: string; active: boolean; locked: boolean; lockReason: string;
  roleId: string; roleKey: string; roleName: string; allBranches: boolean; branchIds: string[]; branchNames: string[];
  createdAt: Date; lastLoginAt: Date | null;
  effective: PermissionMap; roleDefaults: PermissionMap;
};

export default function UsersTable({ users, roles, branches, currentUserId }: {
  users: UserRow[]; roles: { id: string; key: string; name: string }[]; branches: { id: string; name: string }[]; currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const filtered = useMemo(() => users.filter((u) => {
    if (q && !`${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (roleFilter !== "all" && u.roleId !== roleFilter) return false;
    if (statusFilter === "active" && (!u.active || u.locked)) return false;
    if (statusFilter === "inactive" && u.active) return false;
    if (statusFilter === "locked" && !u.locked) return false;
    if (branchFilter !== "all" && !u.allBranches && !u.branchIds.includes(branchFilter)) return false;
    return true;
  }), [users, q, roleFilter, statusFilter, branchFilter]);

  return (
    <>
      <div className="page-head">
        <div><div className="page-title">User Management</div><div className="page-sub">{users.length} user{users.length === 1 ? "" : "s"} · roles, permissions and branch access</div></div>
        <div className="head-actions"><AddUserForm branches={branches} roles={roles} /></div>
      </div>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: 14, marginBottom: 14 }}>
        <input className="field" style={{ maxWidth: 240 }} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" style={{ maxWidth: 200 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="field" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
        <select className="field" style={{ maxWidth: 200 }} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {filtered.map((u) => {
              const statusLabel = u.locked ? "Locked" : u.active ? "Active" : "Inactive";
              const statusClass = u.locked ? "blocked" : u.active ? "approved" : "missing";
              const branchLabel = u.allBranches ? "All Branches" : u.branchNames.length ? u.branchNames.join(", ") : "—";
              const detail: UserDetail = {
                id: u.id, name: u.name, email: u.email, roleName: u.roleName, status: statusClass as UserDetail["status"],
                statusLabel, branchLabel, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, lockReason: u.lockReason,
              };
              const editable: EditableUser = { id: u.id, name: u.name, email: u.email, username: u.username, active: u.active, roleId: u.roleId, allBranches: u.allBranches, branchIds: u.branchIds };
              return (
                <tr key={u.id}>
                  <td className="t-name">{u.name}</td>
                  <td className="num"><div>{u.email}</div><div className="t-sub">@{u.username || "—"}</div></td>
                  <td><span className="prod-cat">{u.roleName}</span></td>
                  <td className="dot-unit">{branchLabel}</td>
                  <td><span className={`status ${statusClass}`}><i />{statusLabel}</span></td>
                  <td className="dot-unit">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <UserDetailModal user={detail} />
                      <EditUserForm user={editable} branches={branches} roles={roles} />
                      <PermissionMatrixForm userId={u.id} userName={u.name} roleDefaults={u.roleDefaults} effective={u.effective} />
                      <UserRowActions userId={u.id} userName={u.name} locked={u.locked} active={u.active} isSelf={u.id === currentUserId} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>No users match your filters.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { updateUserPermissions } from "@/app/actions";
import { MODULES, ACTIONS, type Module, type Action, type PermissionMap } from "@/lib/permissionTypes";

const MODULE_LABELS: Record<Module, string> = {
  "dashboard": "Dashboard", "daily-reports": "Daily Reports", "products": "Products", "inventory": "Inventory",
  "branches": "Branches", "finance": "Finance", "reports": "Reports", "suppliers": "Suppliers", "settings": "Settings", "user-management": "User Management",
};
const ACTION_LABELS: Record<Action, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete", approve: "Approve", export: "Export", print: "Print" };

export default function PermissionMatrixForm({ userId, userName, roleDefaults, effective }: { userId: string; userName: string; roleDefaults: PermissionMap; effective: PermissionMap }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grid, setGrid] = useState<PermissionMap>(effective);

  function toggle(m: Module, a: Action) {
    setGrid((prev) => ({ ...prev, [m]: { ...prev[m], [a]: !prev[m][a] } }));
  }

  async function save() {
    setSaving(true);
    const overrides = MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m, action: a, allowed: grid[m][a] })));
    const res = await updateUserPermissions(userId, overrides);
    setSaving(false);
    if (res.ok) { setOpen(false); toast("Permissions updated", userName); router.refresh(); }
  }

  return (
    <>
      <button className="icon-btn" title="Permissions" aria-label="Permissions" onClick={() => setOpen(true)}><Icon name="shield" size={15} /></button>
      {open && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-head"><Icon name="shield" size={20} stroke={2} /><h3>Permissions — {userName}</h3>
              <button className="close" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 10px" }}>Checked cells that differ from the role&apos;s default are saved as a per-user override. Unchecked back to the default removes the override.</p>
              <div className="table-wrap"><table>
                <thead><tr>
                  <th>Module</th>
                  {ACTIONS.map((a) => <th key={a} style={{ textAlign: "center" }}>{ACTION_LABELS[a]}</th>)}
                </tr></thead>
                <tbody>
                  {MODULES.map((m) => (
                    <tr key={m}>
                      <td className="t-name">{MODULE_LABELS[m]}</td>
                      {ACTIONS.map((a) => {
                        const isDefault = roleDefaults[m][a];
                        const checked = grid[m][a];
                        const overridden = checked !== isDefault;
                        return (
                          <td key={a} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(m, a)}
                              title={overridden ? "Overrides the role default" : "Role default"}
                              style={overridden ? { outline: "2px solid var(--warn)", accentColor: "var(--brand)" } : { accentColor: "var(--brand)" }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
            <div className="modal-foot"><button className="btn" onClick={() => setOpen(false)}>Cancel</button><div className="spacer" /><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save permissions"}</button></div>
          </div>
        </div>
      )}
    </>
  );
}

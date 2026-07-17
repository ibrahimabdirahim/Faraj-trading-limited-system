"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { changeOwnPassword } from "@/app/actions";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (newPassword !== confirmPassword) { setError("New passwords don't match."); return; }
    setSaving(true);
    const res = await changeOwnPassword(currentPassword, newPassword);
    setSaving(false);
    if (res.ok) {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast("Password changed", "Use your new password next time you sign in");
    } else setError(res.error ?? "Could not change password.");
  }

  return (
    <div className="set-row">
      <div className="info"><h4>Change my password</h4><p>Update the password for your own account</p></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 260 }}>
        <input className="field" type="password" placeholder="Current password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <input className="field" type="password" placeholder="New password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <input className="field" type="password" placeholder="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p style={{ color: "var(--crit)", fontSize: 12.5, margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" disabled={saving || !currentPassword || !newPassword} onClick={save}>
          <Icon name="key" className="ico" size={15} />{saving ? "Saving…" : "Change password"}
        </button>
      </div>
    </div>
  );
}

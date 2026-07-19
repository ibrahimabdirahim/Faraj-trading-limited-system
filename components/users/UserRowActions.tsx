"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import { setUserLocked, setUserActive, resetUserPassword, setUserPassword, deleteUser } from "@/app/actions";

export default function UserRowActions({ userId, userName, locked, active, isSelf }: { userId: string; userName: string; locked: boolean; active: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"choose" | "set" | null>(null);
  const [revealPassword, setRevealPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function toggleLock() {
    setBusy(true);
    const reason = locked ? undefined : window.prompt("Reason for locking this account (optional):") ?? "";
    const res = await setUserLocked(userId, !locked, reason);
    setBusy(false);
    if (res.ok) { toast(locked ? "Account unlocked" : "Account locked", userName); router.refresh(); }
  }

  async function toggleActive() {
    setBusy(true);
    const res = await setUserActive(userId, !active);
    setBusy(false);
    if (res.ok) { toast(active ? "Account deactivated" : "Account activated", userName); router.refresh(); }
    else toast("Couldn't update account", res.error ?? "");
  }

  async function doGenerate() {
    setBusy(true);
    const res = await resetUserPassword(userId);
    setBusy(false);
    if (res.ok) { setPasswordStep(null); setRevealPassword(res.tempPassword); }
  }

  async function doSetSpecific() {
    setError(null);
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    setBusy(true);
    const res = await setUserPassword(userId, newPassword);
    setBusy(false);
    if (res.ok) {
      setPasswordStep(null); setNewPassword(""); setConfirmPassword("");
      toast("Password set", `${userName}'s password was updated`);
    } else setError(res.error ?? "Could not set password.");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
        <button className="icon-btn" title={locked ? "Unlock account" : "Lock account"} aria-label="Lock/unlock" disabled={busy} onClick={toggleLock}>
          <Icon name={locked ? "unlock" : "lock"} size={15} />
        </button>
        <button className="icon-btn" title={active ? "Deactivate account" : "Activate account"} aria-label="Activate/deactivate" disabled={busy || isSelf} onClick={toggleActive}>
          <Icon name={active ? "checkCircle" : "alert"} size={15} />
        </button>
        <button className="icon-btn" title="Reset password" aria-label="Reset password" disabled={busy} onClick={() => { setError(null); setPasswordStep("choose"); }}>
          <Icon name="key" size={15} />
        </button>
        <button className="icon-btn" title="Delete user" aria-label="Delete user" disabled={busy || isSelf} onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={15} />
        </button>
      </div>

      {passwordStep && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setPasswordStep(null); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="key" size={20} stroke={2} /><h3>Password for {userName}</h3>
              <button className="close" onClick={() => setPasswordStep(null)}><Icon name="x" size={18} /></button></div>
            {passwordStep === "choose" ? (
              <>
                <div className="modal-body">
                  <p style={{ fontSize: 13, color: "var(--muted)" }}>Generate a random password to relay to them, or set a specific one yourself.</p>
                </div>
                <div className="modal-foot" style={{ flexDirection: "column", gap: 8, alignItems: "stretch" }}>
                  <button className="btn btn-primary" disabled={busy} onClick={doGenerate}>{busy ? "Generating…" : "Generate random password"}</button>
                  <button className="btn" onClick={() => setPasswordStep("set")}>Set a specific password</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body">
                  <div className="field-row"><div className="fg"><label className="field-label">New password</label><input className="field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus /></div></div>
                  <div className="field-row"><div className="fg"><label className="field-label">Confirm password</label><input className="field" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div></div>
                  {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
                </div>
                <div className="modal-foot"><button className="btn" onClick={() => setPasswordStep("choose")}>Back</button><div className="spacer" /><button className="btn btn-primary" disabled={busy || newPassword.length < 8} onClick={doSetSpecific}>{busy ? "Saving…" : "Set password"}</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {revealPassword && (
        <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setRevealPassword(null); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head"><Icon name="key" size={20} stroke={2} /><h3>New password for {userName}</h3>
              <button className="close" onClick={() => setRevealPassword(null)}><Icon name="x" size={18} /></button></div>
            <div className="modal-body">
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>Relay this to {userName} now — it won&apos;t be shown again.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="field num" readOnly value={revealPassword} style={{ fontFamily: "var(--mono)", letterSpacing: 0.5 }} onFocus={(e) => e.target.select()} />
                <button className="btn" onClick={() => { navigator.clipboard.writeText(revealPassword); toast("Copied", "Password copied to clipboard"); }}>Copy</button>
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-primary" onClick={() => setRevealPassword(null)}>Done</button></div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title={`Delete ${userName}?`}
          description="This permanently removes their login and sessions. This can't be undone."
          confirmLabel="Delete user"
          onClose={() => setConfirmDelete(false)}
          onConfirm={(password) => deleteUser(userId, password)}
          onSuccess={() => { setConfirmDelete(false); toast("User deleted", userName); router.refresh(); }}
        />
      )}
    </>
  );
}

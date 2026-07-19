"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";

// Shared by every hard-delete flow in the app (Users, Suppliers, Goods Received, Purchases,
// Supplier Payments, permanently emptying Daily Reports Trash) — requires the acting user's
// own password before the destructive server action runs, on top of whatever confirmation
// dialog text is shown here.
export default function ConfirmDeleteModal({
  title, description, confirmLabel = "Delete",
  onConfirm, onClose, onSuccess,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await onConfirm(password);
    setBusy(false);
    if (res.ok) onSuccess();
    else setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head"><Icon name="trash" size={20} stroke={2} /><h3>{title}</h3>
          <button className="close" onClick={onClose}><Icon name="x" size={18} /></button></div>
        <div className="modal-body">
          <p style={{ fontSize: 13 }}>{description}</p>
          <div style={{ marginTop: 12 }}>
            <label className="field-label">Confirm your password to proceed</label>
            <input
              className="field" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && password && !busy) confirm(); }}
              autoFocus
            />
          </div>
          {error && <p style={{ color: "var(--crit)", fontSize: 12.5, marginTop: 10 }}>{error}</p>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <div className="spacer" />
          <button className="btn btn-primary" style={{ background: "var(--crit)", borderColor: "var(--crit)" }} disabled={busy || !password} onClick={confirm}>
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

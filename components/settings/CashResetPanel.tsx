"use client";
import { useState } from "react";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { resetFinancialData, type CashResetScope } from "@/app/actions";

const CONFIRM_PHRASE = "RESET FINANCIAL DATA";

export default function CashResetPanel({ preview }: { preview: { reports: number; expenses: number; payments: number } }) {
  const [wantReports, setWantReports] = useState(false);
  const [wantExpenses, setWantExpenses] = useState(false);
  const [wantPayments, setWantPayments] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Every Expense belongs to exactly one Daily Report (required FK, cascading delete) —
  // selecting Daily Reports always wipes Expenses too, so that checkbox is shown as
  // included-and-locked rather than letting the admin believe it's independent.
  const expensesLocked = wantReports;
  const expensesEffective = wantExpenses || wantReports;

  function toggleFactoryReset(on: boolean) {
    setWantReports(on); setWantExpenses(on); setWantPayments(on);
  }

  const scopes: CashResetScope[] = [
    ...(wantReports ? (["reports"] as const) : []),
    ...(expensesEffective ? (["expenses"] as const) : []),
    ...(wantPayments ? (["payments"] as const) : []),
  ];
  const anySelected = scopes.length > 0;

  const affected = {
    reports: wantReports ? preview.reports : 0,
    expenses: expensesEffective ? preview.expenses : 0,
    payments: wantPayments ? preview.payments : 0,
  };
  const totalAffected = affected.reports + affected.expenses + affected.payments;

  const canContinue = anySelected && phrase === CONFIRM_PHRASE && password.length > 0;

  function reset() {
    setWantReports(false); setWantExpenses(false); setWantPayments(false);
    setPhrase(""); setPassword(""); setReason(""); setConfirming(false); setError(null);
  }

  async function execute() {
    setSubmitting(true); setError(null);
    const res = await resetFinancialData({ scopes, confirmPhrase: phrase, password, reason: reason || undefined });
    setSubmitting(false);
    if (!res.ok) { setError(res.error); return; }
    setConfirming(false);
    setResult(`Deleted ${res.totalDeleted} record(s): ${res.deletedReports} daily report(s), ${res.deletedExpenses} expense(s), ${res.deletedPayments} supplier payment(s).`);
    toast("Financial data reset", `${res.totalDeleted} record(s) permanently deleted`);
    reset();
  }

  return (
    <div style={{ border: "1px solid var(--crit)", borderRadius: 12, padding: 18, background: "var(--crit-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Icon name="alert" size={18} stroke={2} style={{ color: "var(--crit)" }} />
        <h4 style={{ margin: 0, color: "var(--crit)" }}>Danger Zone — Financial Data Reset</h4>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 14px" }}>
        Available Cash, Overall Cash Collected, Today&apos;s Cash Collected, and the Cash Ledger are always
        computed live from Daily Reports, Expenses, and Supplier Payments — there is nothing to reset except
        these underlying records. <b>This permanently deletes data and cannot be undone.</b>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={wantReports} onChange={(e) => setWantReports(e.target.checked)} />
          Daily Reports — cash collected ({preview.reports} record{preview.reports === 1 ? "" : "s"})
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: expensesLocked ? 0.7 : 1 }}>
          <input type="checkbox" checked={expensesEffective} disabled={expensesLocked} onChange={(e) => setWantExpenses(e.target.checked)} />
          Expenses ({preview.expenses} record{preview.expenses === 1 ? "" : "s"}){expensesLocked ? " — included automatically, expenses belong to a report" : ""}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={wantPayments} onChange={(e) => setWantPayments(e.target.checked)} />
          Supplier Payments ({preview.payments} record{preview.payments === 1 ? "" : "s"})
        </label>
        <button
          type="button" className="btn" style={{ alignSelf: "flex-start", marginTop: 4 }}
          onClick={() => toggleFactoryReset(!(wantReports && wantPayments))}
        >
          {wantReports && wantPayments ? "Unselect all" : "Factory Reset — select all"}
        </button>
      </div>

      {anySelected && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>
            This will permanently delete {totalAffected} record{totalAffected === 1 ? "" : "s"}:
            {affected.reports > 0 && ` ${affected.reports} daily report(s)`}
            {affected.expenses > 0 && `${affected.reports > 0 ? "," : ""} ${affected.expenses} expense(s)`}
            {affected.payments > 0 && `${affected.reports > 0 || affected.expenses > 0 ? "," : ""} ${affected.payments} supplier payment(s)`}.
            {wantReports && " The next Daily Report submitted afterwards will start calculating from zero, as if this were a brand-new installation."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
            <label className="field-label">Type <code>{CONFIRM_PHRASE}</code> to confirm</label>
            <input className="field" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM_PHRASE} />
            <label className="field-label">Re-enter your password</label>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <label className="field-label">Reason (optional)</label>
            <textarea className="field" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this reset being performed?" />
            {error && <p style={{ color: "var(--crit)", fontSize: 12.5, margin: 0 }}>{error}</p>}
            <button className="btn" style={{ background: "var(--crit)", color: "#fff", borderColor: "var(--crit)" }} disabled={!canContinue} onClick={() => setConfirming(true)}>
              <Icon name="alert" className="ico" size={15} />Continue to final confirmation
            </button>
          </div>
        </div>
      )}

      {result && <p style={{ fontSize: 12.5, color: "var(--good)", marginTop: 12 }}>{result}</p>}

      {confirming && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-head"><Icon name="alert" size={20} stroke={2} style={{ color: "var(--crit)" }} /><h3>Are you absolutely sure?</h3></div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5 }}>
                You are about to <b>permanently delete {totalAffected} record{totalAffected === 1 ? "" : "s"}</b>.
                This cannot be undone — there is no backup or recovery built into this action.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setConfirming(false)} disabled={submitting}>Cancel</button>
              <div className="spacer" />
              <button className="btn" style={{ background: "var(--crit)", color: "#fff", borderColor: "var(--crit)" }} onClick={execute} disabled={submitting}>
                {submitting ? "Deleting…" : `Permanently delete ${totalAffected} record${totalAffected === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/app/actions";
import { toast } from "@/lib/toast";

const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;

export default function SettingsForm({ initial }: { initial: { companyName: string; companyAddress: string; companyPhone: string; companyEmail: string; fxRate: number; primaryCurrency: string; rounding: string } }) {
  const router = useRouter();
  const [f, setF] = useState({
    companyName: initial.companyName, companyAddress: initial.companyAddress, companyPhone: initial.companyPhone, companyEmail: initial.companyEmail,
    fxRate: String(initial.fxRate), primaryCurrency: initial.primaryCurrency, rounding: initial.rounding,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await updateSettings({
      companyName: f.companyName, companyAddress: f.companyAddress, companyPhone: f.companyPhone, companyEmail: f.companyEmail,
      fxRate: String(parseNum(f.fxRate)), primaryCurrency: f.primaryCurrency, rounding: f.rounding,
    });
    setSaving(false);
    if (res.ok) { toast("Settings saved", "Currency & company updated"); router.refresh(); }
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, marginBottom: 4 }}>Currencies & Company</h3>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px" }}>Every figure is tracked in both CDF and USD. The exchange rate is used only for combined display totals.</p>
      <div className="set-row"><div className="info"><h4>Company name</h4><p>Shown on reports and exports</p></div>
        <input className="field" style={{ maxWidth: 240 }} value={f.companyName} onChange={(e) => set("companyName", e.target.value)} /></div>
      <div className="set-row"><div className="info"><h4>Company address</h4><p>Shown in the header of every report</p></div>
        <input className="field" style={{ maxWidth: 280 }} value={f.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} placeholder="e.g. Avenue Kasavubu, Kolwezi, DRC" /></div>
      <div className="set-row"><div className="info"><h4>Phone number</h4><p>Shown in the header of every report</p></div>
        <input className="field" style={{ maxWidth: 200 }} value={f.companyPhone} onChange={(e) => set("companyPhone", e.target.value)} placeholder="+243 …" /></div>
      <div className="set-row"><div className="info"><h4>Email</h4><p>Shown in the header of every report</p></div>
        <input className="field" style={{ maxWidth: 240 }} type="email" value={f.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} placeholder="info@faraj.cd" /></div>
      <div className="set-row"><div className="info"><h4>Base currencies</h4><p>Always recorded separately — no automatic mixing</p></div>
        <span className="prod-cat" style={{ color: "var(--cdf)", borderColor: "var(--cdf)", background: "var(--cdf-soft)" }}>CDF</span>
        <span className="prod-cat" style={{ color: "var(--usd)", borderColor: "var(--usd)", background: "var(--usd-soft)" }}>USD</span></div>
      <div className="set-row"><div className="info"><h4>Exchange rate</h4><p>1 USD in Congolese Francs — for combined totals only</p></div>
        <div className="cur-input" style={{ width: 190 }}><span className="pre">1 USD =</span><input className="num" value={f.fxRate} onChange={(e) => set("fxRate", e.target.value)} /></div></div>
      <div className="set-row"><div className="info"><h4>Primary display currency</h4><p>Shown first on cards; the other is always beside it</p></div>
        <select className="field" style={{ maxWidth: 220 }} value={f.primaryCurrency} onChange={(e) => set("primaryCurrency", e.target.value)}><option value="CDF">CDF (Congolese Franc)</option><option value="USD">USD (US Dollar)</option></select></div>
      <div className="set-row"><div className="info"><h4>Rounding</h4><p>CDF reporting precision</p></div>
        <select className="field" style={{ maxWidth: 200 }} value={f.rounding} onChange={(e) => set("rounding", e.target.value)}><option value="100">Nearest 100 CDF</option><option value="1000">Nearest 1,000 CDF</option><option value="1">Exact</option></select></div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}

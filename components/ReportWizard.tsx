"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { toast } from "@/lib/toast";
import { createDailyReport } from "@/app/actions";
import { fmt } from "@/lib/format";

type Branch = { id: string; name: string; manager: string };
type Product = { id: string; name: string; unit: string };
type Receipt = { productId: string; quantity: string; supplier: string; note: string };
type Expense = { description: string; amount: string; currency: string };

const STEP_LABELS = ["Setup", "Stock In", "Cash", "Expenses", "Review"];
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportWizard({ branches, fxRate }: { branches: Branch[]; fxRate: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [source, setSource] = useState("WhatsApp report");
  const [note, setNote] = useState("");
  const [hasStock, setHasStock] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([{ productId: "", quantity: "", supplier: "", note: "" }]);
  const [cashCdf, setCashCdf] = useState("");
  const [cashUsd, setCashUsd] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([{ description: "", amount: "", currency: "CDF" }]);

  const reset = useCallback(() => {
    setStep(0); setBranchId(branches[0]?.id ?? ""); setDate(today()); setSource("WhatsApp report");
    setNote(""); setHasStock(false); setReceipts([{ productId: "", quantity: "", supplier: "", note: "" }]);
    setCashCdf(""); setCashUsd(""); setExpenses([{ description: "", amount: "", currency: "CDF" }]);
  }, [branches]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      reset();
      if (d?.branchId) setBranchId(d.branchId);
      setOpen(true);
      fetch("/api/products").then((r) => r.json()).then((j) => setProducts(j.products || [])).catch(() => setProducts([]));
    };
    window.addEventListener("faraj:new-report", handler);
    return () => window.removeEventListener("faraj:new-report", handler);
  }, [reset]);

  if (!open) return null;

  const combined = parseNum(cashCdf) + parseNum(cashUsd) * fxRate;
  const branch = branches.find((b) => b.id === branchId);
  const expTotalCdf = expenses.filter((e) => e.currency === "CDF").reduce((a, e) => a + parseNum(e.amount), 0);
  const expTotalUsd = expenses.filter((e) => e.currency === "USD").reduce((a, e) => a + parseNum(e.amount), 0);

  async function submit() {
    setSaving(true);
    const res = await createDailyReport({
      branchId, date, cashCdf: parseNum(cashCdf), cashUsd: parseNum(cashUsd), source, note,
      receipts: hasStock ? receipts.filter((r) => r.productId && r.quantity).map((r) => ({ productId: r.productId, quantity: parseNum(r.quantity), supplier: r.supplier, note: r.note })) : [],
      expenses: expenses.filter((e) => e.description && e.amount).map((e) => ({ description: e.description, amount: parseNum(e.amount), currency: e.currency })),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      toast("Report submitted", `${branch?.name} · ${date} saved — dashboard updated`);
      router.refresh();
    } else {
      toast("Could not save", res.error || "Please try again", "err");
    }
  }

  const next = () => (step === 4 ? submit() : setStep((s) => Math.min(4, s + 1)));

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal">
        <div className="modal-head">
          <Icon name="report" size={20} stroke={2} />
          <h3>New Daily Report</h3>
          <button className="close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="steps">
          {STEP_LABELS.map((l, i) => (
            <div key={l} className={`step ${i === step ? "on" : ""} ${i < step ? "done" : ""}`}>
              <div className="step-num">{i < step ? <Icon name="check" size={13} stroke={3} /> : i + 1}</div>{l}
            </div>
          ))}
        </div>
        <div className="modal-body">
          {step === 0 && (
            <>
              <label className="field-label">Which branch is this report for?</label>
              <select className="field" style={{ marginBottom: 16 }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.manager}</option>)}
              </select>
              <div className="field-row">
                <div className="fg"><label className="field-label">Report date</label><input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div className="fg"><label className="field-label">Source</label>
                  <select className="field" value={source} onChange={(e) => setSource(e.target.value)}><option>WhatsApp report</option><option>Phone call</option><option>Paper slip</option></select></div>
              </div>
              <div className="notice" style={{ margin: "4px 0 0" }}><Icon name="info" className="ico" size={18} />
                <div>You&apos;re transcribing today&apos;s report from <b>{branch?.manager}</b>. Employees don&apos;t log in — you enter it here.</div></div>
            </>
          )}

          {step === 1 && (
            <>
              <label className="field-label">Did this branch receive products today?</label>
              <div className="choice-row">
                <div className={`choice ${hasStock ? "sel" : ""}`} onClick={() => setHasStock(true)}><div className="big">Yes, stock came in</div><div className="sm">Record what arrived</div></div>
                <div className={`choice ${!hasStock ? "sel" : ""}`} onClick={() => setHasStock(false)}><div className="big">No products</div><div className="sm">Skip to cash</div></div>
              </div>
              {hasStock && (products.length === 0 ? (
                <div className="notice" style={{ marginTop: 12 }}><Icon name="alert" className="ico" size={18} />
                  <div>No products in the catalogue yet. Add them in <b>Products</b> first, then you can record stock here.</div></div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  {receipts.map((r, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr 30px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <select className="field" value={r.productId} onChange={(e) => setReceipts((p) => p.map((x, j) => j === i ? { ...x, productId: e.target.value } : x))}>
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input className="field num" placeholder="Qty" value={r.quantity} onChange={(e) => setReceipts((p) => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                      <input className="field" placeholder="Supplier" value={r.supplier} onChange={(e) => setReceipts((p) => p.map((x, j) => j === i ? { ...x, supplier: e.target.value } : x))} />
                      <button className="rm-line" onClick={() => setReceipts((p) => p.filter((_, j) => j !== i))}><Icon name="x" size={15} /></button>
                    </div>
                  ))}
                  <button className="add-line" onClick={() => setReceipts((p) => [...p, { productId: "", quantity: "", supplier: "", note: "" }])}><Icon name="plus" size={15} stroke={2.2} />Add another product</button>
                </div>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <label className="field-label">Cash collected today — both currencies</label>
              <div className="field-row">
                <div className="fg"><div style={{ fontSize: 11, fontWeight: 700, color: "var(--cdf)", marginBottom: 6, letterSpacing: ".04em" }}>CDF</div>
                  <div className="cur-input"><span className="pre">FC</span><input className="num" inputMode="numeric" value={cashCdf} onChange={(e) => setCashCdf(e.target.value)} placeholder="0" /></div></div>
                <div className="fg"><div style={{ fontSize: 11, fontWeight: 700, color: "var(--usd)", marginBottom: 6, letterSpacing: ".04em" }}>USD</div>
                  <div className="cur-input"><span className="pre">$</span><input className="num" inputMode="numeric" value={cashUsd} onChange={(e) => setCashUsd(e.target.value)} placeholder="0" /></div></div>
              </div>
              <div className="review-total" style={{ marginTop: 4 }}><span>Combined (at 1 USD = {fmt(fxRate)} CDF)</span><span className="num">≈ {fmt(Math.round(combined))} CDF</span></div>
              <label className="field-label">Notes</label>
              <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any cash discrepancy or comment…" />
            </>
          )}

          {step === 3 && (
            <>
              <label className="field-label">Expenses today</label>
              {expenses.map((ex, i) => (
                <div className="exp-line" key={i}>
                  <input className="field" placeholder="Expense description" value={ex.description} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
                  <div className="cur-input"><span className="pre">{ex.currency === "USD" ? "$" : "FC"}</span><input className="num" inputMode="numeric" placeholder="0" value={ex.amount} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} /></div>
                  <select className="field" style={{ padding: 8 }} value={ex.currency} onChange={(e) => setExpenses((p) => p.map((x, j) => j === i ? { ...x, currency: e.target.value } : x))}><option>CDF</option><option>USD</option></select>
                  <button className="rm-line" onClick={() => setExpenses((p) => p.filter((_, j) => j !== i))}><Icon name="x" size={15} /></button>
                </div>
              ))}
              <button className="add-line" onClick={() => setExpenses((p) => [...p, { description: "", amount: "", currency: "CDF" }])}><Icon name="plus" size={15} stroke={2.2} />Add another expense</button>
            </>
          )}

          {step === 4 && (
            <>
              <div style={{ fontWeight: 640, fontSize: 15, marginBottom: 14 }}>Review — {branch?.name} · {date}</div>
              <div className="review-block">
                <div className="review-line"><span className="rl">Products received</span><span className="rv">{hasStock ? `${receipts.filter((r) => r.productId && r.quantity).length} item(s)` : "None"}</span></div>
                <div className="review-line"><span className="rl">Cash — CDF</span><span className="rv num">{fmt(parseNum(cashCdf))} FC</span></div>
                <div className="review-line"><span className="rl">Cash — USD</span><span className="rv num">${fmt(parseNum(cashUsd))}</span></div>
                <div className="review-line"><span className="rl">Expenses</span><span className="rv num">{fmt(expTotalCdf)} FC{expTotalUsd ? ` + $${fmt(expTotalUsd)}` : ""} · {expenses.filter((e) => e.description && e.amount).length} item(s)</span></div>
              </div>
              <div className="review-total"><span>Net cash</span><span className="num">{fmt(parseNum(cashCdf) - expTotalCdf)} FC + ${fmt(parseNum(cashUsd) - expTotalUsd)}</span></div>
              <div className="notice" style={{ background: "var(--good-soft)", borderColor: "color-mix(in srgb,var(--good) 30%,transparent)", margin: 0 }}>
                <Icon name="checkCircle" className="ico" size={18} /><div>On submit this report is saved as <b>pending</b>. Approve it from Daily Reports to lock it.</div></div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ visibility: step === 0 ? "hidden" : "visible" }}>Back</button>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Step {step + 1} of 5</span>
          <button className="btn btn-primary" onClick={next} disabled={saving}>{step === 4 ? (saving ? "Saving…" : "Submit report") : "Continue"}</button>
        </div>
      </div>
    </div>
  );
}

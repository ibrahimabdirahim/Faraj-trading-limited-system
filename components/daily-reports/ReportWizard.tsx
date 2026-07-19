"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { toast } from "@/lib/toast";
import { createDailyReport, createProduct } from "@/app/actions";
import { fmt } from "@/lib/format";
import { PRODUCT_UNITS, OTHER_UNIT } from "@/lib/units";

type Branch = { id: string; name: string; manager: string };
type Product = { id: string; name: string; unit: string };
type Receipt = { productId: string; quantity: string; supplier: string; note: string };
type Expense = { description: string; amount: string; currency: string };

const STEP_LABELS = ["Setup", "Stock In", "Cash", "Expenses", "Review"];
const parseNum = (s: string) => Number(String(s).replace(/[^0-9.]/g, "")) || 0;
const today = () => new Date().toISOString().slice(0, 10);

export default function ReportWizard({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [hasStock, setHasStock] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([{ productId: "", quantity: "", supplier: "", note: "" }]);
  const [cashCdf, setCashCdf] = useState("");
  const [cashUsd, setCashUsd] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([{ description: "", amount: "", currency: "CDF" }]);

  const [newProductRow, setNewProductRow] = useState<number | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState<string>("Piece");
  const [newProductCustomUnit, setNewProductCustomUnit] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  const [openPickerRow, setOpenPickerRow] = useState<number | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const reset = useCallback(() => {
    setStep(0); setBranchId(branches[0]?.id ?? ""); setDate(today());
    setNote(""); setHasStock(false); setReceipts([{ productId: "", quantity: "", supplier: "", note: "" }]);
    setCashCdf(""); setCashUsd(""); setExpenses([{ description: "", amount: "", currency: "CDF" }]);
    setNewProductRow(null); setNewProductName(""); setNewProductUnit("Piece"); setNewProductCustomUnit("");
    setOpenPickerRow(null); setPickerQuery("");
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

  const branch = branches.find((b) => b.id === branchId);
  const expTotalCdf = expenses.filter((e) => e.currency === "CDF").reduce((a, e) => a + parseNum(e.amount), 0);
  const expTotalUsd = expenses.filter((e) => e.currency === "USD").reduce((a, e) => a + parseNum(e.amount), 0);

  // Lets the admin add a missing product without leaving the wizard — creates it in the
  // catalogue and immediately selects it on the receipt line that triggered "+ Add new product".
  async function createInlineProduct(rowIndex: number) {
    if (!newProductName.trim()) { toast("Name required", "Enter a product name", "err"); return; }
    const unit = newProductUnit === OTHER_UNIT ? newProductCustomUnit.trim() : newProductUnit;
    if (!unit) { toast("Unit required", "Enter a unit of measure", "err"); return; }
    setCreatingProduct(true);
    const res = await createProduct({ name: newProductName.trim(), unit, baseCost: 0, currency: "CDF", status: "Active" });
    setCreatingProduct(false);
    if (res.ok && res.id) {
      const created = { id: res.id, name: newProductName.trim(), unit };
      setProducts((p) => [...p, created]);
      setReceipts((p) => p.map((x, j) => j === rowIndex ? { ...x, productId: created.id } : x));
      setNewProductRow(null); setNewProductName(""); setNewProductUnit("Piece"); setNewProductCustomUnit("");
      toast("Product added", created.name);
    } else {
      toast("Could not add product", "Please try again", "err");
    }
  }

  async function submit() {
    setSaving(true);
    const res = await createDailyReport({
      branchId, date, cashCdf: parseNum(cashCdf), cashUsd: parseNum(cashUsd), note,
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
              <div className="fg" style={{ marginBottom: 16 }}><label className="field-label">Report date</label><input type="date" className="field num" value={date} onChange={(e) => setDate(e.target.value)} /></div>
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
              {hasStock && (
                <div style={{ marginTop: 8 }}>
                  {products.length === 0 && (
                    <div className="notice" style={{ marginBottom: 12 }}><Icon name="info" className="ico" size={18} />
                      <div>No products in the catalogue yet — add one below to get started.</div></div>
                  )}
                  {receipts.map((r, i) => {
                    const selectedName = products.find((p) => p.id === r.productId)?.name ?? "";
                    const pickerOpen = openPickerRow === i;
                    const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()));
                    return (
                    <div key={i}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 1fr 30px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <input
                          className="field"
                          placeholder="Search product…"
                          value={pickerOpen ? pickerQuery : selectedName}
                          onFocus={() => { setOpenPickerRow(i); setPickerQuery(""); }}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") { setOpenPickerRow(null); (e.target as HTMLInputElement).blur(); } }}
                          onBlur={() => setOpenPickerRow((cur) => (cur === i ? null : cur))}
                        />
                        <input className="field num" placeholder="Qty" value={r.quantity} onChange={(e) => setReceipts((p) => p.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                        <input className="field" placeholder="Supplier" value={r.supplier} onChange={(e) => setReceipts((p) => p.map((x, j) => j === i ? { ...x, supplier: e.target.value } : x))} />
                        <button className="rm-line" onClick={() => { setReceipts((p) => p.filter((_, j) => j !== i)); if (newProductRow === i) setNewProductRow(null); }}><Icon name="x" size={15} /></button>
                      </div>
                      {pickerOpen && (
                        <div className="prod-picker-menu">
                          {filteredProducts.length === 0 && <div className="prod-picker-empty">{pickerQuery ? "No matching products" : "No products in the catalogue yet"}</div>}
                          {filteredProducts.map((p) => (
                            <div key={p.id} className="prod-picker-item" onMouseDown={(e) => {
                              e.preventDefault();
                              setReceipts((prev) => prev.map((x, j) => j === i ? { ...x, productId: p.id } : x));
                              setNewProductRow((cur) => (cur === i ? null : cur));
                              setOpenPickerRow(null);
                            }}>{p.name}</div>
                          ))}
                          <div className="prod-picker-item prod-picker-add" onMouseDown={(e) => { e.preventDefault(); setNewProductRow(i); setOpenPickerRow(null); }}>
                            <Icon name="plus" size={13} stroke={2.2} />Add new product…
                          </div>
                        </div>
                      )}
                      {newProductRow === i && (
                        <div style={{ background: "var(--surface-2)", padding: 10, borderRadius: 10, marginBottom: 8 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px auto auto", gap: 8, alignItems: "center" }}>
                            <input className="field" placeholder="New product name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} autoFocus />
                            <select className="field" value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value)}>
                              {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                              <option value={OTHER_UNIT}>Other…</option>
                            </select>
                            <button className="btn btn-primary" disabled={creatingProduct || !newProductName.trim()} onClick={() => createInlineProduct(i)}>{creatingProduct ? "Adding…" : "Add"}</button>
                            <button className="btn" onClick={() => { setNewProductRow(null); setNewProductName(""); setNewProductUnit("Piece"); setNewProductCustomUnit(""); }}>Cancel</button>
                          </div>
                          {newProductUnit === OTHER_UNIT && (
                            <input className="field" style={{ marginTop: 8 }} placeholder="Custom unit (e.g. Barrel)" value={newProductCustomUnit} onChange={(e) => setNewProductCustomUnit(e.target.value)} />
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                  <button className="add-line" onClick={() => setReceipts((p) => [...p, { productId: "", quantity: "", supplier: "", note: "" }])}><Icon name="plus" size={15} stroke={2.2} />Add another product</button>
                </div>
              )}
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

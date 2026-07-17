"use client";

export type BranchAssignmentValue = { mode: "one" | "multiple" | "all"; branchIds: string[] };

const MODES: { key: BranchAssignmentValue["mode"]; label: string }[] = [
  { key: "one", label: "One Branch" },
  { key: "multiple", label: "Multiple Branches" },
  { key: "all", label: "All Branches" },
];

export default function BranchAssignmentField({ branches, value, onChange }: { branches: { id: string; name: string }[]; value: BranchAssignmentValue; onChange: (v: BranchAssignmentValue) => void }) {
  function setMode(mode: BranchAssignmentValue["mode"]) {
    if (mode === "one") onChange({ mode, branchIds: value.branchIds.slice(0, 1) });
    else if (mode === "all") onChange({ mode, branchIds: [] });
    else onChange({ mode, branchIds: value.branchIds });
  }

  function toggleBranch(id: string) {
    if (value.mode === "one") { onChange({ ...value, branchIds: [id] }); return; }
    const has = value.branchIds.includes(id);
    onChange({ ...value, branchIds: has ? value.branchIds.filter((b) => b !== id) : [...value.branchIds, id] });
  }

  return (
    <div>
      <label className="field-label">Branch assignment</label>
      <div className="seg" style={{ marginBottom: 8, width: "fit-content" }}>
        {MODES.map((m) => <button key={m.key} type="button" className={value.mode === m.key ? "on" : ""} onClick={() => setMode(m.key)}>{m.label}</button>)}
      </div>
      {value.mode !== "all" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {branches.map((b) => (
            <label key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: value.branchIds.includes(b.id) ? "var(--brand-tint)" : "var(--surface)" }}>
              <input type={value.mode === "one" ? "radio" : "checkbox"} checked={value.branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} style={{ margin: 0 }} />
              {b.name}
            </label>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>This user will see every branch.</p>
      )}
    </div>
  );
}

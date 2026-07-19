import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getReportTable, reportMeta, parseReportFilters } from "@/lib/reports";
import { docColor, DOC_THEME } from "@/lib/docTheme";
import { fmt, fmtDate, fmtTime } from "@/lib/format";
import AutoPrint from "@/components/reports/AutoPrint";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = { approved: DOC_THEME.brand, pending: "#C77300", missing: "#DC2626" };

function cellText(val: string | number, isNumeric: boolean): string {
  if (isNumeric && typeof val === "number") return fmt(val);
  return String(val);
}

function summaryPair(cdf: number, usd: number): string {
  return `${fmt(Math.round(cdf))} CDF${usd ? ` · $${fmt(usd, 2)}` : ""}`;
}

export default async function PrintReportPage({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { type } = await params;
  const sp = await searchParams;
  const usp = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]])));
  const filters = parseReportFilters(usp);
  const [table, settings, meta] = await Promise.all([getReportTable(type, filters), getSettings(), Promise.resolve(reportMeta(type))]);
  const brand = docColor(meta.color);
  const colCount = table.columns.length;
  const s = table.summary;

  const summaryRows: [string, string][] = [
    ["Total Revenue", summaryPair(s.totalRevenueCdf, s.totalRevenueUsd)],
    ["Total Available Cash", summaryPair(s.totalAvailableCashCdf, s.totalAvailableCashUsd)],
    ["Total Expenses", summaryPair(s.totalExpensesCdf, s.totalExpensesUsd)],
    ["Total Supplier Payments", summaryPair(s.totalSupplierPaymentsCdf, s.totalSupplierPaymentsUsd)],
    ["Net Cash Position", summaryPair(s.netCashPositionCdf, s.netCashPositionUsd)],
    ["Transactions", String(s.transactionCount)],
    ["Branches Included", String(s.branchCount)],
  ];

  return (
    <div style={{ fontFamily: "var(--sans, system-ui, sans-serif)", color: DOC_THEME.text, maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm 10mm 20mm; }
          @page { @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8px; color: #69766F; } }
          body { background: #fff; }
        }
        body { background: #f3f5f4; }
      `}</style>

      <div className="no-print" style={{ height: 14 }} />

      {/* thead/tfoot repeat on every printed page — the standard, reliable cross-browser trick
          for print pagination (a lone position:fixed header does not repeat consistently). */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th colSpan={colCount} style={{ padding: 0, border: "none" }}>
              <div style={{ background: `linear-gradient(135deg, ${brand}, ${DOC_THEME.brandDark})`, borderRadius: 10, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, color: "#fff", marginBottom: 16, fontWeight: 400, textAlign: "left" }}>
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt={settings.companyName} style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
                ) : null}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{settings.companyName}</div>
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                    {[settings.companyAddress, settings.companyPhone, settings.companyEmail].filter(Boolean).join("  ·  ")}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, opacity: 0.95 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{table.title}</div>
                  <div style={{ marginTop: 3 }}>No: {table.documentNo}</div>
                  <div>Period: {table.reportingPeriod}</div>
                  <div>Generated {fmtDate(table.generatedAt)} {fmtTime(table.generatedAt)} by {user.name}</div>
                </div>
              </div>
            </th>
          </tr>
          <tr>
            {table.columns.map((c, i) => (
              <th key={c} style={{ background: brand, color: "#fff", textAlign: table.numericCols.includes(i) ? "right" : "left", padding: "9px 12px", fontWeight: 600, fontSize: 12 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 1 ? DOC_THEME.bandFill : "transparent" }}>
              {row.map((val, ci) => {
                const isStatus = table.columns[ci] === "Status" && typeof val === "string" && STATUS_COLOR[val];
                return (
                  <td key={ci} style={{ padding: "8px 12px", textAlign: table.numericCols.includes(ci) ? "right" : "left", borderBottom: `1px solid ${DOC_THEME.border}`, color: isStatus ? STATUS_COLOR[val as string] : DOC_THEME.text, fontWeight: isStatus ? 600 : 400, textTransform: isStatus ? "capitalize" : "none" }}>
                    {cellText(val, table.numericCols.includes(ci))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.totals && (
            <tr>
              {table.totals.map((val, ci) => (
                <td key={ci} style={{ padding: "10px 12px", textAlign: table.numericCols.includes(ci) ? "right" : "left", background: "#E2F1ED", color: DOC_THEME.brandDark, fontWeight: 700, borderTop: `2px solid ${brand}` }}>
                  {cellText(val, table.numericCols.includes(ci))}
                </td>
              ))}
            </tr>
          )}
          <tr>
            <td colSpan={colCount} style={{ padding: 0, border: "none" }}>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${DOC_THEME.border}`, fontSize: 10.5, color: DOC_THEME.muted, display: "flex", justifyContent: "space-between", textAlign: "left" }}>
                <span>{settings.companyName} · Faraj OS · Confidential — for internal business use only</span>
                <span>{fmtDate(new Date())} {fmtTime(new Date())}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Notes</div>
        <div style={{ border: `1px solid ${DOC_THEME.border}`, borderRadius: 6, padding: "10px 14px", minHeight: 60 }}>
          {[0, 1].map((i) => <div key={i} style={{ borderBottom: `1px solid ${DOC_THEME.border}`, height: 20 }} />)}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: DOC_THEME.brandDark }}>Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", border: `1px solid ${DOC_THEME.border}`, borderRadius: 6, padding: "12px 14px" }}>
          {summaryRows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: DOC_THEME.muted }}>{label}</span>
              <span style={{ fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <AutoPrint />
    </div>
  );
}

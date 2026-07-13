import ReportCard from "@/components/ReportCard";

export const dynamic = "force-dynamic";

const REPORTS: [string, string, string][] = [
  ["Daily report", "Full end-of-day snapshot", "var(--brand)"],
  ["Weekly report", "Week ending summary", "var(--cdf)"],
  ["Monthly report", "Month-end comparison", "var(--good)"],
  ["Yearly report", "12-month performance", "var(--warn)"],
  ["Branch comparison", "Rank all branches", "var(--brand)"],
  ["Inventory report", "Stock value & movement", "var(--cdf)"],
  ["Cash report", "Collections & cash on hand", "var(--good)"],
  ["Expense report", "Category breakdown", "var(--warn)"],
  ["Profit report", "Margins & net profit", "var(--brand)"],
];

export default function ReportsPage() {
  return (
    <>
      <div className="page-head">
        <div><div className="page-title">Reports</div><div className="page-sub">Generate, export and print any report — Excel, PDF or paper</div></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {REPORTS.map((r) => <ReportCard key={r[0]} title={r[0]} sub={r[1]} color={r[2]} />)}
      </div>
    </>
  );
}

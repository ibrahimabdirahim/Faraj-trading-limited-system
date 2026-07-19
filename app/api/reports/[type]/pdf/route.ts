import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings, type AppSettings } from "@/lib/settings";
import { getReportTable, reportMeta, parseReportFilters, type ReportTable } from "@/lib/reports";
import { docColor, DOC_THEME } from "@/lib/docTheme";
import { fmt, fmtDate, fmtTime } from "@/lib/format";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const HEADER_H = 34;
const FOOTER_RESERVE = 22;

// Redrawn on every page (both the pages autoTable creates and any we add manually afterwards
// for Notes/Summary) so the logo and company block appear consistently throughout the document.
function drawHeader(doc: jsPDF, opts: { brand: [number, number, number]; settings: AppSettings; table: ReportTable; userName: string }) {
  const { brand, settings, table, userName } = opts;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...brand);
  doc.rect(0, 0, pageWidth, HEADER_H, "F");

  let textX = 12;
  if (settings.companyLogo) {
    try {
      const props = doc.getImageProperties(settings.companyLogo);
      const boxH = 18, boxW = (props.width / props.height) * boxH;
      doc.addImage(settings.companyLogo, props.fileType, 10, 6, Math.min(boxW, 26), boxH);
      textX = 10 + Math.min(boxW, 26) + 5;
    } catch {
      // ignore unreadable logo, fall back to text-only header
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(settings.companyName, textX, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contactLine = [settings.companyAddress, settings.companyPhone, settings.companyEmail].filter(Boolean).join("  ·  ");
  if (contactLine) doc.text(contactLine, textX, 18);

  const rightX = pageWidth - 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(table.title, rightX, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`No: ${table.documentNo}`, rightX, 17, { align: "right" });
  doc.text(`Period: ${table.reportingPeriod}`, rightX, 22, { align: "right" });
  doc.text(`Generated ${fmtDate(table.generatedAt)} ${fmtTime(table.generatedAt)} by ${userName}`, rightX, 27, { align: "right" });
}

function drawNotes(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxH = 24;
  doc.setDrawColor(...hexToRgb(DOC_THEME.border));
  doc.setTextColor(...hexToRgb(DOC_THEME.text));
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 10, y);
  doc.setFont("helvetica", "normal");
  doc.rect(10, y + 3, pageWidth - 20, boxH);
  for (let i = 1; i <= 2; i++) {
    const lineY = y + 3 + (boxH / 3) * i;
    doc.setDrawColor(...hexToRgb(DOC_THEME.border));
    doc.line(12, lineY, pageWidth - 12, lineY);
  }
  return y + 3 + boxH + 10;
}

function summaryPair(cdf: number, usd: number): string {
  return `${fmt(Math.round(cdf))} CDF${usd ? ` · $${fmt(usd, 2)}` : ""}`;
}

function drawSummary(doc: jsPDF, y: number, brandDark: [number, number, number], table: ReportTable): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const s = table.summary;
  doc.setFontSize(9);
  doc.setTextColor(...brandDark);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 10, y);
  doc.setFont("helvetica", "normal");

  const rows: [string, string][] = [
    ["Total Revenue", summaryPair(s.totalRevenueCdf, s.totalRevenueUsd)],
    ["Total Available Cash", summaryPair(s.totalAvailableCashCdf, s.totalAvailableCashUsd)],
    ["Total Expenses", summaryPair(s.totalExpensesCdf, s.totalExpensesUsd)],
    ["Total Supplier Payments", summaryPair(s.totalSupplierPaymentsCdf, s.totalSupplierPaymentsUsd)],
    ["Net Cash Position", summaryPair(s.netCashPositionCdf, s.netCashPositionUsd)],
    ["Transactions", String(s.transactionCount)],
    ["Branches Included", String(s.branchCount)],
  ];

  const colW = (pageWidth - 20) / 2;
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(DOC_THEME.text));
  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 10 + col * colW;
    const rowY = y + 7 + row * 6;
    doc.setTextColor(...hexToRgb(DOC_THEME.muted));
    doc.text(label, x, rowY);
    doc.setTextColor(...hexToRgb(DOC_THEME.text));
    doc.setFont("helvetica", "bold");
    doc.text(value, x + colW - 4, rowY, { align: "right" });
    doc.setFont("helvetica", "normal");
  });
  return y + 7 + Math.ceil(rows.length / 2) * 6 + 6;
}

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { type } = await params;
  const filters = parseReportFilters(new URL(req.url).searchParams);
  const [table, settings, meta] = await Promise.all([getReportTable(type, filters), getSettings(), Promise.resolve(reportMeta(type))]);
  const brand = hexToRgb(docColor(meta.color));
  const brandDark = hexToRgb(DOC_THEME.brandDark);
  const band = hexToRgb(DOC_THEME.bandFill);
  const muted = hexToRgb(DOC_THEME.muted);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  drawHeader(doc, { brand, settings, table, userName: user.name });

  autoTable(doc, {
    startY: HEADER_H + 6,
    head: [table.columns],
    body: table.rows.map((r) => r.map(String)),
    foot: table.totals ? [table.totals.map(String)] : undefined,
    headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [226, 241, 237], textColor: brandDark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: band },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: Object.fromEntries(table.numericCols.map((i) => [i, { halign: "right" }])),
    margin: { left: 10, right: 10, top: HEADER_H + 6, bottom: FOOTER_RESERVE },
    didDrawPage: () => drawHeader(doc, { brand, settings, table, userName: user.name }),
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  const blockHeight = 24 + 10 + 7 + Math.ceil(7 / 2) * 6 + 6; // notes box + summary block
  if (y + blockHeight > pageHeight - FOOTER_RESERVE) {
    doc.addPage();
    drawHeader(doc, { brand, settings, table, userName: user.name });
    y = HEADER_H + 10;
  }
  y = drawNotes(doc, y);
  drawSummary(doc, y, brandDark, table);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...hexToRgb(DOC_THEME.border));
    doc.line(10, h - 16, pageWidth - 10, h - 16);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...muted);
    doc.text(`${settings.companyName} · Faraj OS · Confidential — for internal business use only`, 10, h - 11);
    doc.text(`Generated ${fmtDate(new Date())} ${fmtTime(new Date())}`, 10, h - 6.5);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, h - 8.5, { align: "right" });
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));
  const filename = `${meta.slug}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

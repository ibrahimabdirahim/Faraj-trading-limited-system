import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getReportTable, reportMeta, parseReportFilters, reportRequiredModule } from "@/lib/reports";
import { hasPermission } from "@/lib/permissions";
import { docColor, DOC_THEME } from "@/lib/docTheme";
import { fmt, fmtDate, fmtTime } from "@/lib/format";

function argb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase();
}

function summaryPair(cdf: number, usd: number): string {
  return `${fmt(Math.round(cdf))} CDF${usd ? ` · $${fmt(usd, 2)}` : ""}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { type } = await params;
  if (!(await hasPermission(user.id, reportRequiredModule(type), "view"))) {
    return NextResponse.json({ error: "You do not have permission to view this report." }, { status: 403 });
  }
  const filters = parseReportFilters(new URL(req.url).searchParams);
  const [table, settings, meta] = await Promise.all([getReportTable(type, filters), getSettings(), Promise.resolve(reportMeta(type))]);
  const brand = docColor(meta.color);

  const wb = new ExcelJS.Workbook();
  wb.creator = settings.companyName;
  wb.created = new Date();
  const ws = wb.addWorksheet(table.title.slice(0, 31));
  const colCount = Math.max(table.columns.length, 2);

  // Logo is always saved as a PNG data URL (see components/settings/LogoUpload.tsx's
  // canvas.toDataURL("image/png")) — floats over the title band's top-left corner, same
  // placement as the PDF/print headers.
  if (settings.companyLogo.startsWith("data:image/png;base64,")) {
    const imageId = wb.addImage({ base64: settings.companyLogo, extension: "png" });
    ws.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 34, height: 34 } });
  }

  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9, // A4
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: "1:6",
  };
  ws.headerFooter.oddFooter = `&L${settings.companyName} · Faraj OS · Confidential&C&D &T&RPage &P of &N`;
  ws.headerFooter.evenFooter = ws.headerFooter.oddFooter;

  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = settings.companyName;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", indent: settings.companyLogo ? 5 : 0 };
  ws.getRow(1).height = 26;
  for (let c = 1; c <= colCount; c++) ws.getCell(1, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(brand) } };

  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${table.title} — ${table.subtitle}`;
  subCell.font = { size: 11, color: { argb: "FFFFFFFF" } };
  for (let c = 1; c <= colCount; c++) ws.getCell(2, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(DOC_THEME.brandDark) } };

  const contactLine = [settings.companyAddress, settings.companyPhone, settings.companyEmail].filter(Boolean).join("  ·  ");
  ws.mergeCells(3, 1, 3, colCount);
  ws.getCell(3, 1).value = contactLine || " ";
  ws.getCell(3, 1).font = { size: 9, color: { argb: "FF69766F" } };

  ws.mergeCells(4, 1, 4, colCount);
  ws.getCell(4, 1).value = `No: ${table.documentNo}   ·   Period: ${table.reportingPeriod}   ·   Generated ${fmtDate(table.generatedAt)} ${fmtTime(table.generatedAt)} by ${user.name}`;
  ws.getCell(4, 1).font = { size: 9, italic: true, color: { argb: "FF69766F" } };

  const headerRowIdx = 6;
  const headerRow = ws.getRow(headerRowIdx);
  table.columns.forEach((col, i) => { headerRow.getCell(i + 1).value = col; });
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(brand) } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD6DCD9" } } };
  });
  headerRow.height = 20;

  table.rows.forEach((row, ri) => {
    const excelRow = ws.getRow(headerRowIdx + 1 + ri);
    row.forEach((val, ci) => {
      const cell = excelRow.getCell(ci + 1);
      cell.value = val;
      if (table.numericCols.includes(ci) && typeof val === "number") cell.numFmt = "#,##0";
      if (ri % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(DOC_THEME.bandFill) } };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE6EAE8" } } };
    });
  });

  let cursor = headerRowIdx + 1 + table.rows.length;
  if (table.totals) {
    const totalsRow = ws.getRow(cursor);
    table.totals.forEach((val, ci) => {
      const cell = totalsRow.getCell(ci + 1);
      cell.value = val;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F1ED" } };
      if (table.numericCols.includes(ci) && typeof val === "number") cell.numFmt = "#,##0";
      cell.border = { top: { style: "thin", color: { argb: argb(brand) } } };
    });
    cursor += 1;
  }

  cursor += 1;
  ws.getCell(cursor, 1).value = "Notes";
  ws.getCell(cursor, 1).font = { bold: true, size: 10 };
  cursor += 1;
  for (let i = 0; i < 3; i++) {
    ws.mergeCells(cursor, 1, cursor, colCount);
    ws.getCell(cursor, 1).border = { bottom: { style: "hair", color: { argb: "FFE6EAE8" } } };
    ws.getRow(cursor).height = 16;
    cursor += 1;
  }

  cursor += 1;
  ws.getCell(cursor, 1).value = "Summary";
  ws.getCell(cursor, 1).font = { bold: true, size: 10, color: { argb: argb(DOC_THEME.brandDark) } };
  cursor += 1;
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
  for (const [label, value] of summaryRows) {
    ws.getCell(cursor, 1).value = label;
    ws.getCell(cursor, 1).font = { color: { argb: "FF69766F" } };
    ws.getCell(cursor, 2).value = value;
    ws.getCell(cursor, 2).font = { bold: true };
    cursor += 1;
  }

  ws.columns.forEach((col, i) => {
    const header = table.columns[i] ?? "";
    const widest = Math.max(header.length, ...table.rows.map((r) => String(r[i] ?? "").length));
    col.width = Math.min(32, Math.max(12, widest + 4));
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${meta.slug}-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

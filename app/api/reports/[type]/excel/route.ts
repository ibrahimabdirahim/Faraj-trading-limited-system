import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getReportTable, reportMeta, parseReportFilters } from "@/lib/reports";
import { docColor, DOC_THEME } from "@/lib/docTheme";
import { fmtDate } from "@/lib/format";

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { type } = await params;
  const filters = parseReportFilters(new URL(req.url).searchParams);
  const [table, settings, meta] = await Promise.all([getReportTable(type, filters), getSettings(), Promise.resolve(reportMeta(type))]);
  const brand = docColor(meta.color);

  const wb = new ExcelJS.Workbook();
  wb.creator = settings.companyName;
  wb.created = new Date();
  const ws = wb.addWorksheet(table.title.slice(0, 31));
  const colCount = table.columns.length;

  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = settings.companyName;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 28;
  for (let c = 1; c <= colCount; c++) ws.getCell(1, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(brand) } };

  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = `${table.title} — ${table.subtitle}`;
  subCell.font = { size: 11, color: { argb: "FFFFFFFF" } };
  for (let c = 1; c <= colCount; c++) ws.getCell(2, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(DOC_THEME.brandDark) } };

  ws.mergeCells(3, 1, 3, colCount);
  const genCell = ws.getCell(3, 1);
  genCell.value = `Generated ${fmtDate(table.generatedAt)} by ${user.name}`;
  genCell.font = { size: 9, italic: true, color: { argb: "FF69766F" } };

  const headerRowIdx = 5;
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

  if (table.totals) {
    const totalsRow = ws.getRow(headerRowIdx + 1 + table.rows.length);
    table.totals.forEach((val, ci) => {
      const cell = totalsRow.getCell(ci + 1);
      cell.value = val;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F1ED" } };
      if (table.numericCols.includes(ci) && typeof val === "number") cell.numFmt = "#,##0";
      cell.border = { top: { style: "thin", color: { argb: argb(brand) } } };
    });
  }

  ws.columns.forEach((col, i) => {
    const header = table.columns[i] ?? "";
    const widest = Math.max(header.length, ...table.rows.map((r) => String(r[i] ?? "").length));
    col.width = Math.min(32, Math.max(10, widest + 4));
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

function argb(hex: string): string {
  return "FF" + hex.replace("#", "").toUpperCase();
}

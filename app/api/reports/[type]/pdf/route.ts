import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getReportTable, reportMeta, parseReportFilters } from "@/lib/reports";
import { docColor, DOC_THEME } from "@/lib/docTheme";
import { fmtDate } from "@/lib/format";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...brand);
  doc.rect(0, 0, pageWidth, 26, "F");

  let textX = 12;
  if (settings.companyLogo) {
    try {
      const props = doc.getImageProperties(settings.companyLogo);
      const boxH = 16, boxW = (props.width / props.height) * boxH;
      doc.addImage(settings.companyLogo, props.fileType, 10, 5, Math.min(boxW, 24), boxH);
      textX = 10 + Math.min(boxW, 24) + 5;
    } catch {
      // ignore unreadable logo, fall back to text-only header
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(settings.companyName, textX, 12);
  doc.setFontSize(10);
  doc.text(`${table.title} — ${table.subtitle}`, textX, 19);

  doc.setFontSize(8);
  const genLabel = `Generated ${fmtDate(table.generatedAt)} by ${user.name}`;
  doc.text(genLabel, pageWidth - 12, 12, { align: "right" });

  autoTable(doc, {
    startY: 32,
    head: [table.columns],
    body: table.rows.map((r) => r.map(String)),
    foot: table.totals ? [table.totals.map(String)] : undefined,
    headStyles: { fillColor: brand, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [226, 241, 237], textColor: brandDark, fontStyle: "bold" },
    alternateRowStyles: { fillColor: band },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: Object.fromEntries(table.numericCols.map((i) => [i, { halign: "right" }])),
    margin: { left: 10, right: 10 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(DOC_THEME.muted));
    doc.text(settings.companyName, 10, h - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 12, h - 8, { align: "right" });
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

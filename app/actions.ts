"use server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function audit(userId: string, action: string, entity: string, detail: string) {
  await prisma.auditLog.create({ data: { userId, action, entity, detail } });
}

export type ReportInput = {
  branchId: string;
  date: string; // yyyy-mm-dd
  cashCdf: number;
  cashUsd: number;
  source: string;
  note: string;
  receipts: { productId: string; quantity: number; supplier: string; note: string }[];
  expenses: { description: string; amount: number; currency: string }[];
};

export async function createDailyReport(input: ReportInput) {
  const user = await requireUser();
  const date = new Date(input.date + "T00:00:00");

  const existing = await prisma.dailyReport.findUnique({ where: { branchId_date: { branchId: input.branchId, date } } });
  if (existing?.locked) return { ok: false, error: "This report is already approved and locked." };
  if (existing) await prisma.dailyReport.delete({ where: { id: existing.id } });

  const report = await prisma.dailyReport.create({
    data: {
      branchId: input.branchId,
      date,
      cashCdf: input.cashCdf || 0,
      cashUsd: input.cashUsd || 0,
      source: input.source || "WhatsApp",
      note: input.note || "",
      status: "pending",
      expenses: { create: input.expenses.filter((e) => e.description && e.amount).map((e) => ({ description: e.description, amount: e.amount, currency: e.currency })) },
      receipts: { create: input.receipts.filter((r) => r.productId && r.quantity).map((r) => ({ branchId: input.branchId, productId: r.productId, quantity: r.quantity, supplier: r.supplier, note: r.note, date })) },
    },
    include: { branch: true, receipts: true },
  });

  for (const r of report.receipts) {
    await prisma.stockMovement.create({ data: { branchId: input.branchId, productId: r.productId, type: "receipt", quantity: r.quantity, toName: report.branch.name, fromName: r.supplier || "Supplier", note: "Received via daily report", date } });
  }

  await audit(user.id, "create", "DailyReport", `${report.branch.name} · ${input.date}`);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/branches");
  revalidatePath("/finance");
  return { ok: true, id: report.id };
}

export async function approveReport(id: string) {
  const user = await requireUser();
  const r = await prisma.dailyReport.update({ where: { id }, data: { status: "approved", locked: true, approvedAt: new Date() }, include: { branch: true } });
  await audit(user.id, "approve", "DailyReport", `${r.branch.name}`);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  return { ok: true };
}

export type ProductInput = { name: string; categoryId?: string; categoryName?: string; baseCost: number; currency: string; unit: string; barcode?: string; status: string };

export async function createProduct(input: ProductInput) {
  const user = await requireUser();
  let categoryId = input.categoryId || null;
  if (!categoryId && input.categoryName) {
    const cat = await prisma.category.upsert({ where: { name: input.categoryName }, update: {}, create: { name: input.categoryName } });
    categoryId = cat.id;
  }
  const p = await prisma.product.create({ data: { name: input.name, categoryId, baseCost: input.baseCost || 0, currency: input.currency || "CDF", unit: input.unit || "Unit", barcode: input.barcode || null, status: input.status || "Active" } });
  await audit(user.id, "create", "Product", input.name);
  revalidatePath("/products");
  return { ok: true, id: p.id };
}

export async function updateSettings(input: Record<string, string>) {
  const user = await requireUser();
  for (const [k, v] of Object.entries(input)) await setSetting(k, v);
  await audit(user.id, "update", "Settings", Object.keys(input).join(", "));
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}

export type ValuationInput = { branchId: string | null; periodType: string; periodEnding: string; valueCdf: number; valueUsd: number; remarks: string; cashCdf?: number; cashUsd?: number; warehouseValue?: number; branchValue?: number };

export async function saveValuation(input: ValuationInput) {
  const user = await requireUser();
  await prisma.inventoryValuation.create({ data: { branchId: input.branchId, periodType: input.periodType, periodEnding: new Date(input.periodEnding + "T00:00:00"), valueCdf: input.valueCdf || 0, valueUsd: input.valueUsd || 0, remarks: input.remarks || "", cashCdf: input.cashCdf ?? null, cashUsd: input.cashUsd ?? null, warehouseValue: input.warehouseValue ?? null, branchValue: input.branchValue ?? null } });
  await audit(user.id, "create", "InventoryValuation", input.periodType);
  revalidatePath("/branches");
  revalidatePath("/inventory");
  return { ok: true };
}

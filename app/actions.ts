"use server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { requirePermission, ADMIN_TIER_ROLE_KEYS, MODULES, ACTIONS, roleDefaultMap, type Module, type Action, type RoleKey } from "@/lib/permissions";
import { getBranchDetail as fetchBranchDetail, getSupplierDetail as getSupplierDetailData } from "@/lib/metrics";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function audit(userId: string, action: string, entity: string, detail: string, targetUserId?: string, branchName?: string) {
  await prisma.auditLog.create({ data: { userId, action, entity, detail, targetUserId, branchName } });
}

// Every hard-delete action re-verifies the ACTING user's own password before proceeding —
// a permission check alone only proves the session is valid, not that the person at the
// keyboard right now is who they claim to be for a permanent, unrecoverable action. Returns
// a boolean (rather than throwing) so callers can return a graceful { ok: false, error }
// instead of an unhandled rejection reaching the UI.
async function verifyOwnPassword(user: { passwordHash: string }, password: string): Promise<boolean> {
  return bcrypt.compare(password || "", user.passwordHash);
}
const WRONG_PASSWORD_ERROR = "Password is incorrect.";

// Called by IdleTimeoutMonitor whenever it detects real user activity — refreshes the
// session's lastActivityAt (via getCurrentUser's side effect) and reports whether the
// session is still alive, so the client can react immediately if it already timed out.
export async function touchSession() {
  const user = await getCurrentUser();
  return { ok: !!user };
}

export type ReportInput = {
  branchId: string;
  date: string; // yyyy-mm-dd
  cashCdf: number;
  cashUsd: number;
  note: string;
  receipts: { productId: string; quantity: number; supplier: string; note: string }[];
  expenses: { description: string; amount: number; currency: string }[];
};

export async function createDailyReport(input: ReportInput) {
  const user = await requireUser();
  const date = new Date(input.date + "T00:00:00");

  const existing = await prisma.dailyReport.findUnique({ where: { branchId_date: { branchId: input.branchId, date } } });
  if (existing?.locked) return { ok: false, error: "This report is already approved and locked." };
  if (existing?.deletedAt) return { ok: false, error: "A report for this branch and date is in the Trash. Restore or permanently delete it first." };
  if (existing) await prisma.dailyReport.delete({ where: { id: existing.id } });

  const report = await prisma.dailyReport.create({
    data: {
      branchId: input.branchId,
      date,
      cashCdf: input.cashCdf || 0,
      cashUsd: input.cashUsd || 0,
      note: input.note || "",
      status: "pending",
      createdById: user.id,
      expenses: { create: input.expenses.filter((e) => e.description && e.amount).map((e) => ({ description: e.description, amount: e.amount, currency: e.currency })) },
      receipts: { create: input.receipts.filter((r) => r.productId && r.quantity).map((r) => ({ branchId: input.branchId, productId: r.productId, quantity: r.quantity, supplier: r.supplier, note: r.note, date })) },
    },
    include: { branch: true, receipts: true },
  });

  for (const r of report.receipts) {
    await prisma.stockMovement.create({ data: { branchId: input.branchId, productId: r.productId, type: "receipt", quantity: r.quantity, toName: report.branch.name, fromName: r.supplier || "Supplier", note: "Received via daily report", date } });
  }

  await audit(user.id, "create", "DailyReport", `${report.branch.name} · ${input.date}`, undefined, report.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/branches");
  revalidatePath("/finance");
  return { ok: true, id: report.id };
}

export async function approveReport(id: string) {
  const user = await requireUser();
  const r = await prisma.dailyReport.update({ where: { id }, data: { status: "approved", locked: true, approvedAt: new Date() }, include: { branch: true } });
  await audit(user.id, "approve", "DailyReport", `${r.branch.name}`, undefined, r.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  return { ok: true };
}

// Approved reports are locked by design (see approveReport) — unlocking is the deliberate,
// audited way to make an already-finalized report editable/deletable again.
export async function unlockReport(id: string) {
  const admin = await requirePermission("daily-reports", "edit");
  const r = await prisma.dailyReport.update({ where: { id }, data: { status: "pending", locked: false, approvedAt: null }, include: { branch: true } });
  await audit(admin.id, "unlock", "DailyReport", r.branch.name, undefined, r.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  return { ok: true };
}

export type UpdateReportInput = {
  id: string; cashCdf: number; cashUsd: number; note: string;
  expenses: { description: string; amount: number; currency: string }[];
};

export async function updateDailyReport(input: UpdateReportInput) {
  const admin = await requirePermission("daily-reports", "edit");
  const existing = await prisma.dailyReport.findUnique({ where: { id: input.id }, include: { branch: true } });
  if (!existing) return { ok: false, error: "Report not found." };
  if (existing.deletedAt) return { ok: false, error: "This report is in the Trash — restore it first." };
  if (existing.locked) return { ok: false, error: "This report is approved and locked. Unlock it first to make changes." };

  await prisma.expense.deleteMany({ where: { reportId: input.id } });
  await prisma.dailyReport.update({
    where: { id: input.id },
    data: {
      cashCdf: input.cashCdf || 0, cashUsd: input.cashUsd || 0, note: input.note || "",
      expenses: { create: input.expenses.filter((e) => e.description && e.amount).map((e) => ({ description: e.description, amount: e.amount, currency: e.currency })) },
    },
  });
  await audit(admin.id, "update", "DailyReport", existing.branch.name, undefined, existing.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/finance");
  return { ok: true };
}

export async function softDeleteReport(id: string) {
  const admin = await requirePermission("daily-reports", "delete");
  const existing = await prisma.dailyReport.findUnique({ where: { id }, include: { branch: true } });
  if (!existing) return { ok: false, error: "Report not found." };
  if (existing.locked) return { ok: false, error: "This report is approved and locked. Unlock it first to delete." };
  await prisma.dailyReport.update({ where: { id }, data: { deletedAt: new Date(), deletedById: admin.id } });
  await audit(admin.id, "delete", "DailyReport", existing.branch.name, undefined, existing.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/reports-daily/trash");
  return { ok: true };
}

export async function restoreReport(id: string) {
  const admin = await requirePermission("daily-reports", "delete");
  const existing = await prisma.dailyReport.findUnique({ where: { id }, include: { branch: true } });
  if (!existing) return { ok: false, error: "Report not found." };
  await prisma.dailyReport.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  await audit(admin.id, "restore", "DailyReport", existing.branch.name, undefined, existing.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/reports-daily/trash");
  return { ok: true };
}

export async function permanentlyDeleteReport(id: string, password: string) {
  const admin = await requirePermission("daily-reports", "delete");
  if (!(await verifyOwnPassword(admin, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  const existing = await prisma.dailyReport.findUnique({ where: { id }, include: { branch: true } });
  if (!existing) return { ok: false, error: "Report not found." };
  if (!existing.deletedAt) return { ok: false, error: "Only reports already in the Trash can be permanently deleted." };
  await prisma.dailyReport.delete({ where: { id } });
  await audit(admin.id, "permanent-delete", "DailyReport", existing.branch.name, undefined, existing.branch.name);
  revalidatePath("/");
  revalidatePath("/reports-daily/trash");
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

export type BranchInput = { name: string; manager: string; color: string; type: string };

export async function createBranch(input: BranchInput) {
  const user = await requireUser();
  if (!input.name.trim()) return { ok: false, error: "Branch name is required." };
  const max = await prisma.branch.aggregate({ _max: { sortOrder: true } });
  const b = await prisma.branch.create({
    data: { name: input.name.trim(), manager: input.manager.trim(), color: input.color || "#0E7C6B", type: input.type || "branch", sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  await audit(user.id, "create", "Branch", b.name);
  revalidatePath("/");
  revalidatePath("/branches");
  revalidatePath("/settings");
  return { ok: true, id: b.id };
}

export type BranchUpdateInput = { id: string; name: string; manager: string; color: string; type: string };

export async function updateBranch(input: BranchUpdateInput) {
  const user = await requireUser();
  if (!input.name.trim()) return { ok: false, error: "Branch name is required." };
  const b = await prisma.branch.update({
    where: { id: input.id },
    data: { name: input.name.trim(), manager: input.manager.trim(), color: input.color || "#0E7C6B", type: input.type || "branch" },
  });
  await audit(user.id, "update", "Branch", b.name);
  revalidatePath("/");
  revalidatePath("/branches");
  revalidatePath("/settings");
  return { ok: true, id: b.id };
}

export async function updateCompanyLogo(logo: string) {
  const user = await requireUser();
  await setSetting("companyLogo", logo);
  await audit(user.id, "update", "Settings", "Company logo");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type UserInput = { name: string; email: string; username: string; password: string; roleId: string; branchIds: string[]; allBranches: boolean };

export async function createUser(input: UserInput) {
  const admin = await requirePermission("user-management", "create");
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  if (!input.name.trim() || !email || !input.password || !input.roleId) return { ok: false, error: "Name, email, password and role are required." };
  if (!username) return { ok: false, error: "Username is required." };
  if (username.includes("@")) return { ok: false, error: "Username can't contain \"@\" — that's what the email field is for." };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "A user with that email already exists." };
  const usernameTaken = await prisma.user.findUnique({ where: { username } });
  if (usernameTaken) return { ok: false, error: "That username is already taken." };
  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) return { ok: false, error: "Unknown role." };
  const passwordHash = await bcrypt.hash(input.password, 10);
  const allBranches = ADMIN_TIER_ROLE_KEYS.includes(role.key as RoleKey) || input.allBranches;
  const u = await prisma.user.create({
    data: {
      name: input.name.trim(), email, username, passwordHash, roleId: role.id, allBranches,
      branches: allBranches ? undefined : { create: input.branchIds.map((branchId) => ({ branchId })) },
    },
  });
  await audit(admin.id, "create", "User", `${u.name} (${role.name})`, u.id);
  revalidatePath("/users");
  revalidatePath("/settings");
  return { ok: true, id: u.id };
}

export type UserUpdateInput = { id: string; name: string; email: string; username: string; roleId: string; branchIds: string[]; allBranches: boolean; active: boolean };

export async function updateUser(input: UserUpdateInput) {
  const admin = await requirePermission("user-management", "edit");
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  if (!input.name.trim() || !email || !input.roleId) return { ok: false, error: "Name, email and role are required." };
  if (!username) return { ok: false, error: "Username is required." };
  if (username.includes("@")) return { ok: false, error: "Username can't contain \"@\" — that's what the email field is for." };
  const role = await prisma.role.findUnique({ where: { id: input.roleId } });
  if (!role) return { ok: false, error: "Unknown role." };
  const dupe = await prisma.user.findUnique({ where: { email } });
  if (dupe && dupe.id !== input.id) return { ok: false, error: "A user with that email already exists." };
  const usernameDupe = await prisma.user.findUnique({ where: { username } });
  if (usernameDupe && usernameDupe.id !== input.id) return { ok: false, error: "That username is already taken." };

  const allBranches = ADMIN_TIER_ROLE_KEYS.includes(role.key as RoleKey) || input.allBranches;
  await prisma.userBranch.deleteMany({ where: { userId: input.id } });
  const u = await prisma.user.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(), email, username, roleId: role.id, active: input.active, allBranches,
      branches: allBranches ? undefined : { create: input.branchIds.map((branchId) => ({ branchId })) },
    },
  });
  if (!input.active) await prisma.session.deleteMany({ where: { userId: input.id } });
  await audit(admin.id, "update", "User", `${u.name} (${role.name})`, u.id);
  revalidatePath("/users");
  revalidatePath("/settings");
  return { ok: true, id: u.id };
}

export async function deleteUser(id: string, password: string) {
  const admin = await requirePermission("user-management", "delete");
  if (!(await verifyOwnPassword(admin, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  if (id === admin.id) return { ok: false, error: "You can't delete your own account." };
  const target = await prisma.user.findUnique({ where: { id }, include: { roleRef: true } });
  if (!target) return { ok: false, error: "User not found." };
  if (target.roleRef && ADMIN_TIER_ROLE_KEYS.includes(target.roleRef.key as RoleKey)) {
    const remainingAdmins = await prisma.user.count({ where: { roleRef: { key: { in: ADMIN_TIER_ROLE_KEYS } }, id: { not: id } } });
    if (remainingAdmins === 0) return { ok: false, error: "Can't delete the last remaining administrator." };
  }
  await prisma.user.delete({ where: { id } });
  await audit(admin.id, "delete", "User", target.name);
  revalidatePath("/users");
  revalidatePath("/settings");
  return { ok: true };
}

export async function setUserLocked(id: string, locked: boolean, reason?: string) {
  const admin = await requirePermission("user-management", "edit");
  const u = await prisma.user.update({ where: { id }, data: { locked, lockedAt: locked ? new Date() : null, lockReason: locked ? (reason ?? "") : "", failedLoginAttempts: locked ? undefined : 0 } });
  if (locked) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, locked ? "lock" : "unlock", "User", u.name, u.id);
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserActive(id: string, active: boolean) {
  const admin = await requirePermission("user-management", "edit");
  if (id === admin.id && !active) return { ok: false, error: "You can't deactivate your own account." };
  const u = await prisma.user.update({ where: { id }, data: { active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, active ? "activate" : "deactivate", "User", u.name, u.id);
  revalidatePath("/users");
  return { ok: true };
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function resetUserPassword(id: string) {
  const admin = await requirePermission("user-management", "edit");
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const u = await prisma.user.update({ where: { id }, data: { passwordHash, failedLoginAttempts: 0 } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, "reset-password", "User", u.name, u.id);
  revalidatePath("/users");
  return { ok: true, tempPassword };
}

export async function setUserPassword(id: string, newPassword: string) {
  const admin = await requirePermission("user-management", "edit");
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const u = await prisma.user.update({ where: { id }, data: { passwordHash, failedLoginAttempts: 0 } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, "set-password", "User", u.name, u.id);
  revalidatePath("/users");
  return { ok: true };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const user = await requireUser();
  if (newPassword.length < 8) return { ok: false, error: "New password must be at least 8 characters." };
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: "Current password is incorrect." };
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await audit(user.id, "change-password", "User", "Self-service password change", user.id);
  return { ok: true };
}

export type PermissionOverride = { module: Module; action: Action; allowed: boolean };

export async function updateUserPermissions(userId: string, overrides: PermissionOverride[]) {
  const admin = await requirePermission("user-management", "edit");
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { roleRef: true } });
  if (!u) return { ok: false, error: "User not found." };
  const roleDefaults = u.roleRef ? roleDefaultMap(u.roleRef.key as RoleKey) : null;

  for (const o of overrides) {
    if (!MODULES.includes(o.module) || !ACTIONS.includes(o.action)) continue;
    const matchesDefault = roleDefaults ? roleDefaults[o.module][o.action] === o.allowed : false;
    if (matchesDefault) {
      await prisma.userPermission.deleteMany({ where: { userId, module: o.module, action: o.action } });
    } else {
      await prisma.userPermission.upsert({
        where: { userId_module_action: { userId, module: o.module, action: o.action } },
        update: { allowed: o.allowed },
        create: { userId, module: o.module, action: o.action, allowed: o.allowed },
      });
    }
  }
  await audit(admin.id, "update", "UserPermission", `${u.name} permissions`, u.id);
  revalidatePath("/users");
  return { ok: true };
}

export async function getUserActivity(userId: string) {
  await requirePermission("user-management", "view");
  const [loginAttempts, auditLogs] = await Promise.all([
    prisma.loginAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ where: { OR: [{ userId }, { targetUserId: userId }] }, orderBy: { createdAt: "desc" }, take: 10, include: { user: true } }),
  ]);
  return { loginAttempts, auditLogs };
}

export async function getBranchDetail(branchId: string) {
  await requireUser();
  return fetchBranchDetail(branchId);
}

export async function updateBranchNotes(branchId: string, notes: string) {
  const user = await requirePermission("branches", "edit");
  const branch = await prisma.branch.update({ where: { id: branchId }, data: { notes: notes.slice(0, 2000) } });
  await audit(user.id, "update", "Branch", "Notes updated", undefined, branch.name);
  revalidatePath("/");
  revalidatePath("/branches");
  return { ok: true };
}

export type ValuationInput = { branchId: string | null; periodType: string; periodEnding: string; valueCdf: number; valueUsd: number; remarks: string; cashCdf?: number; cashUsd?: number; warehouseValue?: number; branchValue?: number };

export async function saveValuation(input: ValuationInput) {
  const user = await requireUser();
  const branch = input.branchId ? await prisma.branch.findUnique({ where: { id: input.branchId } }) : null;
  await prisma.inventoryValuation.create({ data: { branchId: input.branchId, periodType: input.periodType, periodEnding: new Date(input.periodEnding + "T00:00:00"), valueCdf: input.valueCdf || 0, valueUsd: input.valueUsd || 0, remarks: input.remarks || "", cashCdf: input.cashCdf ?? null, cashUsd: input.cashUsd ?? null, warehouseValue: input.warehouseValue ?? null, branchValue: input.branchValue ?? null } });
  await audit(user.id, "create", "InventoryValuation", input.periodType, undefined, branch?.name);
  revalidatePath("/branches");
  revalidatePath("/inventory");
  return { ok: true };
}

// ---- Suppliers ----

function revalidateSuppliers() {
  revalidatePath("/");
  revalidatePath("/suppliers");
  revalidatePath("/suppliers/goods-received");
  revalidatePath("/suppliers/purchases");
  revalidatePath("/suppliers/payments");
  revalidatePath("/suppliers/reports");
}

export type SupplierInput = { name: string; company: string; contactPerson: string; phone: string; status: string; notes: string };

export async function createSupplier(input: SupplierInput) {
  const user = await requirePermission("suppliers", "create");
  if (!input.name.trim()) return { ok: false, error: "Supplier name is required." };
  const s = await prisma.supplier.create({
    data: { name: input.name.trim(), company: input.company.trim(), contactPerson: input.contactPerson.trim(), phone: input.phone.trim(), status: input.status || "Active", notes: input.notes || "" },
  });
  await audit(user.id, "create", "Supplier", s.name);
  revalidateSuppliers();
  return { ok: true, id: s.id };
}

export type SupplierUpdateInput = SupplierInput & { id: string };

export async function updateSupplier(input: SupplierUpdateInput) {
  const user = await requirePermission("suppliers", "edit");
  if (!input.name.trim()) return { ok: false, error: "Supplier name is required." };
  const s = await prisma.supplier.update({
    where: { id: input.id },
    data: { name: input.name.trim(), company: input.company.trim(), contactPerson: input.contactPerson.trim(), phone: input.phone.trim(), status: input.status || "Active", notes: input.notes || "" },
  });
  await audit(user.id, "update", "Supplier", s.name);
  revalidateSuppliers();
  return { ok: true, id: s.id };
}

export async function deleteSupplier(id: string, password: string) {
  const user = await requirePermission("suppliers", "delete");
  if (!(await verifyOwnPassword(user, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  const s = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true, payments: true, goodsReceipts: true } } },
  });
  if (!s) return { ok: false, error: "Supplier not found." };
  const hasHistory = s._count.purchases > 0 || s._count.payments > 0 || s._count.goodsReceipts > 0;
  if (hasHistory) return { ok: false, error: `${s.name} has purchase/payment/goods-received history — mark it Inactive instead of deleting.` };
  await prisma.supplier.delete({ where: { id } });
  await audit(user.id, "delete", "Supplier", s.name);
  revalidateSuppliers();
  return { ok: true };
}

export type GoodsReceiptInput = {
  supplierId: string; branchId: string; date: string; note: string;
  lines: { productId: string; quantity: number }[];
};

export async function createGoodsReceipt(input: GoodsReceiptInput) {
  const user = await requirePermission("suppliers", "create");
  const lines = input.lines.filter((l) => l.productId && l.quantity > 0);
  if (!input.supplierId || !input.branchId || lines.length === 0) return { ok: false, error: "Supplier, branch and at least one product/quantity line are required." };
  const date = new Date(input.date + "T00:00:00");

  const [supplier, branch] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: input.supplierId } }),
    prisma.branch.findUnique({ where: { id: input.branchId } }),
  ]);
  if (!supplier || !branch) return { ok: false, error: "Supplier or branch not found." };

  const gr = await prisma.goodsReceipt.create({
    data: {
      supplierId: input.supplierId, branchId: input.branchId, date, note: input.note || "", createdById: user.id,
      receipts: { create: lines.map((l) => ({ branchId: input.branchId, productId: l.productId, quantity: l.quantity, supplier: supplier.name, date })) },
    },
    include: { receipts: true },
  });

  for (const r of gr.receipts) {
    await prisma.stockMovement.create({ data: { branchId: input.branchId, productId: r.productId, type: "receipt", quantity: r.quantity, toName: branch.name, fromName: supplier.name, note: "Received from supplier", date } });
  }

  await audit(user.id, "create", "GoodsReceipt", `${supplier.name} → ${branch.name}`, undefined, branch.name);
  revalidateSuppliers();
  revalidatePath("/products");
  revalidatePath("/inventory");
  return { ok: true, id: gr.id };
}

export async function deleteGoodsReceipt(id: string, password: string) {
  const user = await requirePermission("suppliers", "delete");
  if (!(await verifyOwnPassword(user, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  const gr = await prisma.goodsReceipt.findUnique({ where: { id }, include: { supplier: true, branch: true } });
  if (!gr) return { ok: false, error: "Goods receipt not found." };
  await prisma.goodsReceipt.delete({ where: { id } });
  await audit(user.id, "delete", "GoodsReceipt", `${gr.supplier.name} → ${gr.branch.name}`, undefined, gr.branch.name);
  revalidateSuppliers();
  revalidatePath("/products");
  revalidatePath("/inventory");
  return { ok: true };
}

export type SupplierPurchaseInput = { supplierId: string; date: string; invoiceNumber: string; totalAmount: number; currency: string; notes: string };

export async function createSupplierPurchase(input: SupplierPurchaseInput) {
  const user = await requirePermission("suppliers", "create");
  if (!input.supplierId || !input.totalAmount) return { ok: false, error: "Supplier and amount are required." };
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) return { ok: false, error: "Supplier not found." };
  const p = await prisma.supplierPurchase.create({
    data: {
      supplierId: input.supplierId, date: new Date(input.date + "T00:00:00"), invoiceNumber: input.invoiceNumber || "",
      totalAmount: input.totalAmount, currency: input.currency || "CDF", notes: input.notes || "", createdById: user.id,
    },
  });
  await audit(user.id, "create", "SupplierPurchase", `${supplier.name} · ${input.invoiceNumber || "no invoice #"}`);
  revalidateSuppliers();
  return { ok: true, id: p.id };
}

export type SupplierPurchaseUpdateInput = SupplierPurchaseInput & { id: string };

export async function updateSupplierPurchase(input: SupplierPurchaseUpdateInput) {
  const user = await requirePermission("suppliers", "edit");
  if (!input.totalAmount) return { ok: false, error: "Amount is required." };
  const p = await prisma.supplierPurchase.update({
    where: { id: input.id },
    data: { date: new Date(input.date + "T00:00:00"), invoiceNumber: input.invoiceNumber || "", totalAmount: input.totalAmount, currency: input.currency || "CDF", notes: input.notes || "" },
    include: { supplier: true },
  });
  await audit(user.id, "update", "SupplierPurchase", `${p.supplier.name} · ${p.invoiceNumber || "no invoice #"}`);
  revalidateSuppliers();
  return { ok: true, id: p.id };
}

export async function deleteSupplierPurchase(id: string, password: string) {
  const user = await requirePermission("suppliers", "delete");
  if (!(await verifyOwnPassword(user, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  const p = await prisma.supplierPurchase.findUnique({ where: { id }, include: { supplier: true } });
  if (!p) return { ok: false, error: "Purchase not found." };
  await prisma.supplierPurchase.delete({ where: { id } });
  await audit(user.id, "delete", "SupplierPurchase", `${p.supplier.name} · ${p.invoiceNumber || "no invoice #"}`);
  revalidateSuppliers();
  return { ok: true };
}

export type SupplierPaymentInput = { supplierId: string; date: string; amount: number; currency: string; method: string; referenceNumber: string; notes: string };

export async function createSupplierPayment(input: SupplierPaymentInput) {
  const user = await requirePermission("suppliers", "create");
  if (!input.supplierId || !input.amount) return { ok: false, error: "Supplier and amount are required." };
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) return { ok: false, error: "Supplier not found." };
  const p = await prisma.supplierPayment.create({
    data: {
      supplierId: input.supplierId, date: new Date(input.date + "T00:00:00"), amount: input.amount, currency: input.currency || "CDF",
      method: input.method || "Cash", referenceNumber: input.referenceNumber || "", notes: input.notes || "", createdById: user.id,
    },
  });
  await audit(user.id, "create", "SupplierPayment", `${supplier.name} · ${input.currency} ${input.amount}`);
  revalidateSuppliers();
  revalidatePath("/finance");
  return { ok: true, id: p.id };
}

export type SupplierPaymentUpdateInput = SupplierPaymentInput & { id: string };

export async function updateSupplierPayment(input: SupplierPaymentUpdateInput) {
  const user = await requirePermission("suppliers", "edit");
  if (!input.amount) return { ok: false, error: "Amount is required." };
  const existing = await prisma.supplierPayment.findUnique({ where: { id: input.id } });
  if (existing?.locked) return { ok: false, error: "This payment is approved and locked. Unapprove it first to make changes." };
  const p = await prisma.supplierPayment.update({
    where: { id: input.id },
    data: { date: new Date(input.date + "T00:00:00"), amount: input.amount, currency: input.currency || "CDF", method: input.method || "Cash", referenceNumber: input.referenceNumber || "", notes: input.notes || "" },
    include: { supplier: true },
  });
  await audit(user.id, "update", "SupplierPayment", `${p.supplier.name} · ${p.currency} ${p.amount}`);
  revalidateSuppliers();
  revalidatePath("/finance");
  return { ok: true, id: p.id };
}

export async function deleteSupplierPayment(id: string, password: string) {
  const user = await requirePermission("suppliers", "delete");
  if (!(await verifyOwnPassword(user, password))) return { ok: false, error: WRONG_PASSWORD_ERROR };
  const p = await prisma.supplierPayment.findUnique({ where: { id }, include: { supplier: true } });
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.locked) return { ok: false, error: "This payment is approved and locked. Unapprove it first to delete." };
  await prisma.supplierPayment.delete({ where: { id } });
  await audit(user.id, "delete", "SupplierPayment", `${p.supplier.name} · ${p.currency} ${p.amount}`);
  revalidateSuppliers();
  revalidatePath("/finance");
  return { ok: true };
}

// Approving a payment is what actually deducts it from Available Cash / Outstanding Balance
// (see getSupplierPaymentsTotal / getSuppliersWithBalances) — recording one only puts it in
// the pending queue. Mirrors approveReport/unlockReport's status+locked+approvedAt pattern.
export async function approveSupplierPayment(id: string) {
  const user = await requirePermission("suppliers", "approve");
  const p = await prisma.supplierPayment.update({
    where: { id },
    data: { status: "approved", locked: true, approvedAt: new Date() },
    include: { supplier: true },
  });
  await audit(user.id, "approve", "SupplierPayment", `${p.supplier.name} · ${p.currency} ${p.amount}`);
  revalidateSuppliers();
  revalidatePath("/finance");
  return { ok: true };
}

export async function unapproveSupplierPayment(id: string) {
  const user = await requirePermission("suppliers", "edit");
  const p = await prisma.supplierPayment.update({
    where: { id },
    data: { status: "pending", locked: false, approvedAt: null },
    include: { supplier: true },
  });
  await audit(user.id, "unapprove", "SupplierPayment", `${p.supplier.name} · ${p.currency} ${p.amount}`);
  revalidateSuppliers();
  revalidatePath("/finance");
  return { ok: true };
}

export async function getSupplierDetailAction(supplierId: string) {
  await requirePermission("suppliers", "view");
  return getSupplierDetailData(supplierId);
}

// ============================================================================
// FINANCIAL DATA RESET — Super Administrator only. Available Cash, Overall Cash
// Collected, Today's Cash Collected, and the Cash Ledger are never stored; they're
// always computed live from DailyReport + Expense + SupplierPayment (see
// lib/metrics.ts). There is nothing to "reset" independently of those three tables —
// this action deletes the real underlying records, and the computed figures read as
// zero/empty as a direct consequence. Every Expense has a required (non-nullable)
// reportId with onDelete: Cascade, so deleting Daily Reports always deletes their
// Expenses too, regardless of whether "expenses" is separately selected.
// ============================================================================

export type CashResetScope = "reports" | "expenses" | "payments";

async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.roleRef.key !== "super_admin") throw new Error("Only the Super Administrator can perform this action.");
  return user;
}

export async function getCashResetPreview(): Promise<{ reports: number; expenses: number; payments: number }> {
  await requireSuperAdmin();
  const [reports, expenses, payments] = await Promise.all([
    prisma.dailyReport.count(),
    prisma.expense.count(),
    prisma.supplierPayment.count(),
  ]);
  return { reports, expenses, payments };
}

const RESET_CONFIRM_PHRASE = "RESET FINANCIAL DATA";

export async function resetFinancialData(input: {
  scopes: CashResetScope[];
  confirmPhrase: string;
  password: string;
  reason?: string;
}): Promise<{ ok: true; deletedReports: number; deletedExpenses: number; deletedPayments: number; totalDeleted: number } | { ok: false; error: string }> {
  const user = await requireSuperAdmin();

  const scopes = new Set(input.scopes);
  if (scopes.size === 0) return { ok: false, error: "Select at least one category to reset." };
  if (input.confirmPhrase !== RESET_CONFIRM_PHRASE) return { ok: false, error: `Type "${RESET_CONFIRM_PHRASE}" exactly to confirm.` };
  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) return { ok: false, error: "Password is incorrect." };

  // Recomputed fresh here rather than trusting any count the client sent — this is what
  // actually gets deleted and what goes in the audit log.
  const resettingReports = scopes.has("reports");
  const resettingExpenses = scopes.has("expenses") || resettingReports; // cascade makes these inseparable
  const resettingPayments = scopes.has("payments");

  const [reportsCount, expensesCount, paymentsCount] = await Promise.all([
    resettingReports ? prisma.dailyReport.count() : Promise.resolve(0),
    resettingExpenses ? prisma.expense.count() : Promise.resolve(0),
    resettingPayments ? prisma.supplierPayment.count() : Promise.resolve(0),
  ]);

  await prisma.$transaction(async (tx) => {
    if (resettingExpenses && !resettingReports) await tx.expense.deleteMany({});
    if (resettingReports) await tx.dailyReport.deleteMany({}); // cascades Expense rows
    if (resettingPayments) await tx.supplierPayment.deleteMany({});
  });

  const totalDeleted = reportsCount + expensesCount + paymentsCount;
  const parts: string[] = [];
  if (resettingReports) parts.push(`${reportsCount} daily report(s)`);
  if (resettingExpenses) parts.push(`${expensesCount} expense(s)`);
  if (resettingPayments) parts.push(`${paymentsCount} supplier payment(s)`);
  const detail = `Deleted ${parts.join(", ")} — ${totalDeleted} record(s) total.${input.reason ? ` Reason: ${input.reason}` : ""}`;

  await audit(user.id, "financial-reset", "FinancialData", detail);

  revalidatePath("/");
  revalidatePath("/reports-daily");
  revalidatePath("/reports-daily/trash");
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/suppliers/payments");
  revalidatePath("/suppliers/reports");
  revalidatePath("/settings");

  return { ok: true, deletedReports: reportsCount, deletedExpenses: expensesCount, deletedPayments: paymentsCount, totalDeleted };
}

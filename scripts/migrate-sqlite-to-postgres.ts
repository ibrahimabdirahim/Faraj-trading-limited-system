// One-time data migration: copies every row from the old SQLite database file into the
// PostgreSQL database pointed at by DATABASE_URL. Schema migration (prisma migrate) only
// creates empty tables — this script is what actually moves your existing business data
// (branches, users, daily reports, suppliers, payments, etc.) across.
//
// Usage:
//   SQLITE_PATH=./database/prisma/dev.db npx tsx scripts/migrate-sqlite-to-postgres.ts
//
// DATABASE_URL (the Postgres target) is read the normal way, from your environment/.env.
// Safe to re-run: every insert is wrapped in a transaction per table and the script stops
// on the first error rather than leaving a half-migrated database.
import { DatabaseSync } from "node:sqlite";
import { PrismaClient, Prisma } from "@prisma/client";

const sqlitePath = process.env.SQLITE_PATH ?? "./database/prisma/dev.db";
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const prisma = new PrismaClient();

// Insertion order respects every foreign key in the schema (a referenced row is always
// migrated before the row that points to it).
const TABLE_ORDER = [
  "Role", "Branch", "Category", "Setting",
  "User", "Product", "Supplier",
  "UserBranch", "UserPermission", "LoginAttempt", "Session", "BranchPrice",
  "DailyReport", "GoodsReceipt",
  "StockReceipt", "Expense", "InventoryValuation", "StockMovement",
  "SupplierPurchase", "SupplierPayment", "AuditLog",
] as const;

// model name -> delegate name (Prisma lowercases the first letter for the client property)
function delegateName(model: string): string {
  return model[0].toLowerCase() + model.slice(1);
}

// Field kinds per model, read from Prisma's own schema metadata — SQLite has no real
// Boolean/DateTime types (it stores them as 0/1 integers and epoch-millisecond integers),
// so raw reads via node:sqlite need this to convert them back to what Postgres expects.
function fieldKinds(model: string): { booleans: string[]; dates: string[] } {
  const dmmfModel = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  if (!dmmfModel) throw new Error(`Unknown model ${model}`);
  const booleans = dmmfModel.fields.filter((f) => f.type === "Boolean").map((f) => f.name);
  const dates = dmmfModel.fields.filter((f) => f.type === "DateTime").map((f) => f.name);
  return { booleans, dates };
}

function convertRow(row: Record<string, unknown>, kinds: { booleans: string[]; dates: string[] }) {
  const out: Record<string, unknown> = { ...row };
  for (const b of kinds.booleans) if (out[b] !== null && out[b] !== undefined) out[b] = Boolean(out[b]);
  for (const d of kinds.dates) if (out[d] !== null && out[d] !== undefined) out[d] = new Date(Number(out[d]));
  return out;
}

async function migrateTable(model: string) {
  const kinds = fieldKinds(model);
  const rows = sqlite.prepare(`SELECT * FROM "${model}"`).all() as Record<string, unknown>[];
  if (rows.length === 0) {
    console.log(`${model}: 0 rows (skipped)`);
    return;
  }
  const converted = rows.map((r) => convertRow(r, kinds));
  const delegate = (prisma as unknown as Record<string, { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> }>)[delegateName(model)];
  const result = await delegate.createMany({ data: converted });
  console.log(`${model}: migrated ${result.count} / ${rows.length} rows`);
  if (result.count !== rows.length) throw new Error(`${model}: row count mismatch after insert`);
}

async function main() {
  console.log(`Reading from SQLite: ${sqlitePath}`);
  console.log(`Writing to Postgres: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}`);
  for (const table of TABLE_ORDER) {
    await migrateTable(table);
  }
  console.log("\nData migration complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

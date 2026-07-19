-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SupplierPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CDF',
    "method" TEXT NOT NULL DEFAULT 'Cash',
    "referenceNumber" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Existing payments were recorded under the old single-step model (immediately effective) —
-- backfill them as already-approved so this migration doesn't retroactively change any
-- currently-visible Available Cash / Outstanding Balance figures. Only new payments created
-- after this migration go through the pending -> approved workflow.
INSERT INTO "new_SupplierPayment" ("amount", "createdAt", "createdById", "currency", "date", "id", "method", "notes", "referenceNumber", "supplierId", "status", "locked", "approvedAt")
SELECT "amount", "createdAt", "createdById", "currency", "date", "id", "method", "notes", "referenceNumber", "supplierId", 'approved', true, "createdAt" FROM "SupplierPayment";
DROP TABLE "SupplierPayment";
ALTER TABLE "new_SupplierPayment" RENAME TO "SupplierPayment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

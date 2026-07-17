-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cashCdf" REAL NOT NULL DEFAULT 0,
    "cashUsd" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'WhatsApp',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "createdById" TEXT,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "DailyReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DailyReport_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DailyReport" ("approvedAt", "branchId", "cashCdf", "cashUsd", "createdAt", "date", "id", "locked", "note", "source", "status") SELECT "approvedAt", "branchId", "cashCdf", "cashUsd", "createdAt", "date", "id", "locked", "note", "source", "status" FROM "DailyReport";
DROP TABLE "DailyReport";
ALTER TABLE "new_DailyReport" RENAME TO "DailyReport";
CREATE UNIQUE INDEX "DailyReport_branchId_date_key" ON "DailyReport"("branchId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

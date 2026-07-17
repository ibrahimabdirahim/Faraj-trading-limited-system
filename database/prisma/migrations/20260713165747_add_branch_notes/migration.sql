-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "manager" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#0E7C6B',
    "type" TEXT NOT NULL DEFAULT 'branch',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Branch" ("active", "color", "createdAt", "id", "manager", "name", "sortOrder", "type") SELECT "active", "color", "createdAt", "id", "manager", "name", "sortOrder", "type" FROM "Branch";
DROP TABLE "Branch";
ALTER TABLE "new_Branch" RENAME TO "Branch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

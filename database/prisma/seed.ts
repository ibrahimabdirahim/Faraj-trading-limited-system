import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BRANCHES = [
  { name: "Luilu 1", manager: "Kabongo M.", color: "#0E7C6B", sortOrder: 1 },
  { name: "Luilu 2", manager: "Ngoy F.", color: "#DC2626", sortOrder: 2 },
  { name: "Lumundu", manager: "Mwamba J.", color: "#0EA5E9", sortOrder: 3 },
  { name: "Mipeto 1", manager: "Ilunga P.", color: "#C77300", sortOrder: 4 },
  { name: "Mipeto 2", manager: "Kalala D.", color: "#DB2777", sortOrder: 5 },
  { name: "KWM", manager: "Tshibangu L.", color: "#7C5CE0", sortOrder: 6 },
];

const CATEGORIES = ["Construction", "Food", "Household", "Electronics", "Beverages", "Hardware", "Other"];

// Kept in sync with lib/permissionTypes.ts's ROLES — duplicated here (not imported) because this
// script runs standalone via `tsx`, outside Next's bundler, and lib/permissions.ts pulls in the
// "server-only" guard which only resolves inside Next's own build.
const ROLES: { key: string; name: string }[] = [
  { key: "super_admin", name: "Super Administrator" },
  { key: "general_admin", name: "General Administrator" },
  { key: "it_admin", name: "IT Admin" },
  { key: "branch_manager", name: "Branch Manager" },
  { key: "accountant", name: "Accountant" },
  { key: "inventory_officer", name: "Inventory Officer" },
  { key: "auditor", name: "Auditor" },
  { key: "viewer", name: "Viewer (Read Only)" },
];

async function main() {
  // Roles (7 system defaults — permission grants themselves are hardcoded in lib/permissions.ts,
  // not stored per-role in the DB; this table only exists to give users a roleId to point at).
  const roleByKey = new Map<string, string>();
  for (const r of ROLES) {
    const row = await prisma.role.upsert({ where: { key: r.key }, update: { name: r.name }, create: { key: r.key, name: r.name, isSystem: true } });
    roleByKey.set(r.key, row.id);
  }

  // Admin
  const email = "soljaman293@gmail.com";
  const passwordHash = await bcrypt.hash("faraj2026", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Soulemane A.", email, username: "admin", passwordHash, roleId: roleByKey.get("general_admin")!, allBranches: true },
  });

  // Settings
  const settings: Record<string, string> = {
    companyName: "Faraj Trading Limited",
    fxRate: "2850",
    primaryCurrency: "CDF",
    rounding: "100",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // Branches + warehouse
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: `seed-${b.name.replace(/\s+/g, "-").toLowerCase()}` },
      update: {},
      create: { id: `seed-${b.name.replace(/\s+/g, "-").toLowerCase()}`, ...b, type: "branch" },
    });
  }
  await prisma.branch.upsert({
    where: { id: "seed-warehouse" },
    update: {},
    create: { id: "seed-warehouse", name: "Head Office Warehouse", manager: "Head Office", color: "#0A5D50", type: "warehouse", sortOrder: 0 },
  });

  // Categories (structure only — no products, no reports seeded)
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("Seeded: %d roles, 1 admin, %d branches + warehouse, %d categories.", ROLES.length, BRANCHES.length, CATEGORIES.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

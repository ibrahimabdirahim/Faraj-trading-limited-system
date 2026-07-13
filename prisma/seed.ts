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

async function main() {
  // Admin
  const email = "soljaman293@gmail.com";
  const passwordHash = await bcrypt.hash("faraj2026", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Soulemane A.", email, passwordHash, role: "admin" },
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

  console.log("Seeded: 1 admin, %d branches + warehouse, %d categories.", BRANCHES.length, CATEGORIES.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

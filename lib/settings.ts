import { prisma } from "./db";

export type AppSettings = {
  companyName: string;
  fxRate: number; // 1 USD = fxRate CDF
  primaryCurrency: "CDF" | "USD";
  rounding: string;
};

const DEFAULTS: AppSettings = {
  companyName: "Faraj Trading Limited",
  fxRate: 2850,
  primaryCurrency: "CDF",
  rounding: "100",
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    companyName: map.companyName ?? DEFAULTS.companyName,
    fxRate: map.fxRate ? Number(map.fxRate) : DEFAULTS.fxRate,
    primaryCurrency: (map.primaryCurrency as "CDF" | "USD") ?? DEFAULTS.primaryCurrency,
    rounding: map.rounding ?? DEFAULTS.rounding,
  };
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

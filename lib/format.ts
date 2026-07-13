// Money & date formatting. CDF and USD are always kept separate.

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function money(n: number, currency: "CDF" | "USD"): string {
  if (currency === "USD") return "$" + fmt(n, n % 1 === 0 ? 0 : 2);
  return fmt(Math.round(n)) + " FC";
}

// short form: 1.24M, 3.5B, 940K
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return fmt(n);
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// combined estimate using the admin-set FX rate (display only, never persisted)
export function combinedCdf(cdf: number, usd: number, fx: number): number {
  return cdf + usd * fx;
}

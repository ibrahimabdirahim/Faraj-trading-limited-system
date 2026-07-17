// Shared brand palette for exported/printed documents (Excel, PDF, print view).
// Fixed light-theme hex values — exports are printed on paper, so they never follow dark mode.

export const DOC_COLORS: Record<string, string> = {
  "var(--brand)": "#0E7C6B",
  "var(--brand-2)": "#0A5D50",
  "var(--good)": "#16A34A",
  "var(--warn)": "#C77300",
  "var(--crit)": "#DC2626",
  "var(--cdf)": "#7C5CE0",
};

export function docColor(cssVar: string): string {
  return DOC_COLORS[cssVar] ?? "#0E7C6B";
}

export const DOC_THEME = {
  brand: "#0E7C6B",
  brandDark: "#0A5D50",
  text: "#131C1A",
  muted: "#69766F",
  border: "#E6EAE8",
  bandFill: "#F1F8F6",
};

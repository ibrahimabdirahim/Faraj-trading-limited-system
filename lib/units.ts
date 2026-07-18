// Shared unit-of-measure options for product creation — client-safe (no server imports) so
// both the Products page's Add Product form and the Daily Report wizard's inline quick-add
// can present the same consistent list instead of free-typed, inconsistent unit strings.
export const PRODUCT_UNITS = [
  "Piece", "Kg", "Gram", "Liter", "Sachet", "Bag", "Carton", "Box", "Pack",
  "Bottle", "Sack", "Crate", "Roll", "Dozen", "Unit",
] as const;

// Sentinel select-option value that reveals a free-text "custom unit" input — keeps the
// preset list fast for common cases without blocking a genuinely unusual unit of measure.
export const OTHER_UNIT = "__other__";

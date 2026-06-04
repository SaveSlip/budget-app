export function normalizeDesc(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeDesc(a);
  const nb = normalizeDesc(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

// Extracts a stable merchant key from a raw bank description.
// Canadian Interac descriptions follow the pattern:
//   "<BANK_PREFIX> - <REF_NUMBER?> <MERCHANT_NAME>"
// e.g. "CONTACTLESS INTERAC PURCHASE - 6985 SWAGAT INDIAN S" → "swagat indian s"
export function extractMerchant(description: string): string {
  let s = description.toLowerCase().trim();
  const dashIdx = s.lastIndexOf(" - ");
  if (dashIdx !== -1) s = s.slice(dashIdx + 3).trim();
  s = s.replace(/^\d+\s+/, "");
  return s.trim();
}

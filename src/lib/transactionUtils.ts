export function normalizeDesc(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeDesc(a);
  const nb = normalizeDesc(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

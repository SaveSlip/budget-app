export function clearFilterStorage(userId: string) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(`budgify-filter-${userId}`); } catch {}
}

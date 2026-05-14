import type { Session } from "next-auth";

export class ForbiddenError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
  toResponse() {
    return { error: "FORBIDDEN" as const };
  }
}

/**
 * Throws ForbiddenError if the session user is not authorized to access targetUserId's data.
 * MASTER users pass unconditionally. MEMBER users granted household view also pass.
 * All other MEMBERs are restricted to their own userId partition.
 */
export function assertAuthorized(session: Session | null, targetUserId: string): void {
  if (!session?.user?.id) throw new ForbiddenError("Unauthenticated");
  if (session.user.role === "MASTER") return;
  if (session.user.canViewHousehold && session.user.householdId) return;
  if (session.user.id !== targetUserId) throw new ForbiddenError();
}

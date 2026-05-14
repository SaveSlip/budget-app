import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeUserId: string;
      role: "MASTER" | "MEMBER" | null;
      householdId: string | null;
      canViewHousehold: boolean;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    activeUserId: string;
    role?: "MASTER" | "MEMBER" | null;
    householdId?: string | null;
    canViewHousehold?: boolean;
  }
}

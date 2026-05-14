import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeUserId: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

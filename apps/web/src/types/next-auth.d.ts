import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    tenantId?: string;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

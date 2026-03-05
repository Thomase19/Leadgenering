import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/widget"];
const widgetPathPrefix = "/api/widget";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (publicPaths.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(login);
    }
  } catch {
    const login = new URL("/login", req.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|widget/).*)"],
};

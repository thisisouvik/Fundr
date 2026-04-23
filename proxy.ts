import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const protectedRoutes = ["/dashboard", "/settings", "/fundraising", "/history"];
const authRoutes = ["/login", "/register", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
  const isAdminRoute = path.startsWith("/admin");

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const configuredAdminEmail = (process.env.ADMIN_PANEL_EMAIL || "").trim().toLowerCase();
    const userEmail = (user.email || "").trim().toLowerCase();
    if (!configuredAdminEmail || configuredAdminEmail !== userEmail) {
      return NextResponse.redirect(new URL("/dashboard?admin_error=denied", request.url));
    }
  }

  if (path.startsWith("/onboarding") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/fundraising/:path*",
    "/history/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/onboarding",
  ],
};
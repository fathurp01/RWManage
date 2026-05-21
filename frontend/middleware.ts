import { NextResponse, type NextRequest } from "next/server";
import {
  isValidRole,
  isValidStatusAkun,
  type AuthUser,
  AUTH_ROLE_COOKIE,
  AUTH_STATUS_COOKIE,
} from "@/lib/auth";

const LOGIN_PATH = "/auth/login";
const STATUS_PATH = "/auth/status";
const RW_DASHBOARD_PATH = "/dashboard/rw";
const RW_DATA_PENDUDUK_PATH = "/dashboard/rw/data-penduduk";
const RT_DASHBOARD_PATH = "/dashboard/rt";
const MASJID_DASHBOARD_PATH = "/dashboard/masjid";
const SUPERADMIN_DASHBOARD_PATH = "/dashboard/superadmin";

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");

const fetchSessionUser = async (request: NextRequest): Promise<AuthUser | null> => {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const response = await fetch(`${apiBase}/auth/me`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: { user?: AuthUser } };
  const user = payload?.data?.user;

  if (!user || !isValidRole(user.role) || !isValidStatusAkun(user.status_akun)) {
    return null;
  }

  return user;
};

const redirectToLogin = (request: NextRequest, reason?: string) => {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  if (reason) {
    loginUrl.searchParams.set("reason", reason);
  }

  return NextResponse.redirect(loginUrl);
};

const withAuthCookies = (response: NextResponse, user: AuthUser): NextResponse => {
  const maxAge = 2 * 60 * 60; // 2 hours, matches backend token TTL
  response.cookies.set(AUTH_ROLE_COOKIE, user.role, { path: "/", maxAge, sameSite: "lax" });
  response.cookies.set(AUTH_STATUS_COOKIE, user.status_akun, { path: "/", maxAge, sameSite: "lax" });
  return response;
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const user = await fetchSessionUser(request);
  if (!user) {
    return redirectToLogin(request, "unauthorized");
  }

  const role = user.role;
  const statusAkun = user.status_akun;

  if (statusAkun !== "APPROVED") {
    const statusUrl = new URL(STATUS_PATH, request.url);
    statusUrl.searchParams.set("status", statusAkun);
    return NextResponse.redirect(statusUrl);
  }

  if (pathname === "/dashboard") {
    if (role === "RW") {
      return withAuthCookies(NextResponse.redirect(new URL(RW_DATA_PENDUDUK_PATH, request.url)), user);
    } else if (role === "RT") {
      return withAuthCookies(NextResponse.redirect(new URL(RT_DASHBOARD_PATH, request.url)), user);
    } else if (role === "SUPERADMIN") {
      return withAuthCookies(NextResponse.redirect(new URL(SUPERADMIN_DASHBOARD_PATH, request.url)), user);
    } else {
      return withAuthCookies(NextResponse.redirect(new URL(MASJID_DASHBOARD_PATH, request.url)), user);
    }
  }

  if (pathname.startsWith("/dashboard/masjid") && (role === "RW" || role === "RT" || role === "SUPERADMIN")) {
    const destination = role === "RW" ? RW_DASHBOARD_PATH : role === "RT" ? RT_DASHBOARD_PATH : SUPERADMIN_DASHBOARD_PATH;
    return withAuthCookies(NextResponse.redirect(new URL(destination, request.url)), user);
  }

  if (pathname.startsWith("/dashboard/rw") && role !== "RW" && role !== "SUPERADMIN") {
    const destination = role === "RT" ? RT_DASHBOARD_PATH : MASJID_DASHBOARD_PATH;
    return withAuthCookies(NextResponse.redirect(new URL(destination, request.url)), user);
  }

  if (
    role === "RW" &&
    (pathname === "/dashboard/rw/warga" || pathname.startsWith("/dashboard/rw/warga/"))
  ) {
    return withAuthCookies(NextResponse.redirect(new URL(RW_DATA_PENDUDUK_PATH, request.url)), user);
  }

  if (pathname.startsWith("/dashboard/rt") && role !== "RT") {
    const destination = role === "RW" ? RW_DASHBOARD_PATH : role === "SUPERADMIN" ? SUPERADMIN_DASHBOARD_PATH : MASJID_DASHBOARD_PATH;
    return withAuthCookies(NextResponse.redirect(new URL(destination, request.url)), user);
  }

  return withAuthCookies(NextResponse.next(), user);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

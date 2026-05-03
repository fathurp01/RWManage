import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ROLE_COOKIE,
  AUTH_STATUS_COOKIE,
  AUTH_TOKEN_COOKIE,
  isValidRole,
  isValidStatusAkun,
} from "@/lib/auth";

const LOGIN_PATH = "/auth/login";
const STATUS_PATH = "/auth/status";
const RW_DASHBOARD_PATH = "/dashboard/rw/warga";
const RT_DASHBOARD_PATH = "/dashboard/rt";
const MASJID_DASHBOARD_PATH = "/dashboard/masjid";
const SUPERADMIN_DASHBOARD_PATH = "/dashboard/superadmin";

const redirectToLogin = (request: NextRequest, reason?: string) => {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  if (reason) {
    loginUrl.searchParams.set("reason", reason);
  }

  return NextResponse.redirect(loginUrl);
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE)?.value;
  const statusAkun = request.cookies.get(AUTH_STATUS_COOKIE)?.value;

  if (!token || !role || !statusAkun || !isValidRole(role) || !isValidStatusAkun(statusAkun)) {
    return redirectToLogin(request, "unauthorized");
  }

  if (statusAkun !== "APPROVED") {
    const statusUrl = new URL(STATUS_PATH, request.url);
    statusUrl.searchParams.set("status", statusAkun);
    return NextResponse.redirect(statusUrl);
  }

  if (pathname === "/dashboard") {
    if (role === "RW") {
      return NextResponse.redirect(new URL(RW_DASHBOARD_PATH, request.url));
    } else if (role === "RT") {
      return NextResponse.redirect(new URL(RT_DASHBOARD_PATH, request.url));
    } else if (role === "SUPERADMIN") {
      return NextResponse.redirect(new URL(SUPERADMIN_DASHBOARD_PATH, request.url));
    } else {
      return NextResponse.redirect(new URL(MASJID_DASHBOARD_PATH, request.url));
    }
  }

  if (pathname.startsWith("/dashboard/masjid") && (role === "RW" || role === "RT" || role === "SUPERADMIN")) {
    const destination = role === "RW" ? RW_DASHBOARD_PATH : role === "RT" ? RT_DASHBOARD_PATH : SUPERADMIN_DASHBOARD_PATH;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (pathname.startsWith("/dashboard/rw") && role !== "RW" && role !== "SUPERADMIN") {
    const destination = role === "RT" ? RT_DASHBOARD_PATH : MASJID_DASHBOARD_PATH;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (pathname.startsWith("/dashboard/rt") && role !== "RT") {
    const destination = role === "RW" ? RW_DASHBOARD_PATH : role === "SUPERADMIN" ? SUPERADMIN_DASHBOARD_PATH : MASJID_DASHBOARD_PATH;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

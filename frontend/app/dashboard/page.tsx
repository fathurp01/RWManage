import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ROLE_COOKIE, isValidRole } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const roleFromCookie = cookieStore.get(AUTH_ROLE_COOKIE)?.value;

  if (!isValidRole(roleFromCookie)) {
    redirect("/auth/login");
  }

  if (roleFromCookie === "SUPERADMIN") {
    redirect("/dashboard/superadmin");
  }

  if (roleFromCookie === "RW") {
    redirect("/dashboard/rw/data-penduduk");
  }

  if (roleFromCookie === "RT") {
    redirect("/dashboard/rt/overview");
  }

  redirect("/dashboard/masjid");
}

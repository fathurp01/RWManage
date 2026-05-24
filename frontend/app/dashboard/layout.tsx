import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AUTH_ROLE_COOKIE, isValidRole, type AppRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const roleFromCookie = cookieStore.get(AUTH_ROLE_COOKIE)?.value;
  const role: AppRole | null = isValidRole(roleFromCookie) ? roleFromCookie : null;

  return (
    <DashboardShell role={role}>
      {children}
    </DashboardShell>
  );
}

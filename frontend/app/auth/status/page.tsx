import { cookies } from "next/headers";
import { AlertTriangle, Clock3, ShieldX } from "lucide-react";
import { AUTH_STATUS_COOKIE, AUTH_ROLE_COOKIE, isValidStatusAkun, isValidRole, type StatusAkun, type AppRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusActions } from "./StatusActions";

export default async function AuthStatusPage() {
  const cookieStore = await cookies();
  const rawStatus = cookieStore.get(AUTH_STATUS_COOKIE)?.value;
  const resolvedStatus: StatusAkun = isValidStatusAkun(rawStatus) ? rawStatus : "PENDING";
  
  const rawRole = cookieStore.get(AUTH_ROLE_COOKIE)?.value;
  const role: AppRole | null = isValidRole(rawRole) ? rawRole : null;

  const verifier = role === "RW" ? "Admin" : "pengurus RW";

  let pendingDescription = `Pengajuan akun sudah diterima. Mohon tunggu proses verifikasi dari ${verifier}.`;
  
  if (role === "RW") {
    pendingDescription = `Pengajuan akun Pengurus RW sudah diterima. Mohon tunggu proses verifikasi dari ${verifier}.`;
  } else if (role === "RT") {
    pendingDescription = `Pengajuan akun Pengurus RT sudah diterima. Mohon tunggu proses verifikasi dari ${verifier}.`;
  } else if (role === "PENGURUS_MASJID") {
    pendingDescription = `Pengajuan akun Pengurus Masjid sudah diterima. Mohon tunggu proses verifikasi dari ${verifier}.`;
  }

  const statusMeta: Record<StatusAkun, { title: string; description: string; icon: typeof Clock3 }> = {
    PENDING: {
      title: "Akun Anda sedang diproses",
      description: pendingDescription,
      icon: Clock3,
    },
    REJECTED: {
      title: "Pengajuan akun ditolak",
      description: `Akun belum dapat diaktifkan. Silakan periksa data pengajuan atau hubungi ${verifier}.`,
      icon: ShieldX,
    },
    APPROVED: {
      title: "Akun sudah disetujui",
      description: "Akun sudah aktif. Silakan kembali ke dashboard.",
      icon: AlertTriangle,
    },
  };

  const meta = statusMeta[resolvedStatus];
  const Icon = meta.icon;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#ecfeff_0%,transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,#172554_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#022c22_0%,transparent_40%)]" />

      <Card className="relative w-full max-w-2xl rounded-3xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur dark:border-border/60 dark:bg-card/40">
        <CardHeader className="space-y-3">
          <Badge variant={resolvedStatus === "REJECTED" ? "destructive" : "pending"} className="w-fit">
            Status: {resolvedStatus}
          </Badge>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon className="size-5" />
            {meta.title}
          </CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white/60 p-4 text-sm text-slate-600 shadow-sm dark:border-border/60 dark:bg-card/30 dark:text-muted-foreground">
            Jika Anda membutuhkan bantuan, siapkan email pendaftaran dan hubungi {verifier} agar proses verifikasi lebih cepat.
          </div>

          <StatusActions />
        </CardContent>
      </Card>
    </main>
  );
}

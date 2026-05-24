import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  Users,
  ShieldCheck,
  BookOpenText,
  CheckCircle2,
  TrendingUp,
  Globe,
  Sparkles,
  Building2,
  BarChart3,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


/* ─── Feature data ─── */
const features = [
  {
    icon: Users,
    title: "Iuran Warga",
    desc: "Grid 12 bulan per blok, rekap otomatis, dan status pembayaran real-time.",
    color: "indigo" as const,
  },
  {
    icon: HandCoins,
    title: "Zakat & Infaq",
    desc: "Dashboard ZIS masjid dengan formula distribusi tetap yang transparan.",
    color: "emerald" as const,
  },
  {
    icon: BookOpenText,
    title: "Buku Kas RW",
    desc: "Kelola kas masuk & keluar lengkap dengan bukti dan kode unik verifikasi.",
    color: "indigo" as const,
  },
  {
    icon: ShieldCheck,
    title: "Approval Akun",
    desc: "Alur approve / reject pengurus masjid yang aman dan terdokumentasi.",
    color: "emerald" as const,
  },
  {
    icon: Globe,
    title: "Portal Transparansi",
    desc: "Warga bisa verifikasi transaksi secara mandiri tanpa perlu login.",
    color: "indigo" as const,
  },
  {
    icon: Lock,
    title: "Keamanan & Privasi",
    desc: "Autentikasi berbasis role, token aman, dan enkripsi data penuh.",
    color: "emerald" as const,
  },
];

const steps = [
  {
    num: "01",
    title: "Registrasi & Approval",
    desc: "Daftarkan akun RW atau Pengurus Masjid. Ketua RW akan memverifikasi.\u00a0Proses seluruhnya digital.",
    color: "indigo" as const,
  },
  {
    num: "02",
    title: "Kelola Data Warga",
    desc: "Input blok wilayah dan akses grid 12 bulan iuran. Proses bayar langsung dalam satu klik.",
    color: "emerald" as const,
  },
  {
    num: "03",
    title: "Transparansi Publik",
    desc: "Setiap transaksi punya kode unik. Warga bisa verifikasi kapan saja melalui Portal Transparansi.",
    color: "indigo" as const,
  },
];

const stats = [
  { value: "12", label: "Bulan Iuran", suffix: "/tahun", icon: BarChart3 },
  { value: "100%", label: "Transparan", suffix: "", icon: TrendingUp },
  { value: "3", label: "Modul Aktif", suffix: "+", icon: Sparkles },
  { value: "2", label: "Peran Akun", suffix: "", icon: Building2 },
];

/* ─── Color map helper ─── */
const colorMap = {
  indigo: {
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconText: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200/60 dark:border-indigo-800/30",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    numText: "text-indigo-400 dark:text-indigo-600",
    dot: "bg-indigo-500",
    stepBg: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/60 dark:border-emerald-800/30",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    numText: "text-emerald-400 dark:text-emerald-600",
    dot: "bg-emerald-500",
    stepBg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-white/8 bg-white/80 dark:bg-card/80 backdrop-blur-xl supports-backdrop-filter:bg-white/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm group-hover:shadow-md group-hover:shadow-indigo-500/30 transition-all duration-200">
              <Building2 className="size-4" />
            </span>
            <span className="font-bold tracking-tight text-slate-900 dark:text-foreground">
              RWManage
            </span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-muted-foreground">
            <a href="#fitur" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">
              Cara Kerja
            </a>
            <Link href="/transparansi" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">
              Transparansi
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/register">Daftar</Link>
            </Button>
            <Button asChild variant="rw" size="sm">
              <Link href="/auth/login">
                Masuk Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden hero-gradient">
          {/* Decorative blobs */}
          <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 size-150 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 size-125 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10" />

          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50 px-3.5 py-1.5 dark:border-indigo-800/40 dark:bg-indigo-950/40">
                <Sparkles className="size-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Platform Digital RW & Masjid
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-5xl lg:text-6xl leading-tight">
                Kelola{" "}
                <span className="text-gradient-rw">Iuran Warga</span>
                {" & "}
                <span className="text-gradient-masjid">ZIS Masjid</span>
                {" "}dengan Mudah
              </h1>

              {/* Sub */}
              <p className="text-base sm:text-lg text-slate-500 dark:text-muted-foreground max-w-xl leading-relaxed">
                Satu platform untuk RW dan Pengurus Masjid — rekap iuran otomatis, distribusi ZIS transparan, dan verifikasi publik tanpa kerumitan.
              </p>

              {/* CTA group */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Button asChild variant="rw" size="lg" className="w-full sm:w-auto">
                  <Link href="/auth/register">
                    Mulai Gratis
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/transparansi">
                    Cek Transparansi
                  </Link>
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-muted-foreground">
                {[
                  "Gratis digunakan",
                  "Tanpa instalasi",
                  "Data aman & terenkripsi",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero mockup card */}
            <div className="mt-16 mx-auto max-w-4xl">
              <div className="relative rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-2xl shadow-slate-900/8 dark:shadow-black/30 overflow-hidden">
                {/* Mockup header bar */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/8 px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="size-3 rounded-full bg-red-400/80" />
                    <span className="size-3 rounded-full bg-amber-400/80" />
                    <span className="size-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="mx-auto w-48 rounded-md bg-slate-100/80 dark:bg-white/8 py-1 px-3 text-center text-xs text-slate-400 dark:text-muted-foreground">
                    rwmanage.app/dashboard
                  </div>
                </div>

                {/* Mockup body */}
                <div className="grid grid-cols-3 gap-0 p-5 sm:p-6">
                  {/* Sidebar mockup */}
                  <div className="col-span-1 hidden sm:flex flex-col gap-2 border-r border-slate-100 dark:border-white/8 pr-5 mr-5">
                    <div className="h-8 w-full rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center px-3 gap-2">
                      <div className="size-4 rounded bg-indigo-200/60 dark:bg-indigo-800/40" />
                      <div className="h-2 flex-1 rounded bg-indigo-200/60 dark:bg-indigo-800/40" />
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-7 w-full rounded-xl bg-slate-50 dark:bg-white/5 flex items-center px-3 gap-2">
                        <div className="size-3.5 rounded bg-slate-200/80 dark:bg-white/10" />
                        <div className="h-1.5 flex-1 rounded bg-slate-200/60 dark:bg-white/8" />
                      </div>
                    ))}
                  </div>

                  {/* Main content mockup */}
                  <div className="col-span-3 sm:col-span-2 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-4 w-32 rounded-md bg-slate-300/60 dark:bg-white/15" />
                      <div className="h-7 w-20 rounded-xl bg-indigo-500/20 dark:bg-indigo-500/30" />
                    </div>
                    {/* Stat cards row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["indigo", "emerald", "slate"].map((c, i) => (
                        <div key={i} className={`rounded-2xl border p-3 ${
                          c === "indigo" ? "border-indigo-200/60 bg-indigo-50/60 dark:border-indigo-800/30 dark:bg-indigo-950/30" :
                          c === "emerald" ? "border-emerald-200/60 bg-emerald-50/60 dark:border-emerald-800/30 dark:bg-emerald-950/30" :
                          "border-slate-200/60 bg-slate-50 dark:border-white/8 dark:bg-white/5"
                        } ${i === 2 ? "hidden sm:block" : ""}`}>
                          <div className={`h-1.5 w-12 rounded mb-1.5 ${
                            c === "indigo" ? "bg-indigo-200/80" : c === "emerald" ? "bg-emerald-200/80" : "bg-slate-200/80"
                          } dark:bg-white/15`} />
                          <div className={`h-3 w-16 rounded ${
                            c === "indigo" ? "bg-indigo-300/60" : c === "emerald" ? "bg-emerald-300/60" : "bg-slate-300/60"
                          } dark:bg-white/20`} />
                        </div>
                      ))}
                    </div>
                    {/* Table mockup */}
                    <div className="rounded-2xl border border-slate-200/60 dark:border-white/8 overflow-hidden">
                      <div className="bg-slate-50/80 dark:bg-white/5 px-3 py-2 grid grid-cols-4 gap-2">
                        {["Nama", "Jan", "Feb", "Mar"].map((h) => (
                          <div key={h} className="h-2 w-8 rounded bg-slate-300/60 dark:bg-white/15" />
                        ))}
                      </div>
                      {[1, 2, 3].map((r) => (
                        <div key={r} className="px-3 py-2 grid grid-cols-4 gap-2 border-t border-slate-100 dark:border-white/5">
                          <div className="h-2 w-20 rounded bg-slate-200/80 dark:bg-white/10" />
                          <div className="h-5 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40" />
                          <div className="h-5 w-12 rounded-full bg-amber-100 dark:bg-amber-950/40" />
                          <div className="h-5 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS BAR ─── */}
        <section className="border-y border-slate-200/60 dark:border-white/8 bg-white/60 dark:bg-card/40 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map(({ value, label, suffix, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center justify-center gap-1 text-center py-2">
                  <Icon className="size-5 text-slate-400 dark:text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
                    {value}
                    <span className="text-sm font-medium text-slate-400">{suffix}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="fitur" className="relative py-20 sm:py-28 page-gradient">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="text-center max-w-xl mx-auto mb-12">
              <Badge variant="rw" className="mb-4">Fitur Unggulan</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl">
                Semua yang Anda Butuhkan
              </h2>
              <p className="mt-4 text-slate-500 dark:text-muted-foreground">
                Dirancang khusus untuk kebutuhan RW dan Masjid — tidak over-complicated, langsung to-the-point.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc, color }) => {
                const c = colorMap[color];
                return (
                  <div
                    key={title}
                    className={`group relative overflow-hidden rounded-3xl border ${c.border} bg-white dark:bg-card shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 p-6`}
                  >
                    {/* Subtle gradient accent top-right */}
                    <div className={`absolute -top-10 -right-10 size-32 rounded-full ${c.iconBg} blur-2xl opacity-60 transition-opacity group-hover:opacity-100`} />

                    <div className={`relative inline-flex size-11 items-center justify-center rounded-2xl ${c.iconBg} ${c.iconText} mb-4 shadow-sm`}>
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-foreground mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed">
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="cara-kerja" className="py-20 sm:py-28 bg-slate-50/80 dark:bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-14">
              <Badge variant="masjid" className="mb-4">Cara Kerja</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl">
                Mulai dalam 3 Langkah
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3 relative">
              {/* Connector line (desktop only) */}
              <div aria-hidden className="hidden md:block absolute top-12 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px border-t-2 border-dashed border-slate-200 dark:border-white/10" />

              {steps.map(({ num, title, desc, color }) => {
                const c = colorMap[color];
                return (
                  <div key={num} className="relative flex flex-col items-center text-center gap-4">
                    {/* Number circle */}
                    <div className={`relative inline-flex size-16 items-center justify-center rounded-full border-2 ${color === "indigo" ? "border-indigo-200 dark:border-indigo-800/60" : "border-emerald-200 dark:border-emerald-800/60"} ${c.stepBg} shadow-sm z-10`}>
                      <span className={`text-xl font-black ${c.numText}`}>{num}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-foreground mb-2">
                        {title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        {desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── GATEWAY CARDS (CTA) ─── */}
        <section id="masuk" className="relative py-20 sm:py-28 hero-gradient overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/4 size-72 rounded-full bg-indigo-400/8 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 right-1/4 size-72 rounded-full bg-emerald-400/8 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl">
                Akses Dashboard Anda
              </h2>
              <p className="mt-4 text-slate-500 dark:text-muted-foreground">
                Pilih role untuk masuk ke dashboard yang sesuai.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 max-w-3xl mx-auto">
              {/* RW Card */}
              <div className="group relative overflow-hidden rounded-3xl border border-indigo-200/60 dark:border-indigo-800/30 bg-white dark:bg-card shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 p-7 flex flex-col gap-5">
                {/* Top accent bg */}
                <div aria-hidden className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-indigo-500 to-violet-600 rounded-t-3xl" />
                <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-indigo-50 dark:bg-indigo-950/30 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start gap-4 relative">
                  <span className="inline-flex size-13 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30 shrink-0">
                    <Users className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">
                      Dashboard RW
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
                      Kelola iuran warga per blok dan proses pembayaran.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {[
                    "Grid 12 bulan bergaya spreadsheet",
                    "Status jelas per warga",
                    "Aksi bayar yang cepat & aman",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-muted-foreground">
                      <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="rw" size="lg" className="justify-between w-full mt-auto">
                  <Link href="/auth/login?next=%2Fdashboard%2Frw%2Fwarga">
                    Masuk sebagai RW
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              {/* Masjid Card */}
              <div className="group relative overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-800/30 bg-white dark:bg-card shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 p-7 flex flex-col gap-5">
                {/* Top accent bg */}
                <div aria-hidden className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 to-teal-600 rounded-t-3xl" />
                <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-emerald-50 dark:bg-emerald-950/30 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start gap-4 relative">
                  <span className="inline-flex size-13 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30 shrink-0">
                    <HandCoins className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">
                      Dashboard Masjid
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground mt-0.5">
                      Ringkasan zakat, infaq, dan distribusi dana.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {[
                    "Statistik ZIS real-time",
                    "Distribusi formula tetap 62.5% / 8% / 11% / 18.5%",
                    "Mudah dibaca, siap laporan",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600 dark:text-muted-foreground">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="masjid" size="lg" className="justify-between w-full mt-auto">
                  <Link href="/auth/login?next=%2Fdashboard%2Fmasjid">
                    Masuk sebagai Pengurus Masjid
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Sub-CTA links */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-muted-foreground">
              <span>
                Belum punya akun?{" "}
                <Link href="/auth/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  Registrasi sekarang
                </Link>
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-white/20">|</span>
              <span>
                Ingin audit transaksi?{" "}
                <Link href="/transparansi" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Buka Portal Transparansi
                </Link>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200/60 dark:border-white/8 bg-white/60 dark:bg-card/40 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white">
                <Building2 className="size-3.5" />
              </span>
              <span className="font-bold tracking-tight text-slate-900 dark:text-foreground text-sm">
                RWManage
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-muted-foreground text-center">
              Platform manajemen RW & Masjid yang transparan dan modern.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-muted-foreground">
              <Link href="/transparansi" className="hover:text-slate-600 dark:hover:text-foreground transition-colors">
                Transparansi
              </Link>
              <Link href="/auth/login" className="hover:text-slate-600 dark:hover:text-foreground transition-colors">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

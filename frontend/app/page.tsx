import Link from "next/link";
import {
  ArrowRight,
  HandCoins,
  Users,
  ShieldCheck,
  BookOpenText,
  CheckCircle2,
  Globe,
  Sparkles,
  Building2,
  Lock,
  Receipt,
  MapPin,
  ChevronRight,
  Star,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ─── Feature data ─── */
const features = [
  {
    icon: Users,
    title: "Iuran Warga",
    desc: "Grid 12 bulan per blok, rekap otomatis, dan status pembayaran real-time untuk seluruh warga.",
    color: "indigo" as const,
    tag: "RT & RW",
  },
  {
    icon: HandCoins,
    title: "Zakat, Infaq & Shadaqah",
    desc: "Dashboard ZIS masjid lengkap dengan formula distribusi asnaf yang transparan dan akuntabel.",
    color: "emerald" as const,
    tag: "Masjid",
  },
  {
    icon: BookOpenText,
    title: "Buku Kas Digital",
    desc: "Kelola kas masuk & keluar dengan bukti foto, kode unik verifikasi, dan ekspor laporan PDF/Excel.",
    color: "indigo" as const,
    tag: "RW & Masjid",
  },
  {
    icon: ShieldCheck,
    title: "Manajemen Akun",
    desc: "Alur registrasi, approval, dan manajemen pengguna dengan peran multi-level yang aman.",
    color: "emerald" as const,
    tag: "Superadmin",
  },
  {
    icon: Globe,
    title: "Portal Transparansi",
    desc: "Warga dapat memverifikasi kode unik transaksi secara mandiri — tanpa perlu login apapun.",
    color: "indigo" as const,
    tag: "Publik",
  },
  {
    icon: Lock,
    title: "Keamanan Data",
    desc: "Autentikasi JWT berbasis role, rate limiting, enkripsi penuh, dan audit trail otomatis.",
    color: "emerald" as const,
    tag: "Enterprise",
  },
];

const steps = [
  {
    num: "01",
    icon: Users,
    title: "Registrasi & Verifikasi",
    desc: "Daftarkan akun RW atau Pengurus Masjid. Superadmin memverifikasi akun secara digital — proses cepat dan terdokumentasi.",
    color: "indigo" as const,
  },
  {
    num: "02",
    icon: MapPin,
    title: "Setup Wilayah & Warga",
    desc: "Input data blok, wilayah RT, dan data warga. Sistem otomatis generate grid iuran 12 bulan siap pakai.",
    color: "emerald" as const,
  },
  {
    num: "03",
    icon: Receipt,
    title: "Kelola & Transparansi",
    desc: "Setiap transaksi menghasilkan kode unik. Warga bisa verifikasi mandiri kapan saja lewat portal publik.",
    color: "indigo" as const,
  },
];

const stats = [
  { value: "12", label: "Modul Iuran", suffix: " bulan", color: "indigo" },
  { value: "100", label: "Transparansi Data", suffix: "%", color: "emerald" },
  { value: "5", label: "Role Pengguna", suffix: "+", color: "indigo" },
  { value: "0", label: "Biaya Bulanan", suffix: " Rupiah", color: "emerald" },
];

const testimonials = [
  {
    quote: "Rekap iuran 3 blok selesai dalam 5 menit. Warga pun bisa cek sendiri transaksinya.",
    name: "Pak Budi",
    role: "Ketua RW 05, Bandung",
    color: "indigo" as const,
  },
  {
    quote: "Distribusi ZIS sekarang transparan, warga tahu persis berapa yang masuk dan kemana disalurkan.",
    name: "Ust. Rahmat",
    role: "Takmir Masjid Al-Ikhlas",
    color: "emerald" as const,
  },
  {
    quote: "Laporan bulanan tinggal klik export. Tidak perlu lagi rekap manual di Excel.",
    name: "Bu Sari",
    role: "Bendahara RT 02, Jakarta",
    color: "indigo" as const,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-white/8 bg-white/80 dark:bg-card/80 backdrop-blur-xl">
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

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-muted-foreground">
            <a href="#fitur" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">Fitur</a>
            <a href="#cara-kerja" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">Cara Kerja</a>
            <a href="#masuk" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">Dashboard</a>
            <Link href="/transparansi" className="hover:text-slate-900 dark:hover:text-foreground transition-colors">Transparansi</Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/register">Buat Akun</Link>
            </Button>
            <Button asChild variant="rw" size="sm">
              <Link href="/auth/login">
                Masuk
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden hero-gradient">
          {/* Decorative blobs */}
          <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-indigo-400/10 blur-[100px] dark:bg-indigo-600/15" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-40 size-[500px] rounded-full bg-emerald-400/10 blur-[100px] dark:bg-emerald-600/12" />
          <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 size-[300px] rounded-full bg-violet-400/5 blur-[80px]" />

          <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6 sm:pt-32 sm:pb-20 lg:px-8 lg:pt-36 lg:pb-24">
            <div className="flex flex-col items-center text-center gap-7 max-w-4xl mx-auto">

              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 dark:bg-indigo-950/50 dark:border-indigo-700/40 px-4 py-1.5 shadow-sm">
                <Sparkles className="size-3.5 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide">
                  Platform Digital RW & Masjid Indonesia
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-xs text-indigo-500/80 dark:text-indigo-400/70">
                  <Star className="size-3 fill-indigo-400 text-indigo-400" />
                  Gratis
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
                Kelola{" "}
                <span className="text-gradient-rw">Iuran Warga</span>
                <br className="hidden sm:block" />
                {" & "}
                <span className="text-gradient-masjid">ZIS Masjid</span>
                {" "}dengan Mudah
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg lg:text-xl text-slate-500 dark:text-muted-foreground max-w-2xl leading-relaxed">
                Satu platform terintegrasi untuk RW, RT, dan Pengurus Masjid —{" "}
                rekap iuran otomatis, distribusi ZIS transparan, dan verifikasi publik
                tanpa kerumitan administrasi.
              </p>

              {/* CTA group */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Button asChild variant="rw" size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 text-base px-8">
                  <Link href="/auth/register">
                    Mulai Gratis Sekarang
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base">
                  <Link href="/transparansi">
                    <Globe className="size-4" />
                    Cek Transparansi
                  </Link>
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-muted-foreground pt-1">
                {[
                  { icon: CheckCircle2, label: "Gratis selamanya" },
                  { icon: CheckCircle2, label: "Tanpa instalasi" },
                  { icon: CheckCircle2, label: "Data aman & terenkripsi" },
                  { icon: CheckCircle2, label: "Siap pakai dalam menit" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-emerald-500" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero Mockup */}
            <div className="mt-20 mx-auto max-w-5xl animate-fade-in">
              <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-card/90 backdrop-blur-sm shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/8 px-5 py-3.5 bg-slate-50/80 dark:bg-white/5">
                  <div className="flex gap-1.5">
                    <span className="size-3 rounded-full bg-red-400/80" />
                    <span className="size-3 rounded-full bg-amber-400/80" />
                    <span className="size-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="mx-auto flex items-center gap-1.5 w-52 rounded-lg bg-white/70 dark:bg-white/8 border border-slate-200/60 dark:border-white/10 py-1 px-3">
                    <Lock className="size-3 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 dark:text-muted-foreground truncate">rwmanage.app/dashboard</span>
                  </div>
                </div>

                {/* Mockup content */}
                <div className="grid grid-cols-12 gap-0 p-5 sm:p-6 min-h-[240px]">
                  {/* Sidebar */}
                  <div className="col-span-3 hidden sm:flex flex-col gap-2 border-r border-slate-100 dark:border-white/8 pr-5 mr-5">
                    {/* Active item */}
                    <div className="h-9 w-full rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/30 flex items-center px-3 gap-2.5">
                      <div className="size-4 rounded-md bg-indigo-300/60 dark:bg-indigo-500/40" />
                      <div className="h-2 w-16 rounded bg-indigo-200/80 dark:bg-indigo-700/50" />
                    </div>
                    {/* Other items */}
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-full rounded-xl flex items-center px-3 gap-2">
                        <div className="size-3.5 rounded bg-slate-200/70 dark:bg-white/8" />
                        <div className="h-1.5 w-14 rounded bg-slate-200/60 dark:bg-white/8" />
                      </div>
                    ))}
                    <div className="mt-auto h-px bg-slate-100 dark:bg-white/8" />
                    <div className="h-8 w-full rounded-xl flex items-center px-3 gap-2">
                      <div className="size-3.5 rounded bg-slate-200/70 dark:bg-white/8" />
                      <div className="h-1.5 w-10 rounded bg-slate-200/60 dark:bg-white/8" />
                    </div>
                  </div>

                  {/* Main area */}
                  <div className="col-span-12 sm:col-span-9 flex flex-col gap-3">
                    {/* Page title + button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="h-3.5 w-32 rounded-md bg-slate-800/20 dark:bg-white/20" />
                        <div className="h-2 w-20 rounded bg-slate-300/50 dark:bg-white/10" />
                      </div>
                      <div className="h-8 w-24 rounded-xl bg-indigo-500/20 dark:bg-indigo-500/30 border border-indigo-200/50 dark:border-indigo-500/20" />
                    </div>

                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { c: "indigo", w: "18", h: "64" },
                        { c: "emerald", w: "12", h: "48" },
                        { c: "amber", w: "14", h: "20" },
                      ].map(({ c, w, h }) => (
                        <div key={c} className={`rounded-2xl border p-3 ${
                          c === "indigo" ? "border-indigo-200/60 bg-indigo-50/70 dark:border-indigo-800/30 dark:bg-indigo-950/30" :
                          c === "emerald" ? "border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-800/30 dark:bg-emerald-950/30" :
                          "border-amber-200/60 bg-amber-50/70 dark:border-amber-800/30 dark:bg-amber-950/30"
                        }`}>
                          <div className={`h-1.5 w-${w} rounded mb-2 ${
                            c === "indigo" ? "bg-indigo-200/80 dark:bg-indigo-700/40" :
                            c === "emerald" ? "bg-emerald-200/80 dark:bg-emerald-700/40" :
                            "bg-amber-200/80 dark:bg-amber-700/40"
                          }`} />
                          <div className={`h-4 w-${h} rounded ${
                            c === "indigo" ? "bg-indigo-300/60 dark:bg-indigo-600/30" :
                            c === "emerald" ? "bg-emerald-300/60 dark:bg-emerald-600/30" :
                            "bg-amber-300/60 dark:bg-amber-600/30"
                          }`} />
                          <div className="h-1.5 w-8 rounded bg-slate-200/40 dark:bg-white/8 mt-1.5" />
                        </div>
                      ))}
                    </div>

                    {/* Table mockup */}
                    <div className="rounded-2xl border border-slate-200/60 dark:border-white/8 overflow-hidden flex-1">
                      <div className="bg-slate-50/80 dark:bg-white/5 px-4 py-2.5 grid grid-cols-5 gap-3 border-b border-slate-100 dark:border-white/8">
                        {["Nama", "Jan", "Feb", "Mar", "Apr"].map((h) => (
                          <div key={h} className="h-2 w-full rounded bg-slate-300/50 dark:bg-white/12" />
                        ))}
                      </div>
                      {[1, 2, 3, 4].map((r) => (
                        <div key={r} className="px-4 py-2.5 grid grid-cols-5 gap-3 border-t border-slate-100/60 dark:border-white/5 items-center">
                          <div className="h-2 w-16 rounded bg-slate-200/70 dark:bg-white/10" />
                          <div className="h-5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950/50" />
                          <div className="h-5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950/50" />
                          <div className="h-5 w-full rounded-full bg-amber-100 dark:bg-amber-950/50" />
                          <div className="h-5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950/50" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges below mockup */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                {[
                  { label: "Dashboard RW", color: "indigo" },
                  { label: "ZIS Masjid", color: "emerald" },
                  { label: "Portal Publik", color: "indigo" },
                  { label: "Laporan PDF", color: "emerald" },
                ].map(({ label, color }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
                    color === "indigo"
                      ? "border-indigo-200/60 bg-indigo-50/80 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-emerald-200/60 bg-emerald-50/80 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}>
                    <Zap className="size-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS BAR ─── */}
        <section className="border-y border-slate-200/60 dark:border-white/8 bg-white dark:bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {stats.map(({ value, label, suffix, color }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1">
                  <p className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    color === "indigo" ? "text-gradient-rw" : "text-gradient-masjid"
                  }`}>
                    {value}<span className="text-lg font-bold">{suffix}</span>
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="fitur" className="relative py-24 sm:py-32 page-gradient">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="rw" className="mb-4 gap-1.5">
                <Sparkles className="size-3" />
                Fitur Unggulan
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl lg:text-5xl">
                Semua yang Anda Butuhkan
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-500 dark:text-muted-foreground leading-relaxed">
                Dirancang khusus untuk kebutuhan administrasi RT/RW dan Masjid —
                tidak over-complicated, langsung to-the-point.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc, color, tag }) => (
                <div
                  key={title}
                  className={`group relative overflow-hidden rounded-3xl border ${
                    color === "indigo"
                      ? "border-indigo-200/60 dark:border-indigo-800/30 hover:border-indigo-300/80 dark:hover:border-indigo-700/50"
                      : "border-emerald-200/60 dark:border-emerald-800/30 hover:border-emerald-300/80 dark:hover:border-emerald-700/50"
                  } bg-white dark:bg-card shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-6`}
                >
                  {/* Top gradient accent */}
                  <div className={`absolute -top-16 -right-16 size-40 rounded-full blur-3xl opacity-40 transition-opacity duration-300 group-hover:opacity-70 ${
                    color === "indigo" ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"
                  }`} />

                  {/* Tag */}
                  <div className={`relative inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 ${
                    color === "indigo"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  }`}>
                    {tag}
                  </div>

                  {/* Icon */}
                  <div className={`relative inline-flex size-12 items-center justify-center rounded-2xl mb-4 shadow-sm ${
                    color === "indigo"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                  }`}>
                    <Icon className="size-5.5" />
                  </div>

                  <h3 className="relative text-base font-bold tracking-tight text-slate-900 dark:text-foreground mb-2">
                    {title}
                  </h3>
                  <p className="relative text-sm text-slate-500 dark:text-muted-foreground leading-relaxed">
                    {desc}
                  </p>

                  {/* Arrow indicator */}
                  <div className={`absolute bottom-5 right-5 size-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                    color === "indigo"
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400"
                      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400"
                  }`}>
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="cara-kerja" className="py-24 sm:py-32 bg-slate-50 dark:bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="masjid" className="mb-4">Cara Kerja</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl lg:text-5xl">
                Mulai dalam 3 Langkah
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-500 dark:text-muted-foreground leading-relaxed">
                Dari pendaftaran hingga laporan keuangan yang transparan — semuanya bisa dijalankan dalam hitungan menit.
              </p>
            </div>

            <div className="relative grid gap-8 md:grid-cols-3">
              {/* Connector line */}
              <div aria-hidden className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px border-t-2 border-dashed border-slate-200 dark:border-white/10" />

              {steps.map(({ num, icon: Icon, title, desc, color }) => (
                <div key={num} className="relative flex flex-col items-center text-center gap-5">
                  {/* Step badge */}
                  <div className={`relative z-10 flex size-20 items-center justify-center rounded-3xl border-2 shadow-md ${
                    color === "indigo"
                      ? "border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-card shadow-indigo-100 dark:shadow-indigo-950/50"
                      : "border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-card shadow-emerald-100 dark:shadow-emerald-950/50"
                  }`}>
                    <Icon className={`size-8 ${
                      color === "indigo" ? "text-indigo-500" : "text-emerald-500"
                    }`} />
                    <span className={`absolute -top-2.5 -right-2.5 text-[11px] font-black px-2 py-0.5 rounded-full ${
                      color === "indigo"
                        ? "bg-indigo-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}>{num}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground leading-relaxed max-w-xs mx-auto">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 sm:py-32 page-gradient">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-14">
              <Badge variant="rw" className="mb-4">Testimoni</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl">
                Dipercaya Pengurus RT/RW & Masjid
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {testimonials.map(({ quote, name, role, color }) => (
                <div key={name} className={`rounded-3xl border p-6 bg-white dark:bg-card shadow-sm ${
                  color === "indigo"
                    ? "border-indigo-100 dark:border-indigo-900/40"
                    : "border-emerald-100 dark:border-emerald-900/40"
                }`}>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`size-4 fill-current ${
                        color === "indigo" ? "text-indigo-400" : "text-emerald-400"
                      }`} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 italic">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      color === "indigo"
                        ? "bg-linear-to-br from-indigo-500 to-violet-600"
                        : "bg-linear-to-br from-emerald-500 to-teal-600"
                    }`}>
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{name}</p>
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── GATEWAY CARDS (CTA) ─── */}
        <section id="masuk" className="relative py-24 sm:py-32 bg-slate-50 dark:bg-muted/20 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/4 size-72 rounded-full bg-indigo-400/8 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 right-1/4 size-72 rounded-full bg-emerald-400/8 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="rw" className="mb-4">Akses Dashboard</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl lg:text-5xl">
                Pilih Dashboard Anda
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-500 dark:text-muted-foreground">
                Masuk sesuai peran Anda dan mulai kelola administrasi dengan mudah.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 max-w-3xl mx-auto">
              {/* RW Card */}
              <Link
                href="/auth/login?role=RW"
                className="group relative overflow-hidden rounded-3xl border border-indigo-200/60 dark:border-indigo-800/30 bg-white dark:bg-card shadow-md hover:shadow-2xl hover:shadow-indigo-500/12 md:hover:-translate-y-2 transition-all duration-300 p-7 flex flex-col gap-5 text-left active:bg-slate-50 dark:active:bg-slate-800/50"
              >
                <div aria-hidden className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-indigo-500 to-violet-600 rounded-t-3xl" />
                <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-indigo-50 dark:bg-indigo-950/40 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="flex items-start gap-4 relative">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 shrink-0">
                    <Users className="size-7" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">Dashboard RW</h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                      Kelola iuran warga per blok, kas RW, dan laporan warga.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 relative">
                  {[
                    "Grid 12 bulan bergaya spreadsheet",
                    "Status pembayaran real-time per warga",
                    "Ekspor laporan PDF & Excel",
                    "Verifikasi transaksi dengan kode unik",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-muted-foreground">
                      <CheckCircle2 className="size-4 text-indigo-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="inline-flex h-12 w-full items-center justify-between mt-auto gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-violet-600 px-4 text-base font-bold text-white shadow-lg shadow-indigo-500/20 group-hover:from-indigo-600 group-hover:to-violet-700 transition-all duration-200">
                  Masuk sebagai RW
                  <ArrowRight className="size-4" />
                </div>
              </Link>

              {/* Masjid Card */}
              <Link
                href="/auth/login?role=PENGURUS_MASJID"
                className="group relative overflow-hidden rounded-3xl border border-emerald-200/60 dark:border-emerald-800/30 bg-white dark:bg-card shadow-md hover:shadow-2xl hover:shadow-emerald-500/12 md:hover:-translate-y-2 transition-all duration-300 p-7 flex flex-col gap-5 text-left active:bg-slate-50 dark:active:bg-slate-800/50"
              >
                <div aria-hidden className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-emerald-500 to-teal-600 rounded-t-3xl" />
                <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-emerald-50 dark:bg-emerald-950/40 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="flex items-start gap-4 relative">
                  <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 shrink-0">
                    <HandCoins className="size-7" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">Dashboard Masjid</h3>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
                      Ringkasan ZIS, distribusi asnaf, dan kas masjid terpadu.
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5 relative">
                  {[
                    "Statistik penerimaan ZIS real-time",
                    "Distribusi formula tetap 4 asnaf",
                    "Kwitansi digital per transaksi",
                    "Laporan bulanan siap cetak",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-muted-foreground">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="inline-flex h-12 w-full items-center justify-between mt-auto gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 text-base font-bold text-white shadow-lg shadow-emerald-500/20 group-hover:from-emerald-600 group-hover:to-teal-700 transition-all duration-200">
                  Masuk sebagai Pengurus Masjid
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            </div>

            {/* Sub-CTA links */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 dark:text-muted-foreground">
              <span>
                Belum punya akun?{" "}
                <Link href="/auth/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">
                  Registrasi sekarang →
                </Link>
              </span>
              <span className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-white/15" />
              <span>
                Ingin audit transaksi?{" "}
                <Link href="/transparansi" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-2">
                  Buka Portal Transparansi →
                </Link>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200/60 dark:border-white/8 bg-white dark:bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 items-start">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
                  <Building2 className="size-4" />
                </span>
                <span className="font-bold tracking-tight text-slate-900 dark:text-foreground">
                  RWManage
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-muted-foreground max-w-[220px] leading-relaxed">
                Platform manajemen administrasi RT/RW dan Masjid yang transparan, modern, dan gratis.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-2 sm:items-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-muted-foreground mb-1">Navigasi</p>
              {[
                { href: "#fitur", label: "Fitur" },
                { href: "#cara-kerja", label: "Cara Kerja" },
                { href: "/transparansi", label: "Portal Transparansi" },
                { href: "/auth/login", label: "Masuk Dashboard" },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="text-sm text-slate-500 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>

            {/* CTA & tagline */}
            <div className="flex flex-col gap-3 sm:items-end">
              <Button asChild variant="rw" size="sm" className="w-full sm:w-auto">
                <Link href="/auth/register">
                  Mulai Gratis
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <p className="text-xs text-slate-400 dark:text-muted-foreground sm:text-right">
                Tidak perlu kartu kredit. Tidak ada masa trial.
              </p>
            </div>
          </div>

          {/* Divider + copyright */}
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400 dark:text-muted-foreground">
              © {new Date().getFullYear()} RWManage. Dibuat untuk kemajuan administrasi lingkungan Indonesia.
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Data aman & terenkripsi
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

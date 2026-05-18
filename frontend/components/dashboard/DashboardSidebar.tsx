"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

import {
  LayoutDashboard,
  Users,
  HandCoins,
  ShieldCheck,
  BookOpenText,
  Building2,
  SquarePen,
  FileText,
  Link2,
  Wallet,
  LogOut,
  Settings,
  Gift,
  ClipboardList,
  ShieldAlert,
  Receipt,
  BadgeCheck,
  Map,
  CheckSquare,
} from "lucide-react";

type SidebarItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SidebarGroup = {
  groupLabel: string;
  items: SidebarItem[];
};

const settingsItem: SidebarItem = {
  href: "/dashboard/settings",
  label: "Pengaturan",
  description: "Tema, bahasa, dan notifikasi",
  icon: Settings,
};

// ─── RW: Grouped Navigation ─────────────────────────────────────────────────
const rwGroups: SidebarGroup[] = [
  {
    groupLabel: "Menu",
    items: [
      {
        href: "/dashboard/rw",
        label: "Overview RW",
        description: "Pantau tren iuran dan kas",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupLabel: "Manajemen Data",
    items: [
      {
        href: "/dashboard/rw/data-penduduk",
        label: "Data Penduduk",
        description: "Lihat data penduduk di RW",
        icon: Users,
      },
      {
        href: "/dashboard/rw/masjid",
        label: "Data Masjid",
        description: "Kelola data masjid per blok",
        icon: Building2,
      },
      {
        href: "/dashboard/rw/blok-wilayah",
        label: "Data Blok Wilayah",
        description: "Kelola RT dan Blok Wilayah",
        icon: Map,
      },
    ],
  },
  {
    groupLabel: "Manajemen Keuangan",
    items: [
      {
        href: "/dashboard/rw/kas",
        label: "Buku Kas RW",
        description: "Catat uang masuk dan keluar",
        icon: BookOpenText,
      },
      {
        href: "/dashboard/rw/iuran-khusus",
        label: "Iuran Khusus RW",
        description: "Catat pemasukan non-RT",
        icon: Wallet,
      },
      {
        href: "/dashboard/rw/pengaturan-iuran",
        label: "Pengaturan Iuran RT",
        description: "Atur nominal & split iuran",
        icon: Settings,
      },
      {
        href: "/dashboard/rw/monitoring-kas-rt",
        label: "Monitoring Kas RT",
        description: "Pantau saldo kas seluruh RT",
        icon: Receipt,
      },
      {
        href: "/dashboard/rw/konfirmasi-setoran",
        label: "Konfirmasi Setoran",
        description: "Validasi uang masuk dari RT",
        icon: BadgeCheck,
      },
    ],
  },
  {
    groupLabel: "Keamanan & Pengawasan",
    items: [
      {
        href: "/dashboard/rw/ronda",
        label: "Monitoring Ronda",
        description: "Pantau kehadiran petugas ronda",
        icon: ShieldCheck,
      },
      {
        href: "/dashboard/rw/insiden",
        label: "Monitoring Insiden",
        description: "Pantau kejadian keamanan lingkungan",
        icon: ShieldAlert,
      },
    ],
  },
  {
    groupLabel: "Administrasi, Pelaporan & Transparansi",
    items: [


      {
        href: "/dashboard/rw/reports",
        label: "Laporan RW",
        description: "Lihat ringkasan iuran dan kas",
        icon: FileText,
      },
      {
        href: "/dashboard/rw/share-links",
        label: "Share Link RW",
        description: "Kelola link transparansi publik",
        icon: Link2,
      },
      {
        href: "/dashboard/rw/audit-logs",
        label: "Audit Logs",
        description: "Lacak aktivitas pengguna",
        icon: ClipboardList,
      },
    ],
  },
];

// Flat list of all RW items (for roles that use flat nav)
const rwItems: SidebarItem[] = rwGroups.flatMap((g) => g.items);

// ─── Masjid: Grouped Navigation ──────────────────────────────────────────────
const masjidGroups: SidebarGroup[] = [
  {
    groupLabel: "Menu",
    items: [
      {
        href: "/dashboard/masjid",
        label: "Dashboard ZIS",
        description: "Lihat total zakat, infaq, beras",
        icon: HandCoins,
      },
    ],
  },
  {
    groupLabel: "Manajemen ZIS",
    items: [
      {
        href: "/dashboard/masjid/input",
        label: "Catat ZIS Baru",
        description: "Catat transaksi zakat dan infaq",
        icon: SquarePen,
      },
      {
        href: "/dashboard/masjid/distribusi",
        label: "Manajemen Distribusi",
        description: "Kelola distribusi zakat",
        icon: Gift,
      },
    ],
  },
  {
    groupLabel: "Keuangan & Transparansi Masjid",
    items: [
      {
        href: "/dashboard/masjid/kas",
        label: "Buku Kas Masjid",
        description: "Catat kas operasional masjid",
        icon: BookOpenText,
      },
      {
        href: "/dashboard/masjid/reports",
        label: "Laporan Masjid",
        description: "Ringkasan kas dan transaksi ZIS",
        icon: FileText,
      },
      {
        href: "/dashboard/masjid/share-links",
        label: "Share Link Masjid",
        description: "Kelola link transparansi publik",
        icon: Link2,
      },
    ],
  },
];

// Flat list of all Masjid items
const masjidItems: SidebarItem[] = masjidGroups.flatMap((g) => g.items);

// ─── RT: Grouped Navigation ──────────────────────────────────────────────────
const rtGroups: SidebarGroup[] = [
  {
    groupLabel: "Menu",
    items: [
      {
        href: "/dashboard/rt/overview",
        label: "Overview RT",
        description: "Ringkasan warga, iuran, kas, dan setoran",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupLabel: "Manajemen Data",
    items: [
      {
        href: "/dashboard/rt/warga",
        label: "Kelola Warga",
        description: "Create, update, delete warga per blok",
        icon: Users,
      },
    ],
  },
  {
    groupLabel: "Manajemen Keuangan",
    items: [
      {
        href: "/dashboard/rt/manajemen-iuran",
        label: "Manajemen Iuran",
        description: "Kelola tagihan, cicilan, dan histori pembayaran",
        icon: HandCoins,
      },
      {
        href: "/dashboard/rt/kas",
        label: "Buku Kas RT",
        description: "Catat pengeluaran & saldo RT",
        icon: BookOpenText,
      },
      {
        href: "/dashboard/rt/setoran",
        label: "Setoran ke RW",
        description: "Lapor & setor dana iuran ke RW",
        icon: HandCoins,
      },
    ],
  },
  {
    groupLabel: "Keamanan & Pengawasan",
    items: [
      {
        href: "/dashboard/rt/ronda",
        label: "Manajemen Ronda",
        description: "Kelola jadwal dan presensi ronda",
        icon: ShieldCheck,
      },
      {
        href: "/dashboard/rt/insiden",
        label: "Laporan Kejadian",
        description: "Catat insiden keamanan lingkungan",
        icon: ShieldAlert,
      },
      {
        href: "/dashboard/rt/audit-logs",
        label: "Audit Trail",
        description: "Lacak perubahan data oleh pengguna",
        icon: ClipboardList,
      },
    ],
  },
];

// Flat list of all RT items
const rtItems: SidebarItem[] = rtGroups.flatMap((g) => g.items);

// ─── Superadmin ───────────────────────────────────────────────────────────────
const superadminItems: SidebarItem[] = [
  {
    href: "/dashboard/superadmin",
    label: "Overview Superadmin",
    description: "Pantau kesehatan dan statistik sistem",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/superadmin/approvals",
    label: "Persetujuan User",
    description: "Setujui atau tolak pendaftaran",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/rw/audit-logs",
    label: "Audit Logs",
    description: "Lihat jejak aktivitas sistem",
    icon: FileText,
  },
];

type AccentConfig = {
  gradient: string;
  indicator: string;
  iconBg: string;
  iconText: string;
  activeBg: string;
  activeText: string;
  activeIconBg: string;
  roleLabel: string;
  roleBadge: string;
};

const getAccent = (role: AppRole | null): AccentConfig => {
  if (role === "PENGURUS_MASJID") {
    return {
      gradient: "from-emerald-500 to-teal-600",
      indicator: "bg-emerald-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconText: "text-emerald-600 dark:text-emerald-400",
      activeBg: "bg-emerald-50 dark:bg-emerald-950/30",
      activeText: "text-emerald-900 dark:text-emerald-100",
      activeIconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      roleLabel: "Dashboard Masjid",
      roleBadge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
  }

  if (role === "RT") {
    return {
      gradient: "from-cyan-500 to-blue-600",
      indicator: "bg-cyan-500",
      iconBg: "bg-cyan-50 dark:bg-cyan-950/30",
      iconText: "text-cyan-600 dark:text-cyan-400",
      activeBg: "bg-cyan-50 dark:bg-cyan-950/30",
      activeText: "text-cyan-900 dark:text-cyan-100",
      activeIconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      roleLabel: "Dashboard RT",
      roleBadge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    };
  }

  if (role === "SUPERADMIN") {
    return {
      gradient: "from-rose-500 to-pink-600",
      indicator: "bg-rose-500",
      iconBg: "bg-rose-50 dark:bg-rose-950/30",
      iconText: "text-rose-600 dark:text-rose-400",
      activeBg: "bg-rose-50 dark:bg-rose-950/30",
      activeText: "text-rose-900 dark:text-rose-100",
      activeIconBg: "bg-rose-100 dark:bg-rose-900/40",
      roleLabel: "Dashboard Superadmin",
      roleBadge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    };
  }

  return {
    gradient: "from-indigo-500 to-violet-600",
    indicator: "bg-indigo-500",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/30",
    iconText: "text-indigo-600 dark:text-indigo-400",
    activeBg: "bg-indigo-50 dark:bg-indigo-950/30",
    activeText: "text-indigo-900 dark:text-indigo-100",
    activeIconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    roleLabel: "Dashboard RW",
    roleBadge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
};

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({
  item,
  pathname,
  accent,
}: {
  item: SidebarItem;
  pathname: string;
  accent: AccentConfig;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left",
        "transition-all duration-150",
        isActive
          ? cn("shadow-sm", accent.activeBg)
          : "hover:bg-slate-100/70 dark:hover:bg-white/5"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-[20%] h-[60%] w-1 rounded-r-full",
            accent.indicator
          )}
        />
      )}

      {/* Icon */}
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-xl border transition-colors duration-150",
          isActive
            ? cn(accent.activeIconBg, accent.iconText, "border-transparent shadow-sm")
            : "border-slate-200/60 bg-white text-slate-500 dark:border-white/8 dark:bg-white/5 dark:text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>

      {/* Labels */}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-base font-bold",
            isActive ? accent.activeText : "text-slate-700 dark:text-foreground/80"
          )}
        >
          {item.label}
        </span>
        <span className="block truncate text-xs text-slate-400 dark:text-muted-foreground/70">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

// ─── DashboardSidebar ────────────────────────────────────────────────────────
export function DashboardSidebar({ role }: { role: AppRole | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const accent = getAccent(role);

  // Determine whether to use grouped or flat navigation
  const isRW = role !== "PENGURUS_MASJID" && role !== "RT" && role !== "SUPERADMIN";
  const isRT = role === "RT";
  const isMasjid = role === "PENGURUS_MASJID";

  let flatItems: SidebarItem[] = rwItems;
  if (role === "PENGURUS_MASJID") flatItems = masjidItems;
  else if (role === "RT") flatItems = rtItems;
  else if (role === "SUPERADMIN") flatItems = superadminItems;

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-6 md:px-5">
      {/* Brand / Logo area */}
      <div className="flex items-center gap-3 px-1">
        <div
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-2xl",
            "bg-linear-to-br shadow-sm",
            accent.gradient,
            "text-white"
          )}
        >
          <LayoutDashboard className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-foreground">
            RWManage
          </p>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
              accent.roleBadge
            )}
          >
            {accent.roleLabel}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200/70 dark:bg-white/8" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5">
        {isRW ? (
          // ── Grouped navigation for RW role ──
          rwGroups.map((group, gi) => (
            <div key={group.groupLabel} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3")}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-muted-foreground/60">
                {group.groupLabel}
              </p>
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} pathname={pathname} accent={accent} />
              ))}
            </div>
          ))
        ) : isRT ? (
          // ── Grouped navigation for RT role ──
          rtGroups.map((group, gi) => (
            <div key={group.groupLabel} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3")}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-muted-foreground/60">
                {group.groupLabel}
              </p>
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} pathname={pathname} accent={accent} />
              ))}
            </div>
          ))
        ) : isMasjid ? (
          // ── Grouped navigation for Masjid role ──
          masjidGroups.map((group, gi) => (
            <div key={group.groupLabel} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3")}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-muted-foreground/60">
                {group.groupLabel}
              </p>
              {group.items.map((item) => (
                <NavItem key={item.href} item={item} pathname={pathname} accent={accent} />
              ))}
            </div>
          ))
        ) : (
          // ── Flat navigation for Superadmin ──
          <>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-muted-foreground/60">
              Menu
            </p>
            {flatItems.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} accent={accent} />
            ))}
          </>
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="h-px bg-slate-200/70 dark:bg-white/8" />

      {/* Footer utilities */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-muted-foreground dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-xl border border-slate-200/60 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-white/8 dark:bg-white/5 dark:hover:border-rose-800/40 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-colors">
            <LogOut className="size-4" />
          </span>
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
  );
}

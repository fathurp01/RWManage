"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "./DashboardSidebar";
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  role: AppRole | null;
  children: React.ReactNode;
};

export function DashboardShell({ role, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Default collapsed state or close sidebar on navigation in mobile viewport
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, [pathname]);

  return (
    <div className="flex flex-1 flex-row page-gradient min-h-screen relative">
      {/* Sidebar Container */}
      <aside
        className={cn(
          "border-slate-200/60 dark:border-white/8 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:overflow-y-auto md:shrink-0 transition-all duration-300 ease-in-out",
          isCollapsed 
            ? "w-10 md:w-20 border-r sticky top-0 h-screen overflow-y-auto bg-white/80 dark:bg-card/80" 
            : "fixed inset-0 z-40 w-full h-screen overflow-y-auto bg-white dark:bg-card md:bg-white/80 md:dark:bg-card/80 md:sticky md:top-0 md:w-72 md:z-auto md:border-r border-slate-200/60 dark:border-white/8"
        )}
      >
        <DashboardSidebar 
          role={role} 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)} 
        />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-dot-grid absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

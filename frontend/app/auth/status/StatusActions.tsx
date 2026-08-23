"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function StatusActions() {
  const router = useRouter();
  const { logout, isHydrated } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (path: string) => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push(path);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={() => handleLogout("/auth/login")}
        disabled={isLoggingOut || !isHydrated}
        className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Kembali ke Login
      </Button>
      <Button
        onClick={() => handleLogout("/")}
        disabled={isLoggingOut || !isHydrated}
        variant="outline"
        className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Ke Halaman Utama
      </Button>
    </div>
  );
}

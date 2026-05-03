"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, HandCoins } from "lucide-react";

export default function CicilanIuranRwPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RW</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">Monitoring cicilan iuran</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">Cicilan Iuran</h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">
          Fitur operasional cicilan sekarang dikelola dari dashboard RT. RW hanya perlu memantau dampaknya di rekap dan kas.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="size-4 text-slate-500" />
            Dipindahkan ke RT
          </CardTitle>
          <CardDescription>
            Untuk membuat, menandai lunas, atau menghapus cicilan, gunakan menu RT. RW tetap bisa memantau hasil akhirnya dari laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            RW tidak lagi menjadi tempat kerja utama untuk cicilan iuran.
          </p>
          <Link href="/dashboard/rw/reports">
            <Button variant="rw" className="gap-2">
              Lihat Laporan RW
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
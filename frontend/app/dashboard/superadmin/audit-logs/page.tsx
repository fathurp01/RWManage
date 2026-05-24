"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, User, Activity, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  aksi: string;
  entitas: string;
  entitas_id: string | null;
  keterangan: string;
  created_at: string;
  user: {
    nama: string;
    email: string;
    role: string;
  };
}

export default function SuperadminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [activeTab, setActiveTab] = useState<string>("SUPERADMIN");
  const [filterAksi, setFilterAksi] = useState<string>("ALL");
  const [limit, setLimit] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [totalData, setTotalData] = useState<number>(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      let url = `/audit-logs?role=${activeTab}&limit=${limit}&offset=${offset}`;
      
      if (filterAksi !== "ALL") url += `&aksi=${filterAksi}`;

      const response = await api.get(url);
      setLogs(response.data.data);
      if (response.data.pagination) {
        setTotalData(response.data.pagination.total);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memuat audit logs");
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setPage(1);
  }, [activeTab, filterAksi, limit]);

  useEffect(() => {
    fetchLogs();
  }, [activeTab, filterAksi, limit, page]);

  const getActionColor = (aksi: string) => {
    switch (aksi) {
      case "CREATE": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "UPDATE": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "APPROVE": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "REJECT": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "LOGIN": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "LOGOUT": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const totalPages = Math.ceil(totalData / limit) || 1;

  const renderTable = () => (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white dark:bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="w-[180px]">Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead className="max-w-[300px]">Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Memuat data log...</p>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Tidak ada data log yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {log.user?.nama || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">{log.user?.email || "Unknown"}</span>
                      <Badge variant="outline" className="w-fit mt-1 text-[10px] h-4 px-1">{log.user?.role || "Unknown"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(log.aksi)}`}>
                      <Activity className="h-3 w-3 mr-1" />
                      {log.aksi}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{log.entitas}</span>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm truncate" title={log.keterangan}>
                      {log.keterangan}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-card p-4 rounded-xl border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Menampilkan</span>
          <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>data dari total {totalData} data</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Logs Sistem</h2>
          <p className="text-muted-foreground">Pusat riwayat aktivitas dari seluruh sistem.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              Daftar Riwayat Aktivitas
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterAksi} onValueChange={setFilterAksi}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Pilih Aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Aksi</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="APPROVE">APPROVE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto border-b rounded-none bg-transparent p-0 mb-6 h-auto">
              <TabsTrigger value="SUPERADMIN" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">Superadmin</TabsTrigger>
              <TabsTrigger value="RW" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">RW</TabsTrigger>
              <TabsTrigger value="RT" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">RT</TabsTrigger>
              <TabsTrigger value="PENGURUS_MASJID" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary py-3 px-6">Masjid</TabsTrigger>
            </TabsList>

            {/* We use the same renderTable for all tabs since we fetch data based on the active tab */}
            <TabsContent value="SUPERADMIN">{renderTable()}</TabsContent>
            <TabsContent value="RW">{renderTable()}</TabsContent>
            <TabsContent value="RT">{renderTable()}</TabsContent>
            <TabsContent value="PENGURUS_MASJID">{renderTable()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

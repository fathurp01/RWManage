"use client";

import { useEffect, useState } from "react";
import { getApiError } from "@/lib/axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/axios";

interface AnggotaKeluarga {
  id: string;
  nama: string;
  hubungan: string;
  nik?: string;
  tanggal_lahir?: string;
  pendidikan?: string;
  pekerjaan?: string;
}

interface IdentitasWarga {
  id: string;
  tipe_dokumen: string;
  nomor_dokumen?: string;
  tanggal_terbit?: string;
}

interface KepalaKeluarga {
  id: string;
  nama_kk: string;
  blok_wilayah_id: string;
  nama_blok: string;
  no_rt: number;
  anggota_keluarga?: AnggotaKeluarga[];
  identitas?: IdentitasWarga[];
}

interface BlokPenduduk {
  blok_id: string;
  nama_blok: string;
  no_rt: number;
  total_kk: number;
  total_anggota: number;
  warga: KepalaKeluarga[];
}

interface DataPendudukResponse {
  success: boolean;
  data: {
    wilayah_rw?: {
      id: string;
      nama_kompleks: string;
      no_rw: string | number;
    };
    summary?: {
      total_kk: number;
      total_anggota: number;
      total_penduduk: number;
      total_rt: number;
    };
    blok_data?: BlokPenduduk[];
  };
  summary?: {
    total_kk: number;
    total_anggota: number;
    total_penduduk: number;
    total_rt: number;
  };
}

export default function DataPendudukPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KepalaKeluarga[]>([]);
  const [summary, setSummary] = useState<{
    total_kk: number;
    total_anggota: number;
    total_penduduk: number;
    total_rt: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filterBlok, setFilterBlok] = useState("all");
  const [filteredData, setFilteredData] = useState<KepalaKeluarga[]>([]);
  const [blokOptions, setBlokOptions] = useState<{ id: string; nama: string }[]>([]);
  const [expandedKK, setExpandedKK] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get<DataPendudukResponse>("/rw/data-penduduk");
      
      if (response.data.success) {
        const blokData = response.data.data?.blok_data || [];
        const flattened = blokData.flatMap((blok) =>
          (blok.warga || []).map((warga) => ({
            ...warga,
            nama_blok: blok.nama_blok,
            no_rt: blok.no_rt,
          }))
        );

        setData(flattened);
        setSummary(response.data.data?.summary || response.data.summary || null);
        
        // Extract unique blok for filter
        const uniqueBloks = Array.from(
          new Map(
            blokData.map((blok) => [
              blok.blok_id,
              { id: blok.blok_id, nama: blok.nama_blok },
            ])
          ).values()
        );
        setBlokOptions(uniqueBloks);
      }
    } catch (err) {
      const e = getApiError(err);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (kk) =>
          kk.nama_kk.toLowerCase().includes(q) ||
          kk.anggota_keluarga?.some((a) => a.nama.toLowerCase().includes(q)) ||
          kk.anggota_keluarga?.some((a) => a.nik?.includes(q))
      );
    }

    if (filterBlok && filterBlok !== "all") {
      result = result.filter((kk) => kk.blok_wilayah_id === filterBlok);
    }

    setFilteredData(result);
  }, [search, filterBlok, data]);

  const toggleExpand = (kkId: string) => {
    setExpandedKK(expandedKK === kkId ? null : kkId);
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">RW</Badge>
          <span className="text-sm text-slate-500 dark:text-muted-foreground">
            Lihat data penduduk seluruh RT
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
          Data Penduduk
        </h1>
        <p className="text-base text-slate-500 dark:text-muted-foreground">
          Informasi lengkap kepala keluarga, anggota keluarga, dan identitas seluruh penduduk di RW
        </p>
      </header>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.total_kk}</div>
                <div className="text-sm text-slate-500">Total Kepala Keluarga</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.total_penduduk}</div>
                <div className="text-sm text-slate-500">Total Penduduk</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.total_rt}</div>
                <div className="text-sm text-slate-500">Total RT</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Cari nama KK, anggota, atau NIK..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={filterBlok} onValueChange={setFilterBlok}>
              <SelectTrigger>
                <SelectValue placeholder="Filter Blok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Blok</SelectItem>
                {blokOptions.map((blok) => (
                  <SelectItem key={blok.id} value={blok.id}>
                    {blok.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>
            Daftar Penduduk ({filteredData.length}/{data.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="text-sm text-slate-500">Memuat...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-sm text-slate-500">
              {data.length === 0 ? "Belum ada penduduk" : "Tidak ada data yang sesuai filter"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredData.map((kk) => (
                <div
                  key={kk.id}
                  className="border rounded-lg overflow-hidden dark:border-white/8"
                >
                  {/* KK Header */}
                  <button
                    onClick={() => toggleExpand(kk.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{kk.nama_kk}</div>
                      <div className="text-xs text-slate-500">
                        {kk.nama_blok} - RT {kk.no_rt}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {kk.anggota_keluarga?.length || 0} anggota
                    </div>
                    <div className="text-xs ml-2">
                      {expandedKK === kk.id ? "▼" : "▶"}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedKK === kk.id && (
                    <div className="bg-slate-50 dark:bg-white/5 px-4 py-3 space-y-3 border-t dark:border-white/8">
                      {/* Anggota Keluarga */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">
                          Anggota Keluarga ({kk.anggota_keluarga?.length || 0})
                        </h4>
                        {kk.anggota_keluarga && kk.anggota_keluarga.length > 0 ? (
                          <div className="space-y-2">
                            {kk.anggota_keluarga.map((anggota) => (
                              <div
                                key={anggota.id}
                                className="bg-white dark:bg-white/5 rounded p-2 text-sm"
                              >
                                <div className="font-medium">{anggota.nama}</div>
                                <div className="text-xs text-slate-500">
                                  {anggota.hubungan}
                                </div>
                                {anggota.nik && (
                                  <div className="text-xs text-slate-500">
                                    NIK: {anggota.nik}
                                  </div>
                                )}
                                {anggota.tanggal_lahir && (
                                  <div className="text-xs text-slate-500">
                                    Lahir: {anggota.tanggal_lahir}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">Belum ada anggota</div>
                        )}
                      </div>

                      {/* Identitas */}
                      {kk.identitas && kk.identitas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Data Identitas
                          </h4>
                          <div className="space-y-2">
                            {kk.identitas.map((id) => (
                              <div
                                key={id.id}
                                className="bg-white dark:bg-white/5 rounded p-2 text-sm"
                              >
                                <div className="font-medium">{id.tipe_dokumen}</div>
                                {id.nomor_dokumen && (
                                  <div className="text-xs text-slate-500">
                                    Nomor: {id.nomor_dokumen}
                                  </div>
                                )}
                                {id.tanggal_terbit && (
                                  <div className="text-xs text-slate-500">
                                    Terbit: {id.tanggal_terbit}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

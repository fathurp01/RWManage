"use client"

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { identitasWargaClient } from '@/lib/api/identitasWarga'

export default function IdentitasWargaForm({ wargaId, onCreated }: { wargaId: string; onCreated?: (c: any) => void }) {
  const [tipe, setTipe] = useState('KTP')
  const [nomor, setNomor] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const created = await identitasWargaClient.create({ warga_id: wargaId, tipe_dokumen: tipe, nomor_dokumen: nomor || undefined, tanggal_terbit: tanggal || undefined, dokumen: file || undefined })
      onCreated?.(created)
      setNomor('')
      setTanggal('')
      setFile(null)
      setFileName('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat identitas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <Label>Tipe Dokumen</Label>
        <select value={tipe} onChange={(e) => setTipe(e.target.value)} className="w-full h-10 rounded-md">
          <option value="KTP">KTP</option>
          <option value="SIM">SIM</option>
          <option value="PASPOR">PASPOR</option>
        </select>
      </div>
      <div>
        <Label>Nomor Dokumen</Label>
        <Input value={nomor} onChange={(e) => setNomor(e.target.value)} />
      </div>
      <div>
        <Label>Tanggal Terbit</Label>
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </div>
      <div>
        <Label>Upload Dokumen (PDF/IMG)</Label>
        <div className="relative flex items-center h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 px-3.5 py-2 text-sm transition-all duration-200 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] ?? null;
              setFile(selectedFile);
              setFileName(selectedFile ? selectedFile.name : "");
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex items-center gap-2.5 w-full pointer-events-none select-none">
            <span className="font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
              Choose File
            </span>
            <span className="text-slate-300 dark:text-slate-600 font-light">|</span>
            <span className="text-slate-400 dark:text-slate-500 truncate flex-1">
              {fileName || "No file chosen"}
            </span>
          </div>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Tambah'}</Button>
      </div>
    </form>
  )
}

import { api } from '@/lib/axios'

export interface IdentitasWargaRecord {
  id: string
  warga_id: string
  tipe_dokumen: string
  nomor_dokumen?: string | null
  dokumen_url?: string | null
  tanggal_terbit?: string | null
  status_verifikasi?: string | null
}

export interface IdentitasWargaPayload {
  warga_id: string
  tipe_dokumen: string
  nomor_dokumen?: string
  tanggal_terbit?: string
  dokumen?: File
}

export const identitasWargaClient = {
  async list(warga_id: string) {
    const res = await api.get<{ data: IdentitasWargaRecord[] }>(`/rw/identitas-warga`, { params: { warga_id } })
    return res.data.data || []
  },
  async create(payload: IdentitasWargaPayload) {
    const fd = new FormData()
    fd.append('warga_id', payload.warga_id)
    fd.append('tipe_dokumen', payload.tipe_dokumen)
    if (payload.nomor_dokumen) fd.append('nomor_dokumen', payload.nomor_dokumen)
    if (payload.tanggal_terbit) fd.append('tanggal_terbit', payload.tanggal_terbit)
    if (payload.dokumen) fd.append('dokumen', payload.dokumen)

    const res = await api.post<{ data: IdentitasWargaRecord }>(`/rw/identitas-warga`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  async update(id: string, payload: Partial<IdentitasWargaPayload>) {
    const fd = new FormData()
    if (payload.nomor_dokumen) fd.append('nomor_dokumen', payload.nomor_dokumen)
    if (payload.tanggal_terbit) fd.append('tanggal_terbit', payload.tanggal_terbit)
    if (payload.dokumen) fd.append('dokumen', payload.dokumen)
    const res = await api.patch<{ data: IdentitasWargaRecord }>(`/rw/identitas-warga/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
  async remove(id: string) {
    await api.delete(`/rw/identitas-warga/${id}`)
  },
}

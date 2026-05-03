import { test, expect } from '@playwright/test'
import { getSession } from './auth'

test('identitas warga create -> list -> delete (API)', async ({ request }) => {
  const session = await getSession(request)
  const token = session.token

  // get a warga
  const blokRes = await request.get('http://localhost:3000/api/rw/blok-wilayah', { headers: { Authorization: `Bearer ${token}` } })
  const blokJson = await blokRes.json()
  const firstBlok = blokJson?.data?.blok_list?.[0]
  if (!firstBlok) throw new Error('No blok')

  const tahun = new Date().getFullYear()
  const wargaRes = await request.get('http://localhost:3000/api/rw/iuran-warga', { headers: { Authorization: `Bearer ${token}` }, params: { blok_wilayah_id: firstBlok.id, tahun } })
  const wargaJson = await wargaRes.json()
  const firstWarga = wargaJson?.data?.warga?.[0]
  if (!firstWarga) throw new Error('No warga')

  // create identitas via API (no file for simplicity)
  // backend expects ISO datetime for tanggal_terbit
  const payload = { warga_id: firstWarga.id, tipe_dokumen: 'KTP', nomor_dokumen: 'E2E-12345', tanggal_terbit: new Date('2000-01-01').toISOString() }
  const createRes = await request.post('http://localhost:3000/api/rw/identitas-warga', { headers: { Authorization: `Bearer ${token}` }, data: payload })
  const createJson = await createRes.json()
  if (createRes.status() !== 200 && createRes.status() !== 201) throw new Error('Create failed: ' + JSON.stringify(createJson))
  const created = createJson?.data
  if (!created?.id) throw new Error('Create response missing id')

  // list
  const listRes = await request.get('http://localhost:3000/api/rw/identitas-warga', { headers: { Authorization: `Bearer ${token}` }, params: { warga_id: firstWarga.id } })
  const listJson = await listRes.json()
  const found = (listJson?.data ?? []).find((x: any) => x.id === created.id)
  if (!found) throw new Error('Created identitas not found')

  // delete
  const delRes = await request.delete(`http://localhost:3000/api/rw/identitas-warga/${created.id}`, { headers: { Authorization: `Bearer ${token}` } })
  if (delRes.status() !== 200) {
    const txt = await delRes.text()
    throw new Error('Delete failed: ' + delRes.status() + ' ' + txt.slice(0, 200))
  }
})

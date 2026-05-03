import { test, expect } from '@playwright/test'
import { getSession } from './auth'

test.describe('Anggota Keluarga CRUD', () => {
  test.beforeEach(async ({ page, request }) => {
    const session = await getSession(request);
    const token = session.token;
    // Find a warga via API
    const blokRes = await request.get('http://localhost:3000/api/rw/blok-wilayah', { headers: { Authorization: `Bearer ${token}` } });
    const blokJson = await blokRes.json();
    const firstBlok = blokJson?.data?.blok_list?.[0];
    if (!firstBlok) throw new Error('No blok wilayah available in seed');
    const tahun = new Date().getFullYear();
    const wargaRes = await request.get('http://localhost:3000/api/rw/iuran-warga', { headers: { Authorization: `Bearer ${token}` }, params: { blok_wilayah_id: firstBlok.id, tahun } });
    const wargaJson = await wargaRes.json();
    const firstWarga = wargaJson?.data?.warga?.[0];
    if (!firstWarga) throw new Error('No warga found for blok');

    // Set auth in localStorage before page load
    await page.addInitScript((value) => {
      localStorage.setItem('rwmanage_auth', value);
    }, JSON.stringify(session));

    await page.goto(`http://localhost:3001/dashboard/rw/warga/${firstWarga.id}/anggota-keluarga`);
    await page.waitForSelector('text=Anggota Keluarga', { timeout: 10000 });
  })

  test('create -> read -> delete anggota keluarga (API)', async ({ request }) => {
    const session = await getSession(request);
    const token = session.token;

    // Get a warga id
    const blokRes = await request.get('http://localhost:3000/api/rw/blok-wilayah', { headers: { Authorization: `Bearer ${token}` } });
    const blokJson = await blokRes.json();
    const firstBlok = blokJson?.data?.blok_list?.[0];
    if (!firstBlok) throw new Error('No blok wilayah available');
    const tahun = new Date().getFullYear();
    const wargaRes = await request.get('http://localhost:3000/api/rw/iuran-warga', { headers: { Authorization: `Bearer ${token}` }, params: { blok_wilayah_id: firstBlok.id, tahun } });
    const wargaJson = await wargaRes.json();
    const firstWarga = wargaJson?.data?.warga?.[0];
    if (!firstWarga) throw new Error('No warga found');

    // Create anggota keluarga via API
    const payload = { warga_id: firstWarga.id, nama: 'E2E Anggota', hubungan: 'ANAK', tanggal_lahir: new Date('2000-01-01').toISOString() };
    const createRes = await request.post('http://localhost:3000/api/rw/anggota-keluarga', { headers: { Authorization: `Bearer ${token}` }, data: payload });
    const createJson = await createRes.json();
    if (createRes.status() !== 200 && createRes.status() !== 201) throw new Error('Create failed: ' + JSON.stringify(createJson));
    const created = createJson?.data;
    if (!created?.id) throw new Error('Created response missing id');

    // Read list and assert created present
    const listRes = await request.get('http://localhost:3000/api/rw/anggota-keluarga', { headers: { Authorization: `Bearer ${token}` }, params: { warga_id: firstWarga.id } });
    const listJson = await listRes.json();
    const found = (listJson?.data ?? []).find((x: any) => x.id === created.id);
    if (!found) throw new Error('Created anggota not found in list');

    // Delete created
    const delRes = await request.delete(`http://localhost:3000/api/rw/anggota-keluarga/${created.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (delRes.status() !== 200) {
      const txt = await delRes.text();
      throw new Error('Delete failed: ' + delRes.status() + ' ' + txt.slice(0, 200));
    }
  })
})

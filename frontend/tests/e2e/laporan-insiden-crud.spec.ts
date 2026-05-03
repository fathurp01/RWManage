import { test } from '@playwright/test';
import { getSession } from './auth';

test('laporan insiden create -> list -> close -> delete (API)', async ({ request }) => {
  const session = await getSession(request);
  const token = session.token;

  const createRes = await request.post('http://localhost:3000/api/rw/laporan-insiden', {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      tipe_insiden: 'Gangguan Keamanan',
      tanggal_insiden: new Date().toISOString(),
      lokasi: 'Blok A Gate',
      deskripsi: 'Kejadian uji e2e laporan insiden',
      pelapor_nama: 'Petugas E2E',
      pelapor_no_hp: '081234567890',
    },
  });
  const createJson = await createRes.json();
  if (createRes.status() !== 200 && createRes.status() !== 201) throw new Error('Create laporan failed: ' + JSON.stringify(createJson));
  const laporanId = createJson?.data?.id;
  if (!laporanId) throw new Error('Create laporan response missing id');

  const listRes = await request.get('http://localhost:3000/api/rw/laporan-insiden', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  const found = (listJson?.data ?? []).find((x: any) => x.id === laporanId);
  if (!found) throw new Error('Created laporan not found in list');

  const closeRes = await request.patch(`http://localhost:3000/api/rw/laporan-insiden/${laporanId}/close`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (closeRes.status() !== 200) {
    const txt = await closeRes.text();
    throw new Error('Close laporan failed: ' + closeRes.status() + ' ' + txt.slice(0, 200));
  }

  const delRes = await request.delete(`http://localhost:3000/api/rw/laporan-insiden/${laporanId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (delRes.status() !== 200) {
    const txt = await delRes.text();
    throw new Error('Delete laporan failed: ' + delRes.status() + ' ' + txt.slice(0, 200));
  }
});

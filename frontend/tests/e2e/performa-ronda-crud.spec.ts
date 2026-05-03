import { test } from '@playwright/test';
import { getSession } from './auth';

test('performa ronda create -> list -> update -> delete (API)', async ({ request }) => {
  const session = await getSession(request);
  const token = session.token;

  const blokRes = await request.get('http://localhost:3000/api/rw/blok-wilayah', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blokJson = await blokRes.json();
  const firstBlok = blokJson?.data?.blok_list?.[0];
  if (!firstBlok?.id) throw new Error('No blok available');

  const createRes = await request.post('http://localhost:3000/api/rw/performa-ronda', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      blok_wilayah_id: firstBlok.id,
      tanggal: new Date().toISOString(),
      nama_petugas: 'Petugas E2E',
      status_kehadiran: 'HADIR',
      catatan: 'Test performa ronda',
    },
  });
  const createJson = await createRes.json();
  if (createRes.status() !== 200 && createRes.status() !== 201) throw new Error('Create performa failed: ' + JSON.stringify(createJson));
  const performaId = createJson?.data?.id;
  if (!performaId) throw new Error('Create performa response missing id');

  const listRes = await request.get('http://localhost:3000/api/rw/performa-ronda', {
    headers: { Authorization: `Bearer ${token}` },
    params: { blok_wilayah_id: firstBlok.id },
  });
  const listJson = await listRes.json();
  const found = (listJson?.data ?? []).find((x: any) => x.id === performaId);
  if (!found) throw new Error('Created performa not found in list');

  const updateRes = await request.patch(`http://localhost:3000/api/rw/performa-ronda/${performaId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status_kehadiran: 'IZIN', catatan: 'Updated by e2e' },
  });
  if (updateRes.status() !== 200) {
    const txt = await updateRes.text();
    throw new Error('Update performa failed: ' + updateRes.status() + ' ' + txt.slice(0, 200));
  }

  const delRes = await request.delete(`http://localhost:3000/api/rw/performa-ronda/${performaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (delRes.status() !== 200) {
    const txt = await delRes.text();
    throw new Error('Delete performa failed: ' + delRes.status() + ' ' + txt.slice(0, 200));
  }
});

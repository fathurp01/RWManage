import { test } from '@playwright/test';
import { getSession } from './auth';

test('cicilan iuran create -> list -> bayar -> delete (API)', async ({ request }) => {
  const session = await getSession(request);
  const headers = { Cookie: session.cookie, Origin: 'http://localhost:3001' };

  const blokRes = await request.get('http://localhost:3000/api/rw/blok-wilayah', {
    headers,
  });
  const blokJson = await blokRes.json();
  const firstBlok = blokJson?.data?.blok_list?.[0];
  if (!firstBlok?.id) throw new Error('No blok available');

  const tahun = new Date().getFullYear();
  const wargaRes = await request.get('http://localhost:3000/api/rw/iuran-warga', {
    headers,
    params: { blok_wilayah_id: firstBlok.id, tahun },
  });
  const wargaJson = await wargaRes.json();
  const firstWarga = wargaJson?.data?.warga?.[0];
  if (!firstWarga?.id) throw new Error('No warga found');

  const targetIuran = (firstWarga.iuran ?? []).find((item: any) => item?.status === 'BELUM' && item?.id);
  if (!targetIuran?.id) throw new Error('No unpaid iuran available for cicilan');

  const createRes = await request.post('http://localhost:3000/api/rw/cicilan-iuran', {
    headers,
    data: {
      iuran_id: targetIuran.id,
      jumlah_bulan: 2,
      bulan_mulai: 1,
      tahun_mulai: tahun,
    },
  });
  const createJson = await createRes.json();
  if (createRes.status() !== 200 && createRes.status() !== 201) throw new Error('Create cicilan failed: ' + JSON.stringify(createJson));
  const cicilanId = createJson?.data?.id;
  if (!cicilanId) throw new Error('Create cicilan response missing id');

  const listRes = await request.get('http://localhost:3000/api/rw/cicilan-iuran', {
    headers,
    params: { warga_id: firstWarga.id },
  });
  const listJson = await listRes.json();
  const found = (listJson?.data ?? []).find((x: any) => x.id === cicilanId);
  if (!found) throw new Error('Created cicilan not found in list');

  const paidRes = await request.patch(`http://localhost:3000/api/rw/cicilan-iuran/${cicilanId}/bayar`, {
    headers,
  });
  if (paidRes.status() !== 200) {
    const txt = await paidRes.text();
    throw new Error('Mark paid failed: ' + paidRes.status() + ' ' + txt.slice(0, 200));
  }

  const delRes = await request.delete(`http://localhost:3000/api/rw/cicilan-iuran/${cicilanId}`, {
    headers,
  });
  if (delRes.status() !== 200) {
    const txt = await delRes.text();
    throw new Error('Delete cicilan failed: ' + delRes.status() + ' ' + txt.slice(0, 200));
  }
});

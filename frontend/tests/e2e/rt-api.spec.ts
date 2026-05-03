import { test, expect } from '@playwright/test';
import { getSession } from './auth';

test.describe('RT API flows', () => {
  test('RT endpoints respond and support ronda/insiden CRUD', async ({ request, playwright }) => {
    const reqCtx = await playwright.request.newContext();
    const session = await getSession(reqCtx, {
      email: 'rt001@rwmanage.com',
      password: 'rt123',
      healthCheckPath: 'http://localhost:3000/api/rt/iuran',
    });
    await reqCtx.dispose();

    const headers = { Authorization: `Bearer ${session.token}` };

    const smokePaths = ['/api/rt/iuran', '/api/rt/warga', '/api/rt/performa-ronda', '/api/rt/laporan-insiden', '/api/rt/audit-logs'];
    for (const path of smokePaths) {
      const res = await request.get(`http://localhost:3000${path}`, { headers });
      expect(res.status(), `endpoint ${path} returned ${res.status()}`).not.toBe(404);
    }

    const createRondaRes = await request.post('http://localhost:3000/api/rt/performa-ronda', {
      headers,
      data: {
        tanggal: new Date().toISOString(),
        nama_petugas: 'RT E2E',
        status_kehadiran: 'HADIR',
        catatan: 'Created by Playwright',
      },
    });
    const createRondaJson = await createRondaRes.json();
    expect(createRondaRes.status(), JSON.stringify(createRondaJson)).toBeGreaterThanOrEqual(200);
    expect(createRondaRes.status(), JSON.stringify(createRondaJson)).toBeLessThan(300);
    const rondaId = createRondaJson?.data?.id;
    expect(rondaId).toBeTruthy();

    const updateRondaRes = await request.patch(`http://localhost:3000/api/rt/performa-ronda/${rondaId}`, {
      headers,
      data: { catatan: 'Updated by Playwright' },
    });
    expect(updateRondaRes.status()).toBe(200);

    const deleteRondaRes = await request.delete(`http://localhost:3000/api/rt/performa-ronda/${rondaId}`, { headers });
    expect(deleteRondaRes.status()).toBe(200);

    const createInsidenRes = await request.post('http://localhost:3000/api/rt/laporan-insiden', {
      headers,
      multipart: {
        tipe_insiden: 'Gangguan Keamanan',
        tanggal_insiden: new Date().toISOString(),
        lokasi: 'Pos RT',
        deskripsi: 'Laporan insiden RT untuk e2e',
        pelapor_nama: 'RT E2E',
        pelapor_no_hp: '081234567890',
      },
    });
    const createInsidenJson = await createInsidenRes.json();
    expect(createInsidenRes.status(), JSON.stringify(createInsidenJson)).toBeLessThan(300);
    const insidenId = createInsidenJson?.data?.id;
    expect(insidenId).toBeTruthy();

    const deleteInsidenRes = await request.delete(`http://localhost:3000/api/rt/laporan-insiden/${insidenId}`, { headers });
    expect(deleteInsidenRes.status()).toBe(200);

    const auditRes = await request.get('http://localhost:3000/api/rt/audit-logs', { headers });
    expect(auditRes.status()).toBe(200);
  });
});

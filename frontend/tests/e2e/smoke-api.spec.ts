import { test, expect } from '@playwright/test';
import { getSession } from './auth';

test.describe('API smoke tests', () => {
  test('RW API endpoints respond (authorized)', async ({ request, playwright }) => {
    const reqCtx = await playwright.request.newContext();
    const session = await getSession(reqCtx);
    await reqCtx.dispose();

    const headers = { Authorization: `Bearer ${session.token}` };
    const rwPaths = [
      '/api/rw/cicilan-iuran',
      '/api/rw/performa-ronda',
      '/api/rw/laporan-insiden',
    ];

    for (const p of rwPaths) {
      const res = await request.get(`http://localhost:3000${p}`, { headers });
      expect(res.status(), `endpoint ${p} returned ${res.status()}`).not.toBe(404);
    }
  });

  test('Admin API endpoints respond (superadmin)', async ({ request, playwright }) => {
    const reqCtx = await playwright.request.newContext();
    const adminSession = await getSession(reqCtx, {
      email: 'superadmin@rwmanage.com',
      password: 'superadmin123',
      healthCheckPath: 'http://localhost:3000/api/admin/audit-logs',
    });
    await reqCtx.dispose();

    const headers = { Authorization: `Bearer ${adminSession.token}` };
    const adminPaths = ['/api/admin/audit-logs', '/api/admin/dashboard/overview'];
    for (const p of adminPaths) {
      const res = await request.get(`http://localhost:3000${p}`, { headers });
      expect(res.status(), `endpoint ${p} returned ${res.status()}`).not.toBe(404);
    }
  });
});

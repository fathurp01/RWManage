import { test } from '@playwright/test';
import { getSession } from './auth';

test('superadmin dashboard endpoints reachable (API)', async ({ request }) => {
  const session = await getSession(request, {
    email: 'superadmin@rwmanage.com',
    password: 'superadmin123',
    healthCheckPath: 'http://localhost:3000/api/admin/dashboard/overview',
  });
  const token = session.token;

  const overviewRes = await request.get('http://localhost:3000/api/admin/dashboard/overview', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const healthRes = await request.get('http://localhost:3000/api/admin/dashboard/health', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const queueRes = await request.get('http://localhost:3000/api/admin/dashboard/approval-queue', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (overviewRes.status() !== 200) throw new Error('Overview endpoint failed: ' + (await overviewRes.text()).slice(0, 200));
  if (healthRes.status() !== 200) throw new Error('Health endpoint failed: ' + (await healthRes.text()).slice(0, 200));
  if (queueRes.status() !== 200) throw new Error('Approval queue endpoint failed: ' + (await queueRes.text()).slice(0, 200));
});

import { request as playwrightRequest } from '@playwright/test';
import { getSession } from './auth';

export default async function globalSetup() {
  const users = [
    {
      email: 'rw@rwmanage.com',
      password: 'rwmanage123',
      healthCheckPath: 'http://localhost:3000/api/rw/blok-wilayah',
    },
    {
      email: 'rt001@rwmanage.com',
      password: 'rtmanage123',
      healthCheckPath: 'http://localhost:3000/api/rt/iuran',
    },
    {
      email: 'superadmin@rwmanage.com',
      password: 'superadmin123',
      healthCheckPath: 'http://localhost:3000/api/admin/dashboard/overview',
    },
  ];

  for (const user of users) {
    const ctx = await playwrightRequest.newContext();
    try {
      await getSession(ctx, user);
    } finally {
      await ctx.dispose();
    }
  }
}

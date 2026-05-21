import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.resolve(__dirname, '.auth-cache');

const getCachePath = (email: string) => {
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return path.resolve(CACHE_DIR, `${safeName}.json`);
};

type CookieSession = {
  cookie: string;
  authCookieValue: string;
};

export async function getSession(request: any, opts?: { email?: string; password?: string; healthCheckPath?: string }) {
  const email = opts?.email ?? 'rw@rwmanage.com';
  const password = opts?.password ?? 'rwmanage123';
  const healthCheckPath = opts?.healthCheckPath ?? 'http://localhost:3000/api/rw/blok-wilayah';
  const cachePath = getCachePath(email);

  // Try read cache
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    const cached = JSON.parse(raw) as CookieSession;
    if (cached?.cookie && cached?.authCookieValue) {
      // quick health check
      const res = await request.get(healthCheckPath, {
        headers: { Cookie: cached.cookie },
      });
      if (res.status() === 200) return cached;
    }
  } catch (e) {
    // ignore
  }

  // Perform login
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { email, password },
  });
  if (loginRes.status() < 200 || loginRes.status() >= 300) {
    const text = await loginRes.text();
    throw new Error(`Login failed in helper: ${loginRes.status()} ${text.slice(0, 200)}`);
  }

  const state = await request.storageState();
  const cookieHeader = (state?.cookies ?? [])
    .filter((cookie: any) => typeof cookie?.name === 'string' && typeof cookie?.value === 'string')
    .map((cookie: any) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  const authCookie = (state?.cookies ?? []).find((cookie: any) => cookie?.name === 'rwmanage_token');
  const authCookieValue = typeof authCookie?.value === 'string' ? authCookie.value : '';

  if (!cookieHeader.includes('rwmanage_token=') || !authCookieValue) {
    throw new Error('Login failed in helper: auth cookie not found');
  }

  const session: CookieSession = { cookie: cookieHeader, authCookieValue };

  // cache
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(session), 'utf-8');
  } catch (e) {
    // ignore write errors
  }
  return session;
}

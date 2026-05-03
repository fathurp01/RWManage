import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.resolve(__dirname, '.auth-cache');

const getCachePath = (email: string) => {
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return path.resolve(CACHE_DIR, `${safeName}.json`);
};

export async function getSession(request: any, opts?: { email?: string; password?: string; healthCheckPath?: string }) {
  const email = opts?.email ?? 'rw@rwmanage.com';
  const password = opts?.password ?? 'rw123';
  const healthCheckPath = opts?.healthCheckPath ?? 'http://localhost:3000/api/rw/blok-wilayah';
  const cachePath = getCachePath(email);

  // Try read cache
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    const cached = JSON.parse(raw);
    if (cached?.token) {
      // quick health check
      const res = await request.get(healthCheckPath, {
        headers: { Authorization: `Bearer ${cached.token}` },
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
  const json = await loginRes.json();
  const session = json?.data;
  if (!session?.token) throw new Error('Login failed in helper');
  // cache
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(session), 'utf-8');
  } catch (e) {
    // ignore write errors
  }
  return session;
}

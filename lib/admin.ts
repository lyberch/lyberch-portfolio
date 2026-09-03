import fs from 'node:fs/promises';
import path from 'node:path';

export type AdminCredentials = {
  emailHash: string;
  passwordHash: string;
};

function isBcryptHash(value: unknown): value is string {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

/**
 * Environment variables are the source of truth in production (Vercel).
 * The local data/admin.json file is only a fallback for local development.
 */
export async function getAdminCredentials(): Promise<AdminCredentials | null> {
  const envEmail = process.env.ADMIN_EMAIL_HASH?.trim();
  const envPassword = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (envEmail && envPassword) {
    if (!isBcryptHash(envEmail) || !isBcryptHash(envPassword)) return null;
    return { emailHash: envEmail, passwordHash: envPassword };
  }

  const file = path.join(process.cwd(), 'data', 'admin.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const data = JSON.parse(raw);
    if (isBcryptHash(data?.emailHash) && isBcryptHash(data?.passwordHash)) {
      return { emailHash: data.emailHash, passwordHash: data.passwordHash };
    }
  } catch {
    // File auth is intentionally optional; production should use env vars.
  }

  return null;
}

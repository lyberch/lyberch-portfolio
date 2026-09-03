import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const envPath = path.join(root, '.env.local');
const adminPath = path.join(root, 'data', 'admin.json');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

function readExistingEnv() {
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch {
    return '';
  }
}

function setEnvValue(text, key, value) {
  const line = `${key}="${value.replaceAll('"', '\\"')}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

try {
  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const password = await ask('Admin password: ');
  rl.close();

  if (!email || !password) throw new Error('Email and password are required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const emailHash = await bcrypt.hash(email, 12);
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = readExistingEnv();
  const secretMatch = existing.match(/^AUTH_SECRET="?([^"\n]+)"?$/m);
  const secret = secretMatch?.[1]?.trim() || crypto.randomBytes(32).toString('hex');

  let env = existing;
  env = setEnvValue(env, 'ADMIN_EMAIL_HASH', emailHash);
  env = setEnvValue(env, 'ADMIN_PASSWORD_HASH', passwordHash);
  env = setEnvValue(env, 'AUTH_SECRET', secret);
  fs.writeFileSync(envPath, env.endsWith('\n') ? env : `${env}\n`, { encoding: 'utf8', mode: 0o600 });

  fs.mkdirSync(path.dirname(adminPath), { recursive: true });
  fs.writeFileSync(
    adminPath,
    JSON.stringify({ emailHash, passwordHash }, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try { fs.chmodSync(adminPath, 0o600); } catch {}

  console.log('');
  console.log(`Created/updated ${envPath}`);
  console.log(`Created/updated ${adminPath}`);
  console.log('Admin authentication is configured. Restart Next.js before logging in.');
  console.log('For Vercel, copy ADMIN_EMAIL_HASH, ADMIN_PASSWORD_HASH and AUTH_SECRET from .env.local into Project Settings → Environment Variables.');
  console.log('Supabase variables already in .env.local were preserved.');
} catch (error) {
  try { rl.close(); } catch {}
  console.error(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exitCode = 1;
}

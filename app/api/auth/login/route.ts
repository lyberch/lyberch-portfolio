import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getAdminCredentials } from '../../../../lib/admin';

const COOKIE_NAME = 'lyberch-admin';
const SESSION_MS = 8 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; reset: number }>();

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function makeToken() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error('AUTH_SECRET is missing');

  const exp = String(Date.now() + SESSION_MS);
  const signature = crypto.createHmac('sha256', secret).update(exp).digest('hex');
  return `${exp}.${signature}`;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);

  if (current && current.reset > now && current.count >= 5) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  if (!current || current.reset <= now) {
    attempts.set(key, { count: 0, reset: now + 60_000 });
  }

  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const credentials = await getAdminCredentials();
    const secret = process.env.AUTH_SECRET?.trim();

    if (!credentials || !secret) {
      console.error('Admin login is not configured. Set ADMIN_EMAIL_HASH, ADMIN_PASSWORD_HASH and AUTH_SECRET.');
      return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 500 });
    }

    const emailOk = await bcrypt.compare(email, credentials.emailHash);
    const passwordOk = await bcrypt.compare(password, credentials.passwordHash);

    if (!emailOk || !passwordOk) {
      attempts.get(key)!.count += 1;
      return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    attempts.delete(key);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: COOKIE_NAME,
      value: makeToken(),
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MS / 1000,
    });

    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

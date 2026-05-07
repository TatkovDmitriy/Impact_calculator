import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const SESSION_COOKIE = 'auth_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Verify Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase() ?? '';

    // Check email whitelist
    const accessDoc = await adminDb.doc('config/access').get();
    const allowedEmails: string[] = accessDoc.exists
      ? (accessDoc.data()?.allowedEmails ?? []).map((e: string) => e.toLowerCase())
      : [];

    if (!allowedEmails.includes(email)) {
      return NextResponse.json(
        { error: 'access_denied', message: 'Доступ закрыт. Обратитесь к администратору.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true, email });
    response.cookies.set(SESSION_COOKIE, decoded.uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[session] POST error:', error);
    return NextResponse.json({ error: 'auth_failed' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}

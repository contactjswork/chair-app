import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin.chair@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Chair@Admin2026!';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('chair_admin', '1', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('chair_admin', '', { maxAge: 0, path: '/' });
  return response;
}

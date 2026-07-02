import { NextResponse } from 'next/server';

const BETA_PASSWORD = process.env.BETA_PASSWORD ?? 'chair2026';

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== BETA_PASSWORD) {
    return NextResponse.json({ error: 'wrong' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('chair_beta', '1', {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    path: '/',
    sameSite: 'lax',
  });
  return res;
}

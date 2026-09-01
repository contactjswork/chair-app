import { NextResponse } from 'next/server';

// Fail-closed : plus de mot de passe par défaut en dur (l'ancien 'chair2026'
// était committé, donc public). Si BETA_PASSWORD n'est pas défini dans
// l'environnement, le mur bêta refuse tout le monde plutôt que d'accepter un
// secret connu. Audit sécurité 01/09/2026.
const BETA_PASSWORD = process.env.BETA_PASSWORD;

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!BETA_PASSWORD || password !== BETA_PASSWORD) {
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

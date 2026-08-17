import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

/**
 * Pont entre le vrai login admin (Sanctum côté Laravel, voir
 * AdminAuthController::login) et le cookie httpOnly 'chair_admin' que
 * proxy.ts (l'équivalent middleware.ts de cette version de Next) lit pour
 * décider d'autoriser ou non le chargement du shell /admin/*.
 *
 * Ne fait AUCUNE authentification lui-même — il vérifie juste, côté
 * serveur, que le jeton Sanctum fourni est bien celui d'un compte admin
 * actif (en rappelant Laravel), puis pose un cookie marqueur. La vraie
 * frontière de sécurité reste 100% côté Laravel (auth:sanctum + admin.auth
 * + admin.permission sur chaque route) : un visiteur qui poserait ce
 * cookie sans jeton Sanctum valide verrait le shell /admin s'afficher,
 * mais AUCUN appel API n'aboutirait (401 partout). Ce cookie n'est qu'un
 * confort de navigation (éviter de charger le shell pour rien), jamais un
 * mécanisme de permission.
 *
 * Remplace l'ancien flow qui comparait email/mot de passe à
 * ADMIN_EMAIL/ADMIN_PASSWORD (avec des valeurs par défaut en clair dans le
 * code) — plus aucun secret ici.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Jeton manquant' }, { status: 400 });
    }

    const check = await fetch(`${API_URL}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (!check.ok) {
      return NextResponse.json({ error: 'Jeton admin invalide' }, { status: 401 });
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

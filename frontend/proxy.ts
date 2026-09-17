import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Le mur bêta (mot de passe sur tout le site) a été retiré le 17/09/2026 —
// décision Julien à l'approche de la publication des apps : le site est
// public. Ne reste ici que la protection de l'espace admin.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protection admin
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/connexion') && !pathname.startsWith('/api/admin-auth')) {
    const adminCookie = request.cookies.get('chair_admin');
    if (!adminCookie || adminCookie.value !== '1') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/connexion';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

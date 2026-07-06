import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Activer la protection bêta via variable d'env
const BETA_ENABLED = process.env.NEXT_PUBLIC_BETA_ENABLED === 'true';

export function middleware(request: NextRequest) {
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

  if (!BETA_ENABLED) return NextResponse.next();

  // Toujours laisser passer
  if (
    pathname.startsWith('/beta') ||
    pathname.startsWith('/api/beta-auth') ||
    pathname.startsWith('/api/admin-auth') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/mockups') ||
    pathname.startsWith('/onboarding') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Vérifier le cookie
  const betaCookie = request.cookies.get('chair_beta');
  if (betaCookie?.value === '1') return NextResponse.next();

  // Rediriger vers la page de mot de passe
  const url = request.nextUrl.clone();
  url.pathname = '/beta';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

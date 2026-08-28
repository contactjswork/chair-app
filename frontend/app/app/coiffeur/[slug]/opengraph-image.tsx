import { ImageResponse } from 'next/og';

/**
 * Image de partage d'une fiche coiffeur.
 *
 * Partager un profil est le premier canal de croissance d'une app comme
 * CHAIR : « regarde ce coiffeur » envoyé dans une conversation vaut plus que
 * n'importe quelle publicité. Jusqu'ici le partage envoyait la bannière brute
 * du coiffeur — correcte, mais muette : ni son nom, ni sa ville, ni sa note,
 * et rien qui dise d'où vient le lien.
 *
 * Cette carte porte l'essentiel : le visage, le nom, la spécialité, la ville,
 * la note. Elle transforme un lien en argument.
 *
 * Générée à la demande et mise en cache par Next. Si le profil est
 * introuvable ou l'API muette, on renvoie une carte CHAIR neutre plutôt
 * qu'une erreur — un lien partagé ne doit jamais afficher une image cassée.
 */

export const alt = 'Profil coiffeur sur CHAIR';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface Profile {
  name: string;
  city: string | null;
  specialty: string | null;
  rating: string | null;
  reviews: number;
  avatar: string | null;
}

async function getProfile(slug: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API}/hairdressers/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const h = await res.json();
    const count = Number(h.reviews_count ?? 0);
    return {
      name: h.user?.name ?? 'Coiffeur',
      city: h.city ?? null,
      specialty: h.specialties?.[0]?.name ?? null,
      rating: count > 0 ? Number(h.avg_rating).toFixed(1) : null,
      reviews: count,
      // ImageResponse ne sait charger qu'une URL absolue et publique.
      avatar: typeof h.user?.avatar === 'string' && h.user.avatar.startsWith('http') ? h.user.avatar : null,
    };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProfile(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: -1, color: '#ffffff' }}>
          CHAIR
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          {p?.avatar ? (
            // ImageResponse rend du HTML hors navigateur : next/image n'y existe pas.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.avatar}
              alt=""
              width={260}
              height={260}
              style={{ width: 260, height: 260, borderRadius: 130, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 260,
                height: 260,
                borderRadius: 130,
                background: '#1f1f1f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 104,
                fontWeight: 800,
                color: '#555555',
              }}
            >
              {(p?.name ?? 'C').charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 720 }}>
            {p?.specialty && (
              <div style={{ display: 'flex', fontSize: 24, letterSpacing: 5, color: '#8a8a8a', marginBottom: 14 }}>
                {p.specialty.toUpperCase()}
              </div>
            )}
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#ffffff', lineHeight: 1.05 }}>
              {p?.name ?? 'Coiffeur'}
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 22, fontSize: 30, color: '#a5a5a5' }}>
              {p?.city && <div style={{ display: 'flex' }}>{p.city}</div>}
              {p?.rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Étoile en tracé, pas en caractère : la police par défaut
                      de Satori n'a pas le glyphe ★ et rendait un carré vide. */}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
                  </svg>
                  <div style={{ display: 'flex' }}>{p.rating} · {p.reviews} avis</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#6b6b6b' }}>
          Portfolios réels, avis vérifiés — getchair.app
        </div>
      </div>
    ),
    size
  );
}

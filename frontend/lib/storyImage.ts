// ── Story Instagram formatée ─────────────────────────────────────────
//
// Génère une image 1080×1920 aux couleurs de CHAIR à partir d'une
// réalisation : la photo en grand, le nom du coiffeur, la spécialité et
// l'adresse du profil. Le coiffeur la partage en story sans rien mettre
// en page lui-même — chaque story est une pub CHAIR signée par son travail.
//
// Tout se passe côté client (canvas) : aucune dépendance, aucun upload.
// Les images Cloudinary autorisent le cross-origin, indispensable pour
// que le canvas reste exportable (sinon il est « tainted »).

export interface StoryOptions {
  imageUrl: string;
  /** Photo « avant » optionnelle : la story devient un avant/après côte à côte. */
  beforeImageUrl?: string | null;
  name: string;
  city?: string | null;
  specialty?: string | null;
  /** Slug public — affiché comme getchair.app/coiffeur/{slug}. */
  slug?: string | null;
}

const W = 1080;
const H = 1920;

function chargerImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image inaccessible'));
    img.src = url;
  });
}

/** Dessine l'image en cover-crop dans un rectangle arrondi. */
function dessinerCover(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, y: number, w: number, h: number, radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** « CHAIR » espacé à la main — canvas ne connaît pas letter-spacing partout. */
function dessinerWordmark(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number, color: string) {
  ctx.font = `900 ${size}px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  const lettres = 'CHAIR'.split('');
  const espace = size * 0.16;
  const largeur = lettres.reduce((acc, l) => acc + ctx.measureText(l).width, 0) + espace * (lettres.length - 1);
  let x = cx - largeur / 2;
  for (const l of lettres) {
    ctx.fillText(l, x, y);
    x += ctx.measureText(l).width + espace;
  }
}

function etiquette(ctx: CanvasRenderingContext2D, texte: string, cx: number, cy: number) {
  ctx.font = `700 26px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  const l = ctx.measureText(texte).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.roundRect(cx - l / 2 - 22, cy - 26, l + 44, 52, 26);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texte, cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export async function genererStory(opts: StoryOptions): Promise<Blob> {
  const [image, avant] = await Promise.all([
    chargerImage(opts.imageUrl),
    opts.beforeImageUrl ? chargerImage(opts.beforeImageUrl).catch(() => null) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  // Fond : le noir profond CHAIR avec la même lumière du haut que les
  // cartes sombres de l'app (radial 120% 100% at 50% 0%).
  const fond = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 1.1);
  fond.addColorStop(0, '#1f1f21');
  fond.addColorStop(0.62, '#0a0a0a');
  fond.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, W, H);

  // Wordmark en tête.
  ctx.textAlign = 'center';
  dessinerWordmark(ctx, W / 2, 190, 64, '#ffffff');
  ctx.textAlign = 'left';

  // Photo(s) : cadre 920 de large, 1150 de haut, centré.
  const px = 80;
  const py = 300;
  const pw = W - px * 2;
  const ph = 1150;
  if (avant) {
    const demi = (pw - 8) / 2;
    dessinerCover(ctx, avant, px, py, demi, ph, 40);
    dessinerCover(ctx, image, px + demi + 8, py, demi, ph, 40);
    etiquette(ctx, 'AVANT', px + demi / 2, py + ph - 60);
    etiquette(ctx, 'APRÈS', px + demi + 8 + demi / 2, py + ph - 60);
  } else {
    dessinerCover(ctx, image, px, py, pw, ph, 40);
  }

  // Sous la photo : spécialité, nom, ville.
  let y = py + ph + 110;
  ctx.textAlign = 'center';
  if (opts.specialty) {
    ctx.font = `700 30px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(opts.specialty.toUpperCase().split('').join('  '), W / 2, y);
    y += 78;
  }
  ctx.font = `900 72px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.name, W / 2, y, W - 160);
  y += 64;
  if (opts.city) {
    ctx.font = `500 34px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(opts.city, W / 2, y);
    y += 60;
  }

  // Pilule adresse du profil, en pied.
  if (opts.slug) {
    const texte = `getchair.app/coiffeur/${opts.slug}`;
    ctx.font = `700 32px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
    const l = ctx.measureText(texte).width;
    const cy = H - 150;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - l / 2 - 36, cy - 40, l + 72, 80, 40);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, W / 2, cy + 2);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export impossible'))), 'image/png');
  });
}

/**
 * Génère puis partage la story : Web Share API avec fichier quand le
 * navigateur sait faire (iOS le sait — Instagram apparaît dans la feuille),
 * téléchargement du PNG sinon.
 */
export async function partagerStory(opts: StoryOptions): Promise<void> {
  const blob = await genererStory(opts);
  const file = new File([blob], 'chair-story.png', { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // Partage annulé par l'utilisateur : on ne télécharge pas par-dessus.
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chair-story.png';
  a.click();
  URL.revokeObjectURL(url);
}

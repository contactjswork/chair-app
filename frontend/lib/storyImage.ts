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
  // Avance lettre à lettre calculée pour un ancrage GAUCHE — un textAlign
  // 'center' hérité de l'appelant décale chaque lettre d'une demi-largeur
  // (le « CH A IR » du premier essai). On force, puis on restaure.
  const alignAvant = ctx.textAlign;
  ctx.textAlign = 'left';
  const lettres = 'CHAIR'.split('');
  const espace = size * 0.16;
  const largeur = lettres.reduce((acc, l) => acc + ctx.measureText(l).width, 0) + espace * (lettres.length - 1);
  let x = cx - largeur / 2;
  for (const l of lettres) {
    ctx.fillText(l, x, y);
    x += ctx.measureText(l).width + espace;
  }
  ctx.textAlign = alignAvant;
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

// ── Story « créneau libéré » ─────────────────────────────────────────

export interface CreneauStoryOptions {
  /** « Aujourd'hui », « Demain », « mardi 2 septembre »… */
  dateLabel: string;
  /** « 14:00 » */
  timeLabel: string;
  name: string;
  city?: string | null;
  slug?: string | null;
}

/** La story qui remplit un trou d'agenda : gros horaire, lien de résa. */
export async function genererStoryCreneau(opts: CreneauStoryOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  const fond = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 1.1);
  fond.addColorStop(0, '#1f1f21');
  fond.addColorStop(0.62, '#0a0a0a');
  fond.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  dessinerWordmark(ctx, W / 2, 220, 64, '#ffffff');

  // Le message, en haut du tiers central.
  ctx.font = `700 34px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('C R É N E A U   L I B É R É', W / 2, 640);

  ctx.font = `900 120px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.dateLabel, W / 2, 800, W - 140);

  ctx.font = `900 200px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillText(opts.timeLabel, W / 2, 1010);

  // Filet + coiffeur.
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(W / 2 - 40, 1110, 80, 3);
  ctx.font = `900 58px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(opts.name, W / 2, 1230, W - 160);
  if (opts.city) {
    ctx.font = `500 34px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(opts.city, W / 2, 1290);
  }

  ctx.font = `700 36px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Réserve en 2 taps', W / 2, 1440);

  if (opts.slug) {
    const texte = `getchair.app/coiffeur/${opts.slug}`;
    ctx.font = `700 34px -apple-system, 'Helvetica Neue', Arial, sans-serif`;
    const l = ctx.measureText(texte).width;
    const cy = 1560;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - l / 2 - 40, cy - 44, l + 80, 88, 44);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
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
 * Partage un blob déjà généré. À appeler DEPUIS un geste utilisateur
 * (clic) : iOS refuse navigator.share hors activation — c'est exactement
 * le bug de la première version, qui générait l'image PUIS partageait,
 * une fois le geste expiré. D'où StoryShareSheet : génération à
 * l'ouverture, partage au tap suivant, blob déjà prêt.
 */
export async function partagerBlob(blob: Blob): Promise<'partage' | 'telecharge' | 'annule'> {
  const file = new File([blob], 'chair-story.png', { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'partage';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'annule';
      // NotAllowedError ou autre : on retombe sur le téléchargement.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chair-story.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'telecharge';
}

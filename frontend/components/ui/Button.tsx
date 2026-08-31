import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react';
import Link from 'next/link';

// Système de boutons partagé — remplace les dizaines de variantes
// `bg-neutral-900 text-white ... rounded-xl/2xl` ad hoc dispersées dans
// chaque page. Trois niveaux d'emphase (primary/secondary/ghost), une
// taille tactile minimale de 44px de haut sur "md" (la seule utilisée par
// défaut pour une action principale mobile), un état loading intégré au
// lieu de textes "Chargement..." recréés à chaque appel.

type ButtonSize = 'sm' | 'md';

interface Props {
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  /** Rend un <Link> plutôt qu'un <button> — pour une action qui navigue. */
  href?: string;
  target?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

const SIZE_CLS: Record<ButtonSize, string> = {
  // La zone tactile est etendue a 44 px sans changer la hauteur dessinee :
  // 36 px est sous le minimum tactile, mais grossir le bouton changerait
  // l'aspect de toute l'app.
  sm: "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: 'h-[46px] px-5 text-[14px] gap-2 rounded-2xl',
};

const BASE = 'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100';

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ${light ? 'border-white/40 border-t-white' : 'border-neutral-300 border-t-neutral-600'}`}
    />
  );
}

function renderVariant(variantCls: string, spinnerLight: boolean) {
  return function Variant({ size = 'md', loading, fullWidth, icon, className = '', children, disabled, href, target, onClick, type }: Props) {
    const cls = `${BASE} ${SIZE_CLS[size]} ${fullWidth ? 'w-full' : ''} ${variantCls} ${className}`;
    const content = <>{loading ? <Spinner light={spinnerLight} /> : icon}{children}</>;
    if (href) {
      // `onClick` était déclaré dans Props mais silencieusement ignoré dès
      // qu'on passait `href` — un bouton-lien ne pouvait donc pas faire d'effet
      // de bord avant de naviguer (mémoriser une URL de retour, tracer un clic).
      // Aucun appelant existant ne passait les deux : ajout sans impact.
      const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> = target ? { target } : {};
      const anchorClick = onClick as unknown as MouseEventHandler<HTMLAnchorElement> | undefined;
      return <Link href={href} className={cls} onClick={anchorClick} {...anchorProps}>{content}</Link>;
    }
    return (
      <button type={type ?? 'button'} className={cls} disabled={loading || disabled} aria-busy={loading || undefined} onClick={onClick}>
        {content}
      </button>
    );
  };
}

export const PrimaryButton = renderVariant('bg-neutral-900 text-white hover:bg-neutral-800', true);
export const SecondaryButton = renderVariant('bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300', false);
export const GhostButton = renderVariant('bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900', false);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `lg` = 44px, la cible tactile minimale recommandée quand l'icône est une action de premier plan (favori, partage sur une fiche publique). */
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'danger' | 'outline';
  'aria-label': string;
}

const ICON_SIZE_CLS: Record<'sm' | 'md' | 'lg', string> = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-11 h-11' };
const ICON_VARIANT_CLS: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
  filled: 'bg-neutral-900 text-white hover:bg-neutral-800',
  danger: 'bg-red-50 text-red-500 hover:bg-red-100',
  // Contour discret — pour une rangée d'actions secondaires posée sur fond
  // blanc, où un aplat gris ferait autant de bruit visuel que l'action primaire.
  outline: 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
};

export function IconButton({ size = 'md', variant = 'default', className = '', children, ...rest }: IconButtonProps & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-40 ${ICON_SIZE_CLS[size]} ${ICON_VARIANT_CLS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

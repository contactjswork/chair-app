interface IconProps {
  size?: number;
  className?: string;
}

// Glyphes maison, monochromes (stroke=currentColor) — le design system CHAIR
// reste noir/blanc/neutre partout, jamais les couleurs de marque réelles
// (dégradé Instagram, jaune Snapchat...). lucide-react n'a pas de logos de
// marque, donc dessinés à la main dans le même style trait que le reste.

export function InstagramGlyph({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function SnapchatGlyph({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5c2.6 0 4.3 2 4.3 4.6 0 1.1-.1 2-.1 2.7 0 .3.4.6 1 .9.5.2 1.1.3 1.1.8 0 .4-.5.6-1 .8-.4.1-.6.3-.6.5.1.6.9 1.4 2 1.6.3.1.2.4.1.6-.2.4-1 .5-1.7.6-.2 0-.3.1-.4.4-.1.3-.2.7-.5.8-.3.1-.7 0-1.2 0-.6 0-1.3-.1-1.8.2-.5.3-1 .9-1.9.9s-1.4-.6-1.9-.9c-.5-.3-1.2-.2-1.8-.2-.5 0-.9.1-1.2 0-.3-.1-.4-.5-.5-.8-.1-.3-.2-.4-.4-.4-.7-.1-1.5-.2-1.7-.6-.1-.2-.2-.5.1-.6 1.1-.2 1.9-1 2-1.6 0-.2-.2-.4-.6-.5-.5-.2-1-.4-1-.8 0-.5.6-.6 1.1-.8.6-.3 1-.6 1-.9 0-.7-.1-1.6-.1-2.7 0-2.6 1.7-4.6 4.3-4.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

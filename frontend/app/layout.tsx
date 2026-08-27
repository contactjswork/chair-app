import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import CookieBanner from "@/components/ui/CookieBanner";
import AppBanner from "@/components/ui/AppBanner";
import PwaManifest from "@/components/ui/PwaManifest";
import SiteIntro from "@/components/ui/SiteIntro";
import { NATIVE_CLASS_BOOTSTRAP } from "@/lib/native";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// maximumScale: 1 + userScalable: false — choix assumé (Guideline 4.2) : le
// pinch-zoom sur l'UI est un signal "page web" immédiat dans la WebView, qui
// respecte ces directives. Accessibilité : Safari iOS les IGNORE délibérément
// depuis iOS 10 (le zoom reste possible sur le site web), et dans l'app le
// zoom système (Réglages > Accessibilité > Zoom) ainsi que la taille de
// police dynamique restent disponibles. Le site web n'est donc pas dégradé ;
// seule la WebView native est verrouillée, comme une app native l'est.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "CHAIR — La plateforme des coiffeurs professionnels",
  description: "Découvrez les meilleurs coiffeurs près de chez vous. Portfolios, avis certifiés, spécialités.",
  // Web app installable (plein écran, pas un raccourci Safari) — PwaManifest
  // bascule ces valeurs vers CHAIR PRO sur /pro/*.
  manifest: "/manifest-app.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CHAIR",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/chair-touch.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Pose .chair-native sur <html> AVANT le premier paint quand la page
            tourne dans un shell Capacitor (CHAIR ou CHAIR PRO) — voir
            lib/native.ts. globals.css s'appuie sur cette classe pour activer
            le comportement app (sélection, rebond, scrollbars) uniquement en
            natif, sans dégrader le site web. */}
        <script dangerouslySetInnerHTML={{ __html: NATIVE_CLASS_BOOTSTRAP }} />
        {/* Carte Apple : DNS + TLS établis d'avance vers les hôtes MapKit —
            la poignée de main réseau ne s'ajoute plus au temps d'affichage
            de la carte quand l'utilisateur ouvre la recherche. */}
        <link rel="preconnect" href="https://cdn.apple-mapkit.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.apple-mapkit.com/ma" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.apple-mapkit.com" />
      </head>
      <body className="min-h-full bg-white text-neutral-900">
        {/* Rideau d'ouverture du site vitrine — une fois par chargement de
            page. Rendu ici, tout en haut du body, pour couvrir la page dès le
            premier paint. Se retire de lui-même, et ne s'affiche jamais sur
            /app, /pro ni /admin (qui ont leur propre ouverture). */}
        <SiteIntro />
        <PwaManifest />
        <AppBanner />
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}

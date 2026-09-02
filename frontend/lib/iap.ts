// Achat intégré Apple — CHAIR+ acheté DANS le binaire CHAIR PRO iOS.
//
// Règle App Store 3.1.1 : un abonnement numérique vendu dans l'app passe par
// la feuille de paiement Apple, jamais par Stripe Checkout dans la WebView.
// Le web (getchair.app), lui, reste sur Stripe — voir /pro/chair-plus qui
// choisit le tunnel selon le binaire (lib/appContext.ts).
//
// Flux : feuille Apple (plugin @capgo/native-purchases, StoreKit) → reçu
// base64 → POST /iap/verify → le serveur valide chez Apple et ouvre
// l'entitlement dans la table `subscriptions`. Les 30 jours gratuits sont
// l'offre d'essai configurée sur le produit dans App Store Connect.
//
// Import DYNAMIQUE du plugin partout : le code web ne doit pas embarquer le
// pont natif, et surtout un binaire compilé AVANT l'ajout du plugin lève
// « not implemented » — chaque appel gère ce cas au lieu de planter.

import { subscription } from './api';
import { isProBinary, isBusinessBinary } from './appContext';

/**
 * Identifiants EXACTS des produits d'abonnement dans App Store Connect.
 * À garder synchronisés avec APPLE_IAP_PRODUCT_CHAIR_PLUS /
 * APPLE_IAP_PRODUCT_CHAIR_BUSINESS côté backend (config/services.php).
 * Chaque produit porte son offre d'essai « 30 jours gratuits » — configurée
 * dans App Store Connect, pas dans le code.
 */
export const PRODUIT_CHAIR_PLUS = 'app.getchair.pro.chairplus.monthly';
export const PRODUIT_CHAIR_BUSINESS = 'app.getchair.business.chairbusiness.monthly';

async function chargerPlugin() {
  const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
  return { NativePurchases, PURCHASE_TYPE };
}

/**
 * La feuille de paiement Apple est-elle utilisable ici ? Vrai uniquement dans
 * le binaire PRO avec un build qui embarque le plugin. Faux partout ailleurs
 * (web, binaire CLIENT, vieux build sans le module natif) — l'appelant
 * retombe alors sur le message « mets à jour l'app ».
 */
export async function iapDisponible(): Promise<boolean> {
  // PRO vend CHAIR+, BUSINESS vend CHAIR BUSINESS — même feuille Apple.
  if (!isProBinary() && !isBusinessBinary()) return false;
  try {
    const { NativePurchases } = await chargerPlugin();
    const { isBillingSupported } = await NativePurchases.isBillingSupported();
    return isBillingSupported;
  } catch {
    return false;
  }
}

/**
 * Prix localisé du produit tel que l'App Store le vend réellement (devise du
 * storefront de l'utilisateur). Null si indisponible — l'appelant garde alors
 * son libellé de repli.
 */
export async function prixChairPlusApple(): Promise<string | null> {
  return prixProduitApple(PRODUIT_CHAIR_PLUS);
}

export async function prixChairBusinessApple(): Promise<string | null> {
  return prixProduitApple(PRODUIT_CHAIR_BUSINESS);
}

async function prixProduitApple(productIdentifier: string): Promise<string | null> {
  try {
    const { NativePurchases } = await chargerPlugin();
    const { product } = await NativePurchases.getProduct({ productIdentifier });
    // Selon les versions du plugin, le prix formaté s'appelle priceString ou
    // n'existe pas (price numérique + currencyCode) — on prend ce qui existe.
    const p = product as unknown as { priceString?: string; price?: number; currencyCode?: string };
    if (p.priceString) return p.priceString;
    if (typeof p.price === 'number' && p.currencyCode) {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.currencyCode }).format(p.price);
    }
    return null;
  } catch {
    return null;
  }
}

/** L'utilisateur a fermé la feuille Apple sans payer — pas une erreur à afficher. */
export class AchatAnnule extends Error {
  constructor() { super('Achat annulé.'); this.name = 'AchatAnnule'; }
}

function estAnnulation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes('cancel') || msg.includes('annul') || msg.includes('user closed');
}

/**
 * Ouvre la feuille de paiement Apple pour CHAIR+, puis fait valider le reçu
 * par le serveur. Résout quand l'entitlement est ouvert côté CHAIR.
 * Lève AchatAnnule si l'utilisateur referme la feuille sans payer.
 */
export async function acheterChairPlus(): Promise<void> {
  return acheterProduit(PRODUIT_CHAIR_PLUS);
}

export async function acheterChairBusiness(): Promise<void> {
  return acheterProduit(PRODUIT_CHAIR_BUSINESS);
}

async function acheterProduit(productIdentifier: string): Promise<void> {
  const { NativePurchases, PURCHASE_TYPE } = await chargerPlugin();

  let transaction: { receipt?: string };
  try {
    transaction = await NativePurchases.purchaseProduct({
      productIdentifier,
      productType: PURCHASE_TYPE.SUBS,
      quantity: 1,
    });
  } catch (err) {
    if (estAnnulation(err)) throw new AchatAnnule();
    throw err;
  }

  if (!transaction?.receipt) {
    throw new Error("Apple n'a pas fourni de reçu — réessaie, ou utilise « Restaurer mes achats ».");
  }

  await subscription.verifyIap(transaction.receipt);
}

/**
 * « Restaurer mes achats » — obligatoire côté Apple : nouvel iPhone, app
 * réinstallée, ou achat réussi mais validation serveur interrompue. Retourne
 * true si un abonnement CHAIR+ a été retrouvé et revalidé.
 */
export async function restaurerChairPlus(): Promise<boolean> {
  return restaurerProduit(PRODUIT_CHAIR_PLUS);
}

export async function restaurerChairBusiness(): Promise<boolean> {
  return restaurerProduit(PRODUIT_CHAIR_BUSINESS);
}

async function restaurerProduit(productIdentifier: string): Promise<boolean> {
  const { NativePurchases, PURCHASE_TYPE } = await chargerPlugin();

  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });

  const achat = (purchases ?? []).find(
    (p: { productIdentifier?: string; receipt?: string }) =>
      p.productIdentifier === productIdentifier && !!p.receipt,
  );
  if (!achat?.receipt) return false;

  await subscription.verifyIap(achat.receipt);
  return true;
}

/**
 * Ouvre la gestion d'abonnements iOS (annulation, changement) — l'équivalent
 * App Store du Customer Portal Stripe. C'est là, et seulement là, que
 * l'utilisateur annule un abonnement acheté via Apple.
 */
export async function gererAbonnementApple(): Promise<void> {
  const { NativePurchases } = await chargerPlugin();
  await NativePurchases.manageSubscriptions();
}

#!/usr/bin/env python3
"""
CHAIR — Générateur automatique du board Miro stratégique
Crée 17 zones avec frames, stickies, titres et couleurs via l'API Miro v2.

Prérequis:
    pip install requests

Configuration:
    1. miro.com/app/settings/user-profile/apps → créer une app → copier le token
    2. Créer un board Miro vide → copier l'ID depuis l'URL
    3. Renseigner TOKEN et BOARD_ID ci-dessous
    4. python chair_miro.py
"""

import requests
import time
import sys

# ================================================================
# CONFIGURATION — À REMPLIR
# ================================================================
TOKEN    = "VOTRE_ACCESS_TOKEN_ICI"
BOARD_ID = "VOTRE_BOARD_ID_ICI"
# ================================================================

API = "https://api.miro.com/v2"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type":  "application/json",
    "Accept":        "application/json",
}

# Layout
ZW, ZH = 3400, 3000   # dimensions d'une zone
GX, GY = 600,  600    # gaps entre zones

def tl(col, row):
    """Coin supérieur gauche d'une zone."""
    return col * (ZW + GX), row * (ZH + GY)

def post(path, body, retry=True):
    time.sleep(0.25)
    r = requests.post(f"{API}{path}", headers=H, json=body)
    if r.status_code == 429:
        print(" [rate limit — pause 5s]", end="", flush=True)
        time.sleep(5)
        r = requests.post(f"{API}{path}", headers=H, json=body)
    if not r.ok:
        print(f"\n  WARN {r.status_code}: {r.text[:120]}")
        return {}
    return r.json()

# ── Créateurs d'éléments ─────────────────────────────────────────

def frame(title, col, row, bg="#f5f5f5"):
    x, y = tl(col, row)
    cx, cy = x + ZW / 2, y + ZH / 2
    r = post(f"/boards/{BOARD_ID}/frames", {
        "type": "frame", "title": title,
        "style": {"fillColor": bg},
        "position": {"x": cx, "y": cy, "origin": "center"},
        "geometry": {"width": ZW, "height": ZH},
    })
    return r.get("id"), x, y

def shape(fid, html, ax, ay, w, h, bg="#0a0a0a", fg="#ffffff", fs=20, rounded=False):
    post(f"/boards/{BOARD_ID}/shapes", {
        "content": html,
        "style": {
            "fillColor": bg, "fontColor": fg,
            "fontSize": fs, "fontFamily": "opensans",
            "borderColor": "transparent", "borderWidth": 0,
            "textAlign": "center", "textAlignVertical": "middle",
            "shape": "round_rectangle" if rounded else "rectangle",
        },
        "position": {"x": ax, "y": ay, "origin": "center"},
        "geometry": {"width": w, "height": h},
        "parent": {"id": fid},
    })

def txt(fid, html, ax, ay, w=None, fs=15, color="#2a2a2a"):
    post(f"/boards/{BOARD_ID}/texts", {
        "content": f"<p>{html}</p>",
        "style": {"color": color, "fontSize": fs, "fontFamily": "opensans"},
        "position": {"x": ax, "y": ay, "origin": "center"},
        "geometry": {"width": w or ZW - 200},
        "parent": {"id": fid},
    })

def sticky(fid, text, ax, ay, color="light_yellow", w=560):
    post(f"/boards/{BOARD_ID}/sticky_notes", {
        "content": text,
        "style": {"fillColor": color, "textAlign": "left", "textAlignVertical": "top"},
        "position": {"x": ax, "y": ay, "origin": "center"},
        "geometry": {"width": w},
        "parent": {"id": fid},
    })

def header(fid, text, x0, y0, bg="#0a0a0a"):
    shape(fid, f"<p><b>{text}</b></p>", x0 + ZW/2, y0 + 65, ZW - 80, 90, bg=bg, fs=26)

def label(fid, text, ax, ay, bg="#333333", w=320, h=46):
    shape(fid, f"<p><b>{text}</b></p>", ax, ay, w, h, bg=bg, fg="#fff", fs=13, rounded=True)

# ── Colonnes utilitaires ─────────────────────────────────────────
def lx(x0): return x0 + ZW * 0.27
def rx(x0): return x0 + ZW * 0.73
def cx(x0): return x0 + ZW / 2


# ================================================================
# 17 ZONES
# ================================================================

def zone_01(fid, x0, y0):
    """Vision & North Star"""
    # Mission
    label(fid, "MISSION", cx(x0), y0+185, bg="#c0392b", w=200)
    shape(fid, "<p><b>Donner à chaque coiffeur une réputation portable, visible et durable — indépendante du salon où il travaille.</b></p>",
          cx(x0), y0+310, ZW-180, 90, bg="#1a0000", fg="#fff", fs=18)

    # Vision
    label(fid, "VISION", cx(x0), y0+440, bg="#8e44ad", w=180)
    txt(fid, "Le client ne choisit plus un salon. Il choisit un coiffeur. CHAIR devient la première destination coiffure en Europe.",
        cx(x0), y0+530, fs=16, color="#0a0a0a")

    # North Star
    label(fid, "★ NORTH STAR METRIC", cx(x0), y0+650, bg="#c0392b", w=360)
    shape(fid, "<p><b>Coiffeurs Actifs Mensuels</b><br/>≥ 1 réalisation publiée dans les 30 derniers jours<br/>C'est le seul chiffre qui compte vraiment.</p>",
          cx(x0), y0+780, ZW-180, 130, bg="#7b1d1d", fg="#fff", fs=18)

    # Ambitions
    label(fid, "AMBITIONS", cx(x0), y0+940, bg="#2c3e50", w=220)
    items = [
        ("3 ANS", "40 000 profils actifs\nPrésence 20 villes\nARR > 1 M€", lx(x0), "light_blue"),
        ("5 ANS", "Leader coiffure francophone\nBelgique, Suisse, Maroc\n150 000 coiffeurs", rx(x0), "blue"),
        ("10 ANS", "Infrastructure réputation beauté\nLeader européen\n1 M+ professionnels", cx(x0), "dark_blue"),
    ]
    for title, content, ax, color in items:
        sticky(fid, f"{title}\n{content}", ax, y0 + (1090 if ax != cx(x0) else 1340), color, w=580 if ax == cx(x0) else 460)

    # Ce que CHAIR n'est pas
    label(fid, "CE QUE CHAIR N'EST PAS", cx(x0), y0+1600, bg="#7f8c8d", w=360)
    shape(fid, "<p>✗ Un logiciel de caisse&nbsp;&nbsp;&nbsp;✗ Un agenda simple<br/>✗ Un réseau social généraliste&nbsp;&nbsp;&nbsp;✗ Un clone de Planity</p>",
          cx(x0), y0+1720, ZW-200, 80, bg="#2c3e50", fg="#ecf0f1", fs=16)

    # Positionnement
    label(fid, "POSITIONNEMENT", cx(x0), y0+1850, bg="#1a1a2e", w=280)
    shape(fid, "<p><b>Instagram + LinkedIn + Planity</b><br/>= adapté exclusivement au monde de la coiffure</p>",
          cx(x0), y0+1960, ZW-200, 90, bg="#1a1a2e", fg="#ecf0f1", fs=17)


def zone_02(fid, x0, y0):
    """État Actuel — Diagnostic honnête"""
    label(fid, "PRODUIT — CE QUI EXISTE ✓", cx(x0), y0+185, bg="#27ae60", w=400)
    sticky(fid, "✓ Auth complète (inscription/connexion/logout)\n✓ Profils coiffeurs (bio, spécialités, ville, tagline)\n✓ Upload avatar + bannière\n✓ Réalisations avant/après (photos, prix, durée)\n✓ Feed public + Recherche par spécialité + ville\n✓ Suivre / Sauvegarder / Favoris\n✓ Dashboard coiffeur\n✓ API REST 19 endpoints fonctionnels",
           cx(x0), y0+380, "light_green", w=ZW-180)

    label(fid, "CE QUI MANQUE — AVANT LANCEMENT", cx(x0), y0+690, bg="#e67e22", w=480)
    items_miss = [
        ("○ Avis / notation clients\n(fondamental pour la confiance)", "orange", lx(x0)),
        ("○ SEO : metadata dynamiques,\nsitemap, structured data → URGENT", "orange", rx(x0)),
        ("○ Onboarding guidé coiffeur\n(< 5 min pour profil complet)", "yellow", lx(x0)),
        ("○ CGU + Politique RGPD\n+ Entité juridique", "yellow", rx(x0)),
    ]
    for text, color, ax in items_miss:
        sticky(fid, text, ax, y0 + (870 if ax == lx(x0) else 870) + (260 if "CGU" in text or "Onboarding" in text else 0), color, w=560)

    label(fid, "ÉTAT BUSINESS & MARKETING", cx(x0), y0+1470, bg="#c0392b", w=420)
    shape(fid, "<p>Revenus: 0€ &nbsp;·&nbsp; Utilisateurs réels: 0 &nbsp;·&nbsp; Équipe: 1 fondateur<br/>Instagram CHAIR: ✗ &nbsp;·&nbsp; TikTok: ✗ &nbsp;·&nbsp; SEO: ✗<br/>Entité juridique: ✗ &nbsp;·&nbsp; CGU: ✗ &nbsp;·&nbsp; Marque déposée: ✗</p>",
          cx(x0), y0+1600, ZW-180, 130, bg="#2c3e50", fg="#ecf0f1", fs=16)

    label(fid, "⚠️ DIAGNOSTIC FONDATEUR", cx(x0), y0+1800, bg="#7b1d1d", w=360)
    sticky(fid, "Ce qui est bien: stack solide, architecture scalable, décisions techniques bonnes.\n\nCe qui est dangereux:\n→ 0 utilisateur réel. La qualité technique ne compte pas encore.\n→ 0 boucle de feedback. Les priorités dev sont des hypothèses.\n→ Trop de fonctionnalités prévues avant 100 coiffeurs.\n→ Pas d'entité juridique.",
           cx(x0), y0+1980, "light_pink", w=ZW-180)


def zone_03(fid, x0, y0):
    """Thèse de Marché"""
    label(fid, "PROBLÈME COIFFEUR", cx(x0), y0+185, bg="#c0392b", w=340)
    sticky(fid, "Un coiffeur passe 3 ans dans un salon. Il change de salon. Sa clientèle Planity reste à l'adresse. Ses avis Google sont liés au salon. Son Instagram n'est pas professionnel. Il repart à zéro.\n\n→ C'est inacceptable. Et ça arrive à 30-40% des coiffeurs chaque année.",
           cx(x0), y0+330, "light_yellow", w=ZW-180)

    label(fid, "PROBLÈME CLIENT", cx(x0), y0+640, bg="#e67e22", w=300)
    sticky(fid, "Un client cherche \"coiffeur balayage Strasbourg\". Il trouve des salons génériques. Les avis parlent de l'accueil, pas de la technique. Il choisit au hasard. Déçu 1 fois sur 3.\n\n→ Le meilleur coiffeur de sa ville est invisible.",
           cx(x0), y0+790, "yellow", w=ZW-180)

    label(fid, "POURQUOI MAINTENANT", cx(x0), y0+1060, bg="#27ae60", w=320)
    now = [
        ("Post-COVID\n+23% indépendants\ncoiffure 2019-2023", lx(x0)),
        ("Planity aveugle\nSert le salon. Structurellement\nimpossible de pivoter.", rx(x0)),
        ("Creator Economy\nChaque coiffeur a Instagram\nmais pas d'outil pro.", lx(x0)),
        ("SEO vierge\n\"coiffeur [spécialité] [ville]\"\nTerrain libre aujourd'hui.", rx(x0)),
    ]
    for i, (text, ax) in enumerate(now):
        sticky(fid, text, ax, y0 + 1220 + (i // 2) * 280, "light_green", w=520)

    label(fid, "CONTRAINTE STRUCTURELLE CONCURRENTS", cx(x0), y0+1860, bg="#8e44ad", w=520)
    shape(fid, "<p>Planity et Treatwell NE PEUVENT PAS pivoter vers le coiffeur individuel sans trahir leur business model salon. Ce n'est pas une faiblesse temporaire — c'est une contrainte permanente.</p>",
          cx(x0), y0+1990, ZW-180, 110, bg="#4a1942", fg="#f5e6ff", fs=16)

    label(fid, "LE MOAT EN 1 PHRASE", cx(x0), y0+2170, bg="#c0392b", w=340)
    shape(fid, "<p><b>Plus un coiffeur accumule réalisations + abonnés + avis sur CHAIR, plus son capital numérique est impossible à migrer ailleurs. C'est le même moat que LinkedIn.</b></p>",
          cx(x0), y0+2310, ZW-180, 110, bg="#7b1d1d", fg="#fff", fs=16)


def zone_04(fid, x0, y0):
    """Personas"""
    personas = [
        ("COIFFEUR SALARIÉ — cœur de cible V1",
         "Mélanie, 26 ans — salariée, 4 ans exp., 800 abonnés Instagram",
         "Objectif: profil portable\nPeur: repartir à zéro si changement salon\nDéclencheur: un collègue lui montre son profil CHAIR",
         lx(x0), "light_yellow", "#e67e22"),
        ("COIFFEUR INDÉPENDANT — priorité V1.5",
         "Karim, 31 ans — auto-entrepreneur, fauteuil loué 3j/semaine",
         "Objectif: remplir l'agenda\nPeur: manque de clients\nValeur: visibilité + future réservation en ligne",
         rx(x0), "yellow", "#f39c12"),
        ("PATRON DE SALON — monétisation V2",
         "Sylvie, 45 ans — gérante salon 5 coiffeurs, déjà sur Planity",
         "Objectif: attirer + fidéliser l'équipe\nObjection: \"J'ai déjà Planity\"\nRéponse: CHAIR = réputation ≠ agenda. Complémentaire.",
         lx(x0), "orange", "#e67e22"),
        ("CLIENT FINAL — objectif trafic SEO",
         "Léa, 29 ans — cherche spécialiste boucles à Lyon",
         "Déclencheur: SEO Google\nValeur: trouver par spécialité + voir vrai travail + vrais avis",
         rx(x0), "light_blue", "#2980b9"),
    ]
    y_positions = [y0+220, y0+220, y0+900, y0+900]
    for i, ((title, profil, value, ax, color, hbg), yp) in enumerate(zip(personas, y_positions)):
        shape(fid, f"<p><b>{title}</b></p>", ax, yp, 580, 70, bg=hbg, fs=14)
        sticky(fid, profil, ax, yp+200, color, w=580)
        sticky(fid, value,  ax, yp+430, color, w=580)

    label(fid, "BONUS — APPRENTI CFA (levier acquisition sous-estimé)", cx(x0), y0+1620, bg="#8e44ad", w=580)
    sticky(fid, "Théo, 18 ans — en BP coiffure. Construit son portfolio depuis le jour 1. Trouve un employeur via CHAIR.\n\nLevier: partenariat CFA = 10 000 apprentis/an qui s'inscrivent avec leur école.", cx(x0), y0+1780, "violet", w=ZW-180)


def zone_05(fid, x0, y0):
    """Business Model"""
    label(fid, "4 MOTEURS DE REVENUS", cx(x0), y0+185, bg="#c0392b", w=380)
    moteurs = [
        ("MOTEUR 1\nAbonnements Pro/Business", "Récurrent, prévisible\nBase de coiffeurs actifs", "light_yellow", lx(x0)),
        ("MOTEUR 2\nPages Salons 49€/mois", "B2B, volume\nPatrons de salon", "yellow", rx(x0)),
        ("MOTEUR 3\nCHAIR Rent (V3)", "Commission 15%\nMarketplace fauteuils", "orange", lx(x0)),
        ("MOTEUR 4\nCHAIR Brands (V4)", "B2B2B — données\nMarques pro (L'Oréal…)", "light_pink", rx(x0)),
    ]
    for text, desc, color, ax in moteurs:
        sticky(fid, f"{text}\n{desc}", ax, y0+380, color, w=520)

    label(fid, "MVP (maintenant) — Revenus: 0€", cx(x0), y0+680, bg="#7f8c8d", w=420)
    txt(fid, "Objectif unique: <b>500 coiffeurs actifs.</b> Monétiser avant = tuer la croissance avant qu'elle commence. Coût mensuel total: &lt; 20€.", cx(x0), y0+770, fs=15)

    label(fid, "V1 (M6-M18) — Trigger: 500 coiffeurs", cx(x0), y0+880, bg="#2980b9", w=480)
    shape(fid, "<p>9€/mois Pro<br/>M6: 25 Pro → 225€ MRR&nbsp;&nbsp;&nbsp;M12: 160 Pro → 1 440€ MRR&nbsp;&nbsp;&nbsp;M18: 500 Pro → 4 500€ MRR</p>",
          cx(x0), y0+1010, ZW-180, 110, bg="#1a3a5a", fg="#ecf0f1", fs=16)

    label(fid, "V2 (M18-M36) — +Pages Salons", cx(x0), y0+1180, bg="#16a085", w=420)
    shape(fid, "<p>M24: 1500 Pro + 200 Salons → 23 300€ MRR<br/>M36: 5000 Pro + 800 Salons → 84 200€ MRR → ARR ~1 M€ → levée de fonds</p>",
          cx(x0), y0+1310, ZW-180, 110, bg="#1a3a30", fg="#ecf0f1", fs=16)

    label(fid, "V3 (M36-M60)", cx(x0), y0+1480, bg="#8e44ad", w=280)
    shape(fid, "<p>Abonnements Pro + Salons + Rent + Brands → ARR ~4,7 M€</p>",
          cx(x0), y0+1580, ZW-180, 80, bg="#4a1942", fg="#fff", fs=16)

    label(fid, "⚠️ HYPOTHÈSES À VALIDER", cx(x0), y0+1730, bg="#c0392b", w=380)
    sticky(fid, "H1: Un coiffeur paie 9€/mois pour de la visibilité → NON PROUVÉ\nH2: Taux conversion free→Pro = 10% → À TESTER (LinkedIn=25%, Spotify=27%)\nH3: La réservation déclenche l'upgrade Pro → HYPOTHÈSE FORTE\nH4: 1 salon = 3-6 coiffeurs activés → À TESTER",
           cx(x0), y0+1900, "light_pink", w=ZW-180)


def zone_06(fid, x0, y0):
    """Offres & Tarification"""
    label(fid, "ARCHITECTURE DES OFFRES", cx(x0), y0+185, bg="#2c3e50", w=380)
    offres = [
        ("FREE — Gratuit à vie",
         "Profil complet · Portfolio illimité · Abonnés + Avis · Page publique indexée Google · Recherche",
         "#27ae60", y0+310),
        ("PRO — 9€/mois ou 79€/an",
         "Badge CHAIR Pro · Position boostée recherche · Statistiques (vues, clics, croissance) · Réservation V2\n\nLogique: \"Moins de 2 cafés par mois pour exister pro en ligne.\"",
         "#2980b9", y0+530),
        ("BUSINESS — 29€/mois ou 249€/an",
         "Tout Pro + Agenda en ligne + Gestion prestations/tarifs + Rappels automatiques + CRM simplifié\n\nLogique: \"Le prix d'une coupe homme pour tous les outils pro.\"",
         "#8e44ad", y0+820),
        ("SALON — 49€/mois ou 399€/an",
         "Page salon complète (équipe, galerie) · Rattacher les coiffeurs · Mise en avant recherche · Offres emploi V2\n\nLogique: \"1 nouveau client par mois suffit à rentabiliser.\"",
         "#c0392b", y0+1110),
    ]
    for title, content, bg, ay in offres:
        shape(fid, f"<p><b>{title}</b></p>", cx(x0), ay, ZW-160, 70, bg=bg, fs=20)
        sticky(fid, content, cx(x0), ay+190, "light_yellow", w=ZW-200)

    label(fid, "CHAIR CERTIFICATION — one-shot", cx(x0), y0+1470, bg="#e67e22", w=460)
    sticky(fid, "49€ one-shot + 19€/an renouvellement. Vérification diplôme + expérience. Badge 'CHAIR Certifié'. Signal de confiance fort pour les clients. Différenciation premium à faible coût d'opération.", cx(x0), y0+1610, "orange", w=ZW-180)

    label(fid, "POURQUOI GRATUIT À VIE EST LA BONNE DÉCISION", cx(x0), y0+1860, bg="#1a3a1a", w=560)
    txt(fid, "Un coiffeur avec un profil gratuit complet = page SEO = trafic clients = valeur pour CHAIR. Ne jamais faire payer le profil de base, c'est la promesse fondatrice et le moteur de croissance organique.", cx(x0), y0+1970, fs=15)


def zone_07(fid, x0, y0):
    """Acquisition Coiffeurs"""
    label(fid, "LA VÉRITÉ SUR L'ACQUISITION", cx(x0), y0+185, bg="#c0392b", w=420)
    shape(fid, "<p>Le coiffeur ne cherche pas une plateforme. Il subit. La seule façon: <b>montrer une valeur immédiate visible par ses pairs.</b></p>",
          cx(x0), y0+305, ZW-180, 90, bg="#3d0000", fg="#fff", fs=16)

    phases = [
        ("0 → 100 COIFFEURS — Terrain Alsace (M1-M3)",
         "→ Identifier 20 meilleurs comptes Instagram alsaciens (>2000 abonnés)\n→ DM personnalisé: \"J'ai créé un profil CHAIR pour toi. Tu peux le revendiquer gratuitement.\"\n→ Statut Fondateur: 100 premiers = Pro gratuit à vie + badge Membre Fondateur\n→ 2 salons/jour physiquement — créer le profil devant eux en 5 min, tablet en main\n→ Partenariat CFA coiffure Strasbourg\n→ Événement lancement (30-50 coiffeurs, photos portfolio offertes)",
         "#c0392b", "light_pink", y0+500),
        ("100 → 1000 COIFFEURS — Grand Est (M3-M9)",
         "→ Programme Ambassadeur: 1 coiffeur recruté = 1 mois Pro offert\n→ Partenariat distributeurs pro (Kérastase, Wella, Schwarzkopf) — ils influencent des centaines de coiffeurs\n→ Instagram CHAIR quotidien: le coiffeur est mis en avant, il partage, son audience découvre CHAIR\n→ Présence salons pro (Beauté Sélection, MakeUp in Paris)",
         "#e67e22", "orange", y0+1050),
        ("1000 → 10000 COIFFEURS — National (M9+)",
         "→ SEO: chaque profil bien rempli = landing page. À 1000 profils, trafic organique commence\n→ Publicité Meta ciblée coiffeurs\n→ Partenariat UNEC + CNEC (fédérations nationales)\n→ Acquisition salons: 1 salon = 3 à 6 coiffeurs activés en cascade",
         "#27ae60", "light_green", y0+1550),
    ]
    for title, content, hbg, color, ay in phases:
        shape(fid, f"<p><b>{title}</b></p>", cx(x0), ay, ZW-160, 70, bg=hbg, fs=16)
        sticky(fid, content, cx(x0), ay+240, color, w=ZW-180)

    label(fid, "FUNNEL COIFFEUR — KPI CRITIQUE: ACTIVATION", cx(x0), y0+2160, bg="#2c3e50", w=560)
    shape(fid, "<p>Découverte → Inscription → <b>1ère réalisation &lt;24h (KPI #1)</b> → Rétention → Conversion Pro → Ambassadeur<br/>Si taux d'activation &lt; 50%: l'onboarding est cassé avant la croissance.</p>",
          cx(x0), y0+2300, ZW-180, 110, bg="#1a2a4a", fg="#ecf0f1", fs=15)


def zone_08(fid, x0, y0):
    """Acquisition Clients"""
    label(fid, "PRINCIPE: NE PAS CHERCHER LES CLIENTS", cx(x0), y0+185, bg="#27ae60", w=520)
    shape(fid, "<p><b>SEO passif + réseau des coiffeurs = acquisition organique sans budget.</b> CHAIR ne peut pas construire une app de découverte ET une app coiffeurs en même temps.</p>",
          cx(x0), y0+310, ZW-180, 100, bg="#1a3a20", fg="#ecf0f1", fs=16)

    pillars = [
        ("SEO — La machine silencieuse",
         "Chaque profil = landing page Google\n\"coiffeur balayage [ville]\"\n\"spécialiste boucles [ville]\"\n\"barber [ville]\"\n\nÀ 1000 profils = 1000 pages SEO ciblées\nCes requêtes = intention maximale\nRésultats actuels: pauvres → terrain libre",
         "light_green", lx(x0), y0+560),
        ("Instagram CHAIR",
         "Republier les meilleures réalisations avec accord\nTag du coiffeur → il partage → son audience voit CHAIR\n1 post/jour · 3-5 stories/jour\nAudience = clients en recherche d'inspiration",
         "light_blue", rx(x0), y0+560),
        ("TikTok — Le vrai levier viral",
         "Transformation avant/après = contenu TikTok natif\n\"Ce coiffeur dans [ville] fait les meilleures [spécialité]\"\nLink in bio → profil CHAIR\n1 vidéo/jour (contenu coiffeurs avec accord)",
         "violet", lx(x0), y0+1100),
        ("Réseau coiffeurs → clients",
         "Chaque coiffeur partage son profil CHAIR à ses clients\nCarte de visite numérique naturelle\nEffet multiplicateur sans coût marginal\nC'est le canal le plus sous-estimé",
         "yellow", rx(x0), y0+1100),
    ]
    for title, content, color, ax, ay in pillars:
        shape(fid, f"<p><b>{title}</b></p>", ax, ay-60, 620, 65, bg="#2c3e50", fs=14)
        sticky(fid, content, ax, ay+130, color, w=620)

    label(fid, "COURBE D'ACQUISITION CLIENTS (réaliste)", cx(x0), y0+1720, bg="#2c3e50", w=520)
    shape(fid, "<p>M0-M6: &lt;500 visiteurs/mois (direct + bouche à oreille coiffeurs)<br/>M6-M12: 5 000-15 000 (SEO + Instagram)<br/>M12-M24: 50 000-150 000 (SEO fort + TikTok)<br/>M24+: 500 000+ (SEO dominant + viralité)</p>",
          cx(x0), y0+1870, ZW-180, 140, bg="#1a2a4a", fg="#ecf0f1", fs=15)

    label(fid, "ACTIONS SEO PRODUIT — PRIORITÉ #1", cx(x0), y0+2090, bg="#c0392b", w=460)
    sticky(fid, "1. generateMetadata dynamique sur chaque profil (/coiffeur/slug)\n2. Sitemap dynamique (toutes les pages profil)\n3. Structured data schema.org (Person + LocalBusiness)\n4. URLs propres: chair.fr/coiffeur/sophie-martin", cx(x0), y0+2250, "light_pink", w=ZW-180)


def zone_09(fid, x0, y0):
    """Plan de Communication"""
    label(fid, "POSITIONNEMENT ÉDITORIAL", cx(x0), y0+185, bg="#8e44ad", w=380)
    shape(fid, "<p><b>Ton:</b> Sobre · Direct · Inspirant · Jamais corporate<br/><b>Visuel:</b> Noir/blanc dominant · Qualité photo · 0 emoji · 0 couleur criarde<br/><b>Voix:</b> \"Nous croyons que le talent mérite d'être vu.\"</p>",
          cx(x0), y0+310, ZW-180, 110, bg="#2a0a3a", fg="#f5e6ff", fs=15)

    canaux = [
        ("INSTAGRAM @chair.app",
         "Objectif: référence visuelle coiffure pro\n\n4x/sem: Transformation avant/après des coiffeurs CHAIR\n2x/sem: Portrait coiffeur (parcours, technique)\n1x/sem: Inspiration technique (balayage, boucles...)\n1x/sem: Coulisses CHAIR\n\nStories quotidiennes: sondages, repost coiffeurs",
         "light_blue", lx(x0), y0+620),
        ("TIKTOK @chair.app",
         "Objectif: viralité + jeunes coiffeurs\n\n→ Transformations avant/après vidéo\n→ \"Coiffeur de la semaine dans [ville]\"\n→ POV client qui trouve son coiffeur via CHAIR\n→ Réponses questions beauté avec expert CHAIR\n\n1 vidéo/jour (contenu des coiffeurs avec accord)",
         "violet", rx(x0), y0+620),
        ("LINKEDIN — Page CHAIR",
         "Objectif: crédibilité investisseurs + B2B salons\n\n→ Vision & milestones produit\n→ Articles fondateurs sur le marché coiffure\n→ Données tendances (anonymisées)\n→ Offres d'emploi CHAIR\n\n2-3 posts/semaine",
         "blue", lx(x0), y0+1260),
        ("EMAIL — Onboarding coiffeur",
         "7 emails sur 14 jours:\nJ0: Bienvenue + \"publie ta 1ère réalisation ce soir\"\nJ1: Profil vide → 3 min pour compléter\nJ3: Tips photographier ses réalisations\nJ7: Combien de fois ton profil a été vu\nJ10: Ces coiffeurs près de toi ont 10x plus de vues\nJ14: Invitation Pro si actif",
         "light_green", rx(x0), y0+1260),
    ]
    for title, content, color, ax, ay in canaux:
        shape(fid, f"<p><b>{title}</b></p>", ax, ay-60, 620, 70, bg="#0a0a0a", fs=14)
        sticky(fid, content, ax, ay+160, color, w=620)

    label(fid, "PRESSE (M6-M12)", cx(x0), y0+2000, bg="#c0392b", w=280)
    sticky(fid, "Cibles: Elle/Grazia/Marie Claire (angle \"trouver le vrai expert\") · DNA/L'Alsace (startup strasbourgeoise) · Coiff&Co (presse pro)\nFormat: communiqué de presse + dossier fondateur + 3 témoignages coiffeurs pionniers", cx(x0), y0+2160, "light_pink", w=ZW-180)


def zone_10(fid, x0, y0):
    """Plan de Lancement"""
    label(fid, "PRINCIPE — DENSITÉ LOCALE AVANT EXPANSION", cx(x0), y0+185, bg="#c0392b", w=600)
    shape(fid, "<p><b>L'erreur de la plupart des marketplaces: se lancer national trop tôt.</b><br/>Résultat: aucune densité nulle part, tout le monde est déçu.<br/>CHAIR doit devenir INDISPENSABLE à Strasbourg avant d'exister à Paris.</p>",
          cx(x0), y0+330, ZW-180, 120, bg="#3d0000", fg="#fff", fs=16)

    phases_launch = [
        ("PHASE 1 — ALSACE (M1-M3)\nObjectif: 100 coiffeurs actifs",
         "S1-S2: 30 DM Instagram personnalisés aux meilleurs profils alsaciens\nS3-S4: 20 visites terrain salons Strasbourg (tablet en main)\nS5-S8: Partenariat CFA coiffure Strasbourg (présentation aux étudiants)\nS9-S12: Événement lancement CHAIR Strasbourg (30-50 coiffeurs, photos portfolio offertes)\n\nSignal de succès: \"coiffeur balayage Strasbourg\" → 1er résultat Google = CHAIR",
         "#c0392b", "light_yellow"),
        ("PHASE 2 — GRAND EST (M3-M9)\nObjectif: 500 coiffeurs actifs",
         "• Activation réseau alsacien (programme parrainage)\n• Partenaire distributeur pro régional\n• Instagram CHAIR régulier (coiffeurs alsaciens partagent)\n• Premier article presse locale (DNA, L'Alsace)",
         "#e67e22", "yellow"),
        ("PHASE 3 — NATIONAL (M9-M18)\nTrigger: 500 coiffeurs + produit stable + équipe 2-3",
         "• Ads Meta ciblées par ville (Paris, Lyon, Marseille, Bordeaux)\n• Partenariat fédérations nationales (UNEC, CNEC)\n• TikTok: 1 vidéo qui perce suffit\n• Presse nationale beauté",
         "#27ae60", "light_green"),
    ]
    y_cur = y0 + 560
    for title, content, hbg, color in phases_launch:
        shape(fid, f"<p><b>{title}</b></p>", cx(x0), y_cur, ZW-160, 80, bg=hbg, fs=16)
        sticky(fid, content, cx(x0), y_cur+270, color, w=ZW-180)
        y_cur += 620


def zone_11(fid, x0, y0):
    """CHAIR Rent"""
    label(fid, "CHAIR RENT — ANALYSE FROIDE", cx(x0), y0+185, bg="#e67e22", w=420)
    shape(fid, "<p><b>L'idée:</b> Salons louent fauteuils inoccupés aux indépendants. CHAIR prend 15% de commission. \"Airbnb des fauteuils.\"</p>",
          cx(x0), y0+310, ZW-180, 90, bg="#3d2b1f", fg="#f5e6d3", fs=16)

    label(fid, "CE QUI EST SÉDUISANT ✓", lx(x0), y0+460, bg="#27ae60", w=320)
    label(fid, "CE QUI EST PROBLÉMATIQUE ✗", rx(x0), y0+460, bg="#c0392b", w=380)
    sticky(fid, "• Marché réel: fauteuils vides partout\n• Concept clair pour investisseurs\n• Revenu récurrent forte marge\n• Synergique (coiffeurs déjà inscrits)\n• Airbnb = référence rassurante", lx(x0), y0+700, "light_green", w=580)
    sticky(fid, "• Complexité légale ÉLEVÉE (assurance RC, droit travail, contrats)\n• Trust & Safety ÉLEVÉ (accidents, vols, litiges)\n• Différent du core business\n• Capital et support nécessaires\n• Volume insuffisant < 10 000 coiffeurs", rx(x0), y0+700, "light_pink", w=580)

    label(fid, "VERDICT", cx(x0), y0+1100, bg="#c0392b", w=200)
    shape(fid, "<p><b>CHAIR RENT: V4, PAS AVANT.</b><br/>Condition: 10 000 coiffeurs actifs + équipe dédiée + levée réalisée + cadre juridique établi.<br/>Risque si lancé trop tôt: diluer le focus, problèmes légaux, décrédibiliser CHAIR auprès des salons.</p>",
          cx(x0), y0+1270, ZW-180, 160, bg="#7b1d1d", fg="#f5e6d3", fs=16)

    label(fid, "ALTERNATIVES À PLUS FORTE ROI", cx(x0), y0+1520, bg="#8e44ad", w=400)
    sticky(fid, "Court terme: le profil coiffeur est la valeur principale.\nMoyen terme: réservation directe (Pro) = plus de valeur, moins de risque.\nLong terme: CHAIR Rent si volume + équipe présents.\n\n→ Ne pas construire Rent avant d'avoir un vrai problème de coiffeurs qui cherchent des fauteuils sur la plateforme.", cx(x0), y0+1700, "violet", w=ZW-180)


def zone_12(fid, x0, y0):
    """Roadmap Produit"""
    label(fid, "FILTRE: Est-ce que ça aide à avoir 100 coiffeurs actifs?", cx(x0), y0+185, bg="#c0392b", w=700)

    phases_road = [
        ("MAINTENANT", ["SEO: generateMetadata + sitemap dynamique", "Onboarding guidé coiffeur (< 5 min)", "Avis clients V1", "Entité juridique + CGU + RGPD", "Page 404 personnalisée"], "#c0392b", "light_pink", lx(x0)),
        ("3 MOIS", ["Notifications (abonné nouveau, vue profil)", "Statistiques profil → déclencheur upgrade Pro", "Page salon V1", "Tests mobile appareils réels", "Dashboard: réalisations récentes"], "#e67e22", "orange", rx(x0)),
        ("6 MOIS", ["Refonte UI page profil coiffeur", "Réservation en ligne V1 basique", "Email onboarding automatisé", "Recherche avancée (distance, prix, note)"], "#f39c12", "yellow", lx(x0)),
        ("12 MOIS", ["App mobile (PWA ou React Native)", "Agenda pro (pack Business)", "Messagerie coiffeur-client", "Espace CFA / Écoles"], "#27ae60", "light_green", rx(x0)),
        ("24-36 MOIS", ["CHAIR Talents (recrutement)", "Vidéos dans les réalisations", "Expansion Belgique/Suisse", "CHAIR Brands (data B2B)"], "#2980b9", "light_blue", cx(x0)),
    ]
    positions_y = [y0+350, y0+350, y0+1040, y0+1040, y0+1720]
    widths = [580, 580, 580, 580, ZW-180]

    for i, ((title, items, hbg, color, ax), ay) in enumerate(zip(phases_road, positions_y)):
        w = widths[i]
        shape(fid, f"<p><b>{title}</b></p>", ax, ay, w-20, 65, bg=hbg, fs=18)
        content = "\n".join(f"• {item}" for item in items)
        sticky(fid, content, ax, ay+280, color, w=w-20)


def zone_13(fid, x0, y0):
    """Risques"""
    label(fid, "MATRICE DES RISQUES", cx(x0), y0+185, bg="#c0392b", w=360)

    risques = [
        ("RISQUE CRITIQUE\nFaible adoption coiffeurs\nP: Moyenne · I: CRITIQUE",
         "Mitigation: onboarding simplifié, boucle de feedback M1, entretiens utilisateurs avant de coder quoi que ce soit d'autre.", "light_pink", lx(x0), y0+370),
        ("RISQUE ÉLEVÉ\nAucun coiffeur ne paie 9€\nP: Moyenne · I: Élevé",
         "Mitigation: tester le pricing à M6 avec 50 coiffeurs actifs. Trouver la vraie fonctionnalité payante (stats? réservation? badge?)", "light_pink", rx(x0), y0+370),
        ("RISQUE ÉLEVÉ\nInstagram sort Pro Portfolio\nP: Moyenne · I: Élevé",
         "Mitigation: SEO et avis certifiés restent impossibles à dupliquer par Instagram. Avantage structurel.", "orange", lx(x0), y0+870),
        ("RISQUE ÉLEVÉ\nProblème légal photos clients\nP: Moyenne · I: Élevé",
         "Mitigation: CGU claires, checkbox consentement photo dès V1, politique RGPD, DPO désigné.", "orange", rx(x0), y0+870),
        ("RISQUE CRITIQUE\nFondateur seul s'épuise\nP: Élevée · I: CRITIQUE",
         "Mitigation: co-fondateur ou premier employé avant M6. C'est la décision la plus importante de l'année.", "light_pink", lx(x0), y0+1370),
        ("RISQUE ÉLEVÉ\nConcurrence US bien financée\nP: Faible · I: Élevé",
         "Mitigation: avantage local, langue, partenariats institutionnels. La densité locale crée une barrière à l'entrée.", "yellow", rx(x0), y0+1370),
    ]
    for title, content, color, ax, ay in risques:
        shape(fid, f"<p><b>{title}</b></p>", ax, ay-65, 580, 90, bg="#7b1d1d", fs=13)
        sticky(fid, content, ax, ay+80, color, w=580)

    label(fid, "⚠️ LE RISQUE #1 SOUS-ESTIMÉ — CERCLE VICIEUX", cx(x0), y0+1900, bg="#7b1d1d", w=560)
    shape(fid, "<p>Lancement national trop tôt → aucune densité par ville → clients arrivent, trouvent peu de contenu → ne reviennent pas → coiffeurs voient peu de trafic → ne voient pas la valeur → se désabonnent.<br/><b>Antidote: densité locale. 100 coiffeurs à Strasbourg valent mieux que 1000 dilués sur 50 villes.</b></p>",
          cx(x0), y0+2060, ZW-180, 150, bg="#4a0a0a", fg="#f5e6d3", fs=15)


def zone_14(fid, x0, y0):
    """Tableau de Bord CEO"""
    label(fid, "KPIs HEBDOMADAIRES — Chaque lundi matin", cx(x0), y0+185, bg="#2c3e50", w=520)
    kpis_w = [
        ("Nouveaux coiffeurs inscrits", "M3: 10/sem · M6: 30/sem · M12: 100/sem", lx(x0), y0+380),
        ("Taux d'activation ⭐", "Inscription → 1ère réalisation\nCible: > 70% · KPI PRODUIT #1", rx(x0), y0+380),
        ("Réalisations publiées", "M3: 30/sem · M6: 100/sem · M12: 500/sem", lx(x0), y0+680),
        ("Trafic profils publics", "M3: 500/sem · M6: 5000/sem · M12: 50000/sem", rx(x0), y0+680),
    ]
    for title, content, ax, ay in kpis_w:
        shape(fid, f"<p><b>{title}</b></p>", ax, ay-55, 580, 65, bg="#1a2a4a", fs=15)
        sticky(fid, content, ax, ay+80, "light_blue", w=580)

    label(fid, "KPIs MENSUELS", cx(x0), y0+1000, bg="#2980b9", w=280)
    sticky(fid, "• Coiffeurs Actifs Mensuels (NORTH STAR)\n• Taux de rétention M1 coiffeurs\n• NPS coiffeurs (cible > 40)\n• MRR (revenus récurrents)\n• CAC coiffeur (coût d'acquisition)\n• Top 5 villes par densité\n• Taux conversion free → Pro",
           cx(x0), y0+1170, "light_blue", w=ZW-180)

    label(fid, "KPIs TRIMESTRIELS", cx(x0), y0+1490, bg="#1a5276", w=280)
    sticky(fid, "• Croissance MRR (%)\n• Ratio LTV/CAC (cible > 3)\n• Part de marché locale (%)\n• Pipeline médias / partenariats\n• Satisfaction coiffeurs (NPS trimestriel)",
           cx(x0), y0+1650, "blue", w=ZW-180)

    label(fid, "OUTILS RECOMMANDÉS", cx(x0), y0+1950, bg="#7f8c8d", w=320)
    txt(fid, "Notion + Google Sheets maintenant. Metabase dès que la DB grossit. Pas de dashboard complexe avant 1000 coiffeurs. <b>La seule métrique qui compte: combien de coiffeurs actifs ce mois-ci.</b>",
        cx(x0), y0+2070, fs=15)


def zone_15(fid, x0, y0):
    """Plan d'Action Fondateur"""
    horizons = [
        ("DEMAIN",
         "□ Créer l'entité juridique (Legalstart ou expert-comptable)\n□ Réserver chair.fr\n□ Créer compte Instagram @chair.app\n□ Lister 20 coiffeurs alsaciens > 1000 abonnés",
         "#c0392b", "light_pink", lx(x0), y0+220),
        ("CETTE SEMAINE",
         "□ Rédiger CGU + Politique confidentialité (modèle RGPD SaaS)\n□ Configurer domaine de production + SSL\n□ SEO: metadata dynamiques sur les profils\n□ Envoyer les 5 premiers DM Instagram\n□ Ouvrir un compte bancaire pro",
         "#e67e22", "orange", rx(x0), y0+220),
        ("CE MOIS-CI",
         "□ 20 coiffeurs avec profils complets à Strasbourg\n□ Présentation dans un CFA coiffure alsacien\n□ Landing page chair.fr (page de présentation simple)\n□ 20 posts Instagram en 30 jours\n□ Formulaire de témoignage premiers coiffeurs",
         "#f39c12", "yellow", lx(x0), y0+880),
        ("CE TRIMESTRE",
         "□ 100 coiffeurs actifs en Alsace\n□ Événement lancement CHAIR Strasbourg\n□ SEO complet (sitemap, structured data)\n□ Système d'avis clients V1\n□ Beta Pro avec 10 coiffeurs\n□ Identifier co-fondateur idéal",
         "#27ae60", "light_green", rx(x0), y0+880),
        ("CETTE ANNÉE",
         "□ 2000 coiffeurs actifs sur 5 villes\n□ MRR > 5000€\n□ Équipe 2-3 personnes\n□ Dossier levée de fonds prêt\n□ NPS coiffeurs > 40\n□ 1 article presse nationale\n□ Programme ambassadeur actif",
         "#2980b9", "light_blue", cx(x0), y0+1580),
    ]
    for title, content, hbg, color, ax, ay in horizons:
        w = ZW-180 if ax == cx(x0) else 600
        shape(fid, f"<p><b>{title}</b></p>", ax, ay, w-20, 65, bg=hbg, fs=20)
        sticky(fid, content, ax, ay+290, color, w=w-20)


def zone_16(fid, x0, y0):
    """Hypothèses Fondatrices"""
    label(fid, "CES CROYANCES PILOTENT TOUTE LA STRATÉGIE", cx(x0), y0+185, bg="#2c3e50", w=580)
    txt(fid, "Si une hypothèse est invalide, la stratégie doit s'adapter. Validez-les dans l'ordre ci-dessous.",
        cx(x0), y0+278, fs=15)

    hyps = [
        ("H1", "Un coiffeur valorise la réputation portable plus qu'un outil de réservation", "20 entretiens coiffeurs", "M1", lx(x0), y0+420, "light_yellow"),
        ("H2", "Un client cherche un coiffeur par spécialité, pas par salon", "Analyse requêtes Google (Semrush)", "M1", rx(x0), y0+420, "light_yellow"),
        ("H3", "Un coiffeur publie des réalisations si l'upload est < 3 minutes", "Taux d'activation 100 premiers", "M3", lx(x0), y0+860, "yellow"),
        ("H4", "Un coiffeur paie 9€/mois pour visibilité + badge", "Test pricing 50 coiffeurs actifs", "M6", rx(x0), y0+860, "orange"),
        ("H5", "Le SEO génère du trafic client organique significatif", "Trafic organique 6 mois post-profils", "M9", lx(x0), y0+1300, "light_green"),
        ("H6", "1 patron de salon = 3-6 coiffeurs activés", "Tester avec 10 salons", "M4", rx(x0), y0+1300, "light_blue"),
    ]
    for code, hyp, validation, deadline, ax, ay, color in hyps:
        shape(fid, f"<p><b>{code}</b></p>", ax-230, ay, 80, 60, bg="#2c3e50", fs=22)
        sticky(fid, f"{hyp}\n\n→ Comment valider: {validation}\n→ Deadline: {deadline}", ax+20, ay, 500, color)


def zone_17(fid, x0, y0):
    """Avantages Concurrentiels Durables"""
    label(fid, "POURQUOI CHAIR NE PEUT PAS ÊTRE COPIÉ EN 3 ANS", cx(x0), y0+185, bg="#1a3a1a", w=640)

    moats = [
        ("MOAT 1 — Capital Numérique Accumulé",
         "Après 2 ans sur CHAIR: 200 réalisations, 500 abonnés, 80 avis. Cet actif ne peut pas être exporté. Il est sur CHAIR à vie.\n→ C'est le même moat que LinkedIn.",
         "light_green", lx(x0), y0+400),
        ("MOAT 2 — SEO Composé",
         "50 000 profils = 50 000 landing pages SEO qui génèrent du trafic 24h/24 sans coût marginal.\n→ Un concurrent doit attendre des années pour répliquer.",
         "light_green", rx(x0), y0+400),
        ("MOAT 3 — Contrainte Structurelle Concurrents",
         "Planity et Treatwell ne peuvent PAS pivoter vers le coiffeur individuel sans trahir leur modèle salon.\n→ Contrainte permanente, pas une faiblesse temporaire.",
         "light_blue", lx(x0), y0+880),
        ("MOAT 4 — Données Propriétaires",
         "1ère base de données tendances coiffure en France: quelles spécialités, quelles villes, quelle démographie.\n→ Valeur incalculable pour L'Oréal, Wella, Schwarzkopf.",
         "yellow", rx(x0), y0+880),
        ("MOAT 5 — Effet Réseau Local",
         "Dans une ville: quand 70% des meilleurs coiffeurs sont sur CHAIR, ne pas y être devient une faiblesse professionnelle visible.\n→ Switching cost social maximal.",
         "orange", cx(x0), y0+1380),
    ]
    for title, content, color, ax, ay in moats:
        w = ZW-180 if ax == cx(x0) else 600
        shape(fid, f"<p><b>{title}</b></p>", ax, ay-65, w-20, 70, bg="#1a3a1a", fs=15)
        sticky(fid, content, ax, ay+100, color, w=w-20)

    label(fid, "QUESTIONS À REMETTRE EN QUESTION", cx(x0), y0+1870, bg="#c0392b", w=480)
    sticky(fid, "1. La réservation comme seul déclencheur de monétisation? → Peut-être les stats ou le badge fonctionnent mieux.\n2. Les salariés comme cible #1? → Les indépendants sont plus motivés (post-COVID, explosion auto-entrepreneurs).\n3. Strasbourg est-il le bon marché test? → Avantages réseau local vs Paris 11e plus représentatif.\n4. Fondateur seul assez longtemps? → Co-fondateur avant la levée de fonds?",
           cx(x0), y0+2060, "light_pink", w=ZW-180)


# ================================================================
# ORCHESTRATION
# ================================================================

ZONES = [
    ("01 — VISION & NORTH STAR",          0, 0, "#0d0d1a", zone_01),
    ("02 — ÉTAT ACTUEL",                   1, 0, "#0d1a0d", zone_02),
    ("03 — THÈSE DE MARCHÉ",              2, 0, "#1a0d1a", zone_03),
    ("04 — PERSONAS",                      0, 1, "#1a0d0d", zone_04),
    ("05 — BUSINESS MODEL",               1, 1, "#0d1a2a", zone_05),
    ("06 — OFFRES & TARIFICATION",        2, 1, "#0d1a1a", zone_06),
    ("07 — ACQUISITION COIFFEURS",        0, 2, "#1a1a0d", zone_07),
    ("08 — ACQUISITION CLIENTS",          1, 2, "#0d1a0d", zone_08),
    ("09 — PLAN DE COMMUNICATION",        2, 2, "#1a0d2a", zone_09),
    ("10 — PLAN DE LANCEMENT",            0, 3, "#0d1a2a", zone_10),
    ("11 — CHAIR RENT",                    1, 3, "#1a1a0d", zone_11),
    ("12 — ROADMAP PRODUIT",              2, 3, "#0d0d2a", zone_12),
    ("13 — RISQUES",                       0, 4, "#2a0d0d", zone_13),
    ("14 — TABLEAU DE BORD CEO",          1, 4, "#0d1a2a", zone_14),
    ("15 — PLAN D'ACTION FONDATEUR",      2, 4, "#0a0a0a", zone_15),
    ("16 — HYPOTHÈSES FONDATRICES",       0, 5, "#1a1a2a", zone_16),
    ("17 — AVANTAGES CONCURRENTIELS",     1, 5, "#0d1a0d", zone_17),
]

def main():
    print("=" * 56)
    print("  CHAIR — Miro Board Generator")
    print("=" * 56)

    if TOKEN == "VOTRE_ACCESS_TOKEN_ICI":
        print("\n⛔  Configurez TOKEN et BOARD_ID en haut du script.")
        sys.exit(1)

    # Vérification accès board
    r = requests.get(f"{API}/boards/{BOARD_ID}", headers=H)
    if not r.ok:
        print(f"\n⛔  Board inaccessible ({r.status_code}): {r.text[:200]}")
        sys.exit(1)
    print(f"\n  Board: '{r.json().get('name', '?')}' ✓")
    print(f"  {len(ZONES)} zones · ~{len(ZONES) * 18} éléments estimés")
    print(f"  Durée estimée: {len(ZONES) * 18 * 25 // 60 // 60 + 1}-{len(ZONES) * 25 * 25 // 60 // 60 + 1} minutes\n")

    for i, (title, col, row, bg, fn) in enumerate(ZONES):
        print(f"  [{i+1:2d}/{len(ZONES)}] {title}...", end=" ", flush=True)
        fid, x0, y0 = frame(title, col, row, bg)
        if not fid:
            print("ERREUR frame")
            continue
        header(fid, title, x0, y0)
        fn(fid, x0, y0)
        print("✓")

    print("\n" + "=" * 56)
    print("  ✓ Board CHAIR créé.")
    print("  → Ouvrez Miro, sélectionnez tout (Ctrl+A), Fit to screen.")
    print("=" * 56)

if __name__ == "__main__":
    main()

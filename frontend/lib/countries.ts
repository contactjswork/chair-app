// Liste complète des pays (noms français, usage courant) — utilisée par le
// champ "Pays" de l'inscription pro (recherche en texte libre, filtrage
// local, aucun appel réseau nécessaire). France en tête : marché principal
// de CHAIR, évite de faire défiler toute la liste pour le cas le plus
// fréquent quand le champ s'ouvre vide.
export const COUNTRIES: string[] = [
  'France',
  'Belgique',
  'Suisse',
  'Luxembourg',
  'Monaco',
  'Canada',
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Arabie saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche', 'Azerbaïdjan',
  'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belize', 'Bénin', 'Bhoutan', 'Biélorussie',
  'Birmanie', 'Bolivie', 'Bosnie-Herzégovine', 'Botswana', 'Brésil', 'Brunei', 'Bulgarie',
  'Burkina Faso', 'Burundi',
  'Cambodge', 'Cameroun', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', "Côte d'Ivoire", 'Croatie', 'Cuba',
  'Danemark', 'Djibouti', 'Dominique',
  'Égypte', 'Émirats arabes unis', 'Équateur', 'Érythrée', 'Espagne', 'Estonie', 'Eswatini',
  'États-Unis', 'Éthiopie',
  'Fidji', 'Finlande',
  'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade', 'Guatemala', 'Guinée',
  'Guinée-Bissau', 'Guinée équatoriale', 'Guyana',
  'Haïti', 'Honduras', 'Hongrie',
  'Inde', 'Indonésie', 'Irak', 'Iran', 'Irlande', 'Islande', 'Israël', 'Italie',
  'Jamaïque', 'Japon', 'Jordanie',
  'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Koweït',
  'Laos', 'Lesotho', 'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein', 'Lituanie',
  'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi', 'Maldives', 'Mali', 'Malte',
  'Maroc', 'Maurice', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie', 'Mongolie',
  'Monténégro', 'Mozambique',
  'Namibie', 'Nauru', 'Népal', 'Nicaragua', 'Niger', 'Nigeria', 'Norvège', 'Nouvelle-Zélande',
  'Oman', 'Ouganda', 'Ouzbékistan',
  'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Paraguay',
  'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal',
  'Qatar',
  'République centrafricaine', 'République démocratique du Congo', 'République dominicaine',
  'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda',
  'Saint-Christophe-et-Niévès', 'Saint-Marin', 'Saint-Vincent-et-les-Grenadines',
  'Sainte-Lucie', 'Salomon', 'Salvador', 'Samoa', 'São Tomé-et-Príncipe', 'Sénégal',
  'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie', 'Somalie',
  'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suriname', 'Syrie',
  'Tadjikistan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental', 'Togo', 'Tonga',
  'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay',
  'Vanuatu', 'Vatican', 'Venezuela', 'Vietnam',
  'Yémen',
  'Zambie', 'Zimbabwe',
];

/** Filtrage local (aucun réseau) — contient plutôt que "commence par", pour
 *  retrouver un pays même en tapant un fragment (ex. "unis" → États-Unis). */
export function searchCountries(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES.slice(0, limit);
  return COUNTRIES.filter((c) => c.toLowerCase().includes(q)).slice(0, limit);
}

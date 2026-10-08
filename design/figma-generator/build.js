// Assemble le plugin Figma : concatène src/*.js (ordre alphabétique) et
// injecte les icônes Lucide RÉELLEMENT utilisées par l'app (lues dans
// frontend/node_modules/lucide-react) sous forme de SVG.
//   node build.js   →   dist/code.js + dist/manifest.json
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../frontend');
const ICON_DIR = path.join(ROOT, 'node_modules/lucide-react/dist/esm/icons');

// 1. Icônes importées par l'app + celles utilisées par le générateur.
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f === 'node_modules' || f === '.next') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}
const used = new Set();
for (const f of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))]) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (/^[A-Z]/.test(name)) used.add(name);
    }
  }
}
const srcDir = path.join(__dirname, 'src');
const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();
const allSrc = srcFiles.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
// Tout mot entre apostrophes qui est une icône Lucide existante (les icônes
// passent souvent en paramètre : listRow(…, 'Bell'), données de trophées…).
const SRC_ICON_CANDIDATES = new Set();
for (const m of allSrc.matchAll(/'@?([A-Z][a-z][A-Za-z0-9]*)'/g)) SRC_ICON_CANDIDATES.add(m[1]);

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-z])([0-9])/g, '$1-$2').toLowerCase();
// Table d'alias (Home → house.mjs, AlertCircle → circle-alert.mjs…).
const ALIAS = {};
const index = fs.readFileSync(path.join(ICON_DIR, '..', 'lucide-react.mjs'), 'utf8');
for (const m of index.matchAll(/export \{([^}]+)\} from '\.\/icons\/([a-z0-9-]+)\.mjs'/g)) {
  for (const part of m[1].split(',')) {
    const a = part.trim().replace(/^default as /, '');
    if (a) ALIAS[a] = m[2];
  }
}
for (const name of SRC_ICON_CANDIDATES) {
  if (ALIAS[name] || fs.existsSync(path.join(ICON_DIR, kebab(name) + '.mjs'))) used.add(name);
}
const icons = {};
const missing = [];
for (const name of [...used].sort()) {
  let file = path.join(ICON_DIR, (ALIAS[name] || kebab(name)) + '.mjs');
  if (!fs.existsSync(file)) file = path.join(ICON_DIR, kebab(name).replace(/-(\d)/g, '$1') + '.mjs');
  if (!fs.existsSync(file)) { missing.push(name); continue; }
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/const __iconNode = (\[[\s\S]*?\]);\n/);
  if (!m) { missing.push(name); continue; }
  // eslint-disable-next-line no-new-func
  const nodes = Function('return ' + m[1])();
  const inner = nodes.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}/>`;
  }).join('');
  icons[name] = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
if (missing.length) console.warn('Icônes introuvables :', missing.join(', '));

const code = `// GÉNÉRÉ par build.js — ne pas éditer à la main (voir src/).\nconst ICONS = ${JSON.stringify(icons)};\n${allSrc}`;
const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'code.js'), code);
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify({
  name: 'CHAIR — Générateur du système de design',
  id: 'chair-design-system-generator',
  api: '1.0.0',
  main: 'code.js',
  editorType: ['figma'],
  documentAccess: 'dynamic-page',
  networkAccess: { allowedDomains: ['https://www.getchair.app'], reasoning: 'Illustrations officielles des spécialités CHAIR.' },
}, null, 2));
console.log(`OK — ${Object.keys(icons).length} icônes, ${srcFiles.length} modules, ${(code.length / 1024).toFixed(0)} Ko`);

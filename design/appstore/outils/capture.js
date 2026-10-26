// Captures réelles de l'app CHAIR (client) pour les visuels App Store.
// node capture.js [nom…]  → raw/<nom>.png  (390 × 763 × 3)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:8000/api';
const WEB = 'http://localhost:3000';
const OUT = path.join(__dirname, 'raw');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SLUG = process.env.SLUG || 'maxime-lopez';

async function clickText(page, text, sel) {
  const ok = await page.evaluate((t, s) => {
    const els = [...document.querySelectorAll(s || 'button, a, [role=tab], [role=button], div, span')];
    const el = els.reverse().find((e) => e.innerText && e.innerText.trim() === t && e.offsetParent !== null);
    if (el) { el.scrollIntoView({ block: 'center' }); el.click(); return true; }
    return false;
  }, text, sel);
  if (!ok) console.warn('  (texte introuvable : ' + text + ')');
  await sleep(900);
  return ok;
}

const SHOTS = {
  home: { url: '/app' },
  profile: { url: `/app/coiffeur/${SLUG}` },
  feed: { url: '/app/feed' },
  services: { url: `/app/coiffeur/${SLUG}`, act: async (p) => { await clickText(p, 'Services'); await p.evaluate(() => window.scrollTo(0, 420)); } },
  reviews: { url: `/app/coiffeur/${SLUG}`, act: async (p) => { await clickText(p, 'Avis'); await p.evaluate(() => window.scrollTo(0, 420)); } },
  search: { url: '/app/recherche?specialty=couleur-balayage&city=Paris', act: async () => { await sleep(15000); } },
  account: { url: '/app/compte', act: async () => { await sleep(15000); } },
  booking: { url: `/app/coiffeur/${SLUG}/reserver` },
};

(async () => {
  const login = await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: 'review.client@getchair.app', password: process.env.REVIEW_PASSWORD }) }).then((r) => r.json());
  if (!login.token) throw new Error('Connexion impossible : ' + JSON.stringify(login).slice(0, 200));
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--lang=fr-FR'] });
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
  for (const name of names) {
    let s = SHOTS[name];
    if (!s && name.startsWith('p:')) s = { url: '/app/coiffeur/' + name.slice(2), act: async (p) => { await p.evaluate(() => window.scrollTo(0, 640)); } };
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CHAIRClient/1');
    await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument((token, user) => {
      try {
        localStorage.setItem('chair_token', token);
        localStorage.setItem('chair_user', JSON.stringify(user));
        localStorage.setItem('chair_cookies_consent', 'acknowledged');
        localStorage.setItem('chair_client_onboarding_seen', '1');
        localStorage.setItem('chair_theme', 'light');
        if (!localStorage.getItem('chair_preferences')) localStorage.setItem('chair_preferences', JSON.stringify({ gender: 'femme', interests: ['couleur-balayage', 'coupe-femme', 'boucles-curly'] }));
        sessionStorage.setItem('chair_app_banner_dismissed', '1');
        localStorage.setItem('chair_geo_asked', '1');
        localStorage.setItem('chair_user_location', JSON.stringify({ latitude: 48.5734, longitude: 7.7521, city: 'Strasbourg', timestamp: Date.now() }));
      } catch (e) { /* */ }
      const css = '.chair-intro, nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display:none !important } * { caret-color: transparent !important; scrollbar-width: none !important }';
      const add = () => { const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); };
      if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
      new MutationObserver(() => document.querySelectorAll('nextjs-portal').forEach((n) => n.remove())).observe(document, { childList: true, subtree: true });
    }, login.token, login.user);
    await page.goto(WEB + s.url, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
    await sleep(2500);
    if (s.act) await s.act(page);
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, name.replace(':', '_') + '.png') });
    console.log('ok', name, page.url());
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

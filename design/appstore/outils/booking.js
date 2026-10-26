// Parcours de réservation réel (BookingSheet) : capture chaque étape.
const puppeteer = require('puppeteer-core');
const path = require('path');
const API = 'http://127.0.0.1:8000/api';
const WEB = 'http://localhost:3000';
const OUT = path.join(__dirname, 'raw');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLUG = process.env.SLUG || 'camille-klein';

(async () => {
  const login = await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: 'review.client@getchair.app', password: process.env.REVIEW_PASSWORD }) }).then((r) => r.json());
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CHAIRClient/1');
  await page.setViewport({ width: 390, height: 763, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument((token, user) => {
    localStorage.setItem('chair_token', token);
    localStorage.setItem('chair_user', JSON.stringify(user));
    localStorage.setItem('chair_cookies_consent', 'acknowledged');
    localStorage.setItem('chair_client_onboarding_seen', '1');
    localStorage.setItem('chair_geo_asked', '1');
    localStorage.setItem('chair_user_location', JSON.stringify({ latitude: 48.5734, longitude: 7.7521, city: 'Strasbourg', timestamp: Date.now() }));
    sessionStorage.setItem('chair_app_banner_dismissed', '1');
    const css = '.chair-intro, nextjs-portal { display:none !important } * { caret-color: transparent !important }';
    const addCss = () => { const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); };
    if (document.documentElement) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
    new MutationObserver(() => document.querySelectorAll('nextjs-portal').forEach((n) => n.remove())).observe(document, { childList: true, subtree: true });
  }, login.token, login.user);
  await page.goto(WEB + '/app/coiffeur/' + SLUG, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  await sleep(2500);
  const dump = async () => page.evaluate(() => [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=button]')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
  const clickIn = async (pred) => page.evaluate((p) => {
    const f = new Function('t', 'return ' + p);
    const b = [...document.querySelectorAll('[role=dialog] button, [role=dialog] [role=button]')].filter((x) => x.offsetParent && !x.disabled && x.getAttribute("aria-disabled") !== "true" && f(x.innerText.replace(/\s+/g, ' ').trim()));
    if (b[0]) { b[0].click(); return b[0].innerText.replace(/\s+/g, ' ').trim(); } return null;
  }, pred);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /Réserver un rendez-vous/.test(x.innerText)); if (b) b.click(); });
  await sleep(2500);
  console.log('ÉTAPE 1', await dump());
  await page.screenshot({ path: path.join(OUT, 'booking_1.png') });
  for (let i = 2; i <= (Number(process.env.STEPS) || 5); i++) {
    const preds = process.env['P' + i] || "t.length > 3 && !/Fermer|Retour|Annuler/.test(t)";
    const clicked = await clickIn(preds);
    console.log('clic', i, '→', clicked);
    await sleep(4500);
    console.log('ÉTAPE ' + i, await dump());
    await page.screenshot({ path: path.join(OUT, 'booking_' + i + '.png') });
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

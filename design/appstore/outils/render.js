// Visuels App Store CHAIR — 8 écrans 1290 × 2796 (430 × 932 CSS, ×3).
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'appstore');
fs.mkdirSync(OUT, { recursive: true });
const raw = (n) => 'file:///' + path.join(__dirname, 'raw', n + '.png').replace(/\\/g, '/');

const ICON = {
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  badge: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>',
  cal: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  qr: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M17 21h4v-4M14 21v-3"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  scissors: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>',
};

// L'iPhone : cadre, îlot, barre d'état, capture réelle, indicateur d'accueil.
function phone(shot, o) {
  o = o || {};
  const w = o.w || 292;
  const k = w / 390;
  const sb = Math.round(47 * k), img = Math.round(763 * k), hi = Math.round(34 * k);
  const dark = !!o.darkStatus;
  return `
  <div class="phone" style="width:${w + 22}px; ${o.style || ''}">
    <div class="screen" style="width:${w}px; height:${sb + img + hi}px">
      <div class="sb ${dark ? 'sb-dark' : ''}" style="height:${sb}px"><span>9:41</span>
        <span class="ind"><svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.2c2 0 3.9.8 5.3 2.1l1.1-1.1A9 9 0 0 0 7.5.6 9 9 0 0 0 1.1 3.2l1.1 1.1A7.5 7.5 0 0 1 7.5 2.2Zm0 3.1c1.2 0 2.3.5 3.1 1.2l1.1-1.1A6 6 0 0 0 7.5 3.8a6 6 0 0 0-4.2 1.6l1.1 1.1c.8-.7 1.9-1.2 3.1-1.2Zm0 3.1c.4 0 .8.2 1 .4L7.5 9.9 6.5 8.8c.2-.2.6-.4 1-.4Z"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke-opacity=".4" stroke="currentColor"/><rect x="2" y="2" width="18" height="8" rx="2.2"/><rect x="22.6" y="4" width="1.6" height="4" rx=".8" opacity=".5"/></svg></span>
      </div>
      <div class="island"></div>
      <img src="${raw(shot)}" style="width:${w}px; height:${img}px; display:block">
      <div class="hi" style="height:${hi}px"><i></i></div>
    </div>
  </div>`;
}

const S = [
  {
    id: '01', theme: 'dark', eyebrow: 'CHAIR',
    title: 'Le coiffeur<br>fait pour toi.',
    sub: 'Trouve le bon pro près de chez toi, en quelques secondes.',
    phone: phone('home', { w: 300 }),
    deco: `<div class="blob" style="width:520px;height:520px;left:-120px;top:420px;background:radial-gradient(closest-side,rgba(245,185,66,.16),transparent)"></div>`,
    float: '',
  },
  {
    id: '02', theme: 'light',
    eyebrow: 'Profils',
    title: 'Des profils<br>qui donnent envie.',
    sub: 'Réalisations, spécialités et avis : tout pour choisir en confiance.',
    phone: phone('profile', { w: 300 }),
    deco: `<svg class="strand" viewBox="0 0 430 932"><path d="M-40 520 C 120 420, 260 640, 470 470" /></svg>`,
    float: `<div class="card fl" style="right:18px; top:600px"><span class="ic gold">${ICON.badge}</span><span><b>Avis vérifiés</b><small>après une vraie visite</small></span></div>`,
  },
  {
    id: '03', theme: 'stone',
    eyebrow: 'Inspiration',
    title: 'Inspire-toi<br>avant de réserver.',
    sub: 'De vraies réalisations, pas des photos de catalogue.',
    phone: phone('feed', { w: 300, darkStatus: true }),
    deco: `<div class="blob" style="width:460px;height:460px;right:-160px;top:300px;background:radial-gradient(closest-side,rgba(10,10,10,.06),transparent)"></div>`,
    float: `<div class="chip fl" style="left:20px; top:690px">${ICON.scissors}Balayage</div><div class="chip fl" style="right:22px; top:820px">Boucles</div>`,
  },
  {
    id: '04', theme: 'light',
    eyebrow: 'Réservation',
    title: 'Réserve en<br>quelques gestes.',
    sub: 'Une prestation, un créneau. C’est confirmé.',
    phone: phone('booking_4', { w: 300 }),
    deco: `<svg class="strand" viewBox="0 0 430 932"><path d="M470 560 C 300 470, 160 690, -40 560" /></svg>`,
    float: `<div class="card fl" style="left:16px; top:760px"><span class="ic dark">${ICON.check}</span><span><b>Rendez-vous confirmé</b><small>Mercredi 28 octobre · 09:00</small></span></div>`,
  },
  {
    id: '05', theme: 'stone',
    eyebrow: 'Prestations',
    title: 'Le prix et la durée,<br>avant de venir.',
    sub: 'Chaque prestation est claire. Le paiement se fait au salon.',
    phone: phone('services', { w: 300 }),
    deco: `<div class="blob" style="width:480px;height:480px;left:-180px;top:520px;background:radial-gradient(closest-side,rgba(245,185,66,.14),transparent)"></div>`,
    float: `<div class="card fl price" style="right:16px; top:640px"><span><small>Balayage complet</small><b>120 min</b></span><em>90 €</em></div>`,
  },
  {
    id: '06', theme: 'light',
    eyebrow: 'Spécialités',
    title: 'Balayage, boucles,<br>barbe…',
    sub: 'Trouve l’expert de ce que tu as en tête.',
    phone: phone('search', { w: 300 }),
    deco: '',
    float: `<div class="chip fl dark" style="left:18px; top:600px">Balayage</div><div class="chip fl" style="right:20px; top:560px">Boucles</div><div class="chip fl" style="left:26px; top:830px">Barbe</div><div class="chip fl" style="right:16px; top:760px">Couleur</div>`,
  },
  {
    id: '07', theme: 'stone',
    eyebrow: 'Suivi',
    title: 'Tes rendez-vous,<br>sans y penser.',
    sub: 'Rappels, confirmations et historique au même endroit.',
    phone: phone('account', { w: 300 }),
    deco: `<svg class="strand" viewBox="0 0 430 932"><path d="M-40 700 C 150 560, 300 760, 470 610" /></svg>`,
    float: `<div class="notif fl" style="left:18px; right:18px; top:388px"><span class="app">C</span><span class="txt"><span class="row"><b>CHAIR</b><small>maintenant</small></span><span>Rappel : demain à 09:00 chez Camille Klein.</span></span></div>`,
  },
  {
    id: '08', theme: 'dark',
    eyebrow: 'Confiance',
    title: 'Des avis<br>100 % vérifiés.',
    sub: 'Chaque avis suit une vraie visite, validée en salon.',
    phone: phone('reviews', { w: 300 }),
    deco: `<div class="blob" style="width:520px;height:520px;right:-170px;top:460px;background:radial-gradient(closest-side,rgba(245,185,66,.15),transparent)"></div>`,
    float: `<div class="card fl" style="left:16px; top:690px"><span class="ic gold">${ICON.qr}</span><span><b>Visite vérifiée</b><small>QR code scanné en salon</small></span></div>`,
  },
];

const CSS = `
:root { --ink:#0a0a0a; --mute:#6b6b6b; --gold:#f5b942; --stone:#f3f2ef; }
* { box-sizing:border-box; margin:0; padding:0 }
body { width:430px; height:932px; overflow:hidden; font-family:'Geist', system-ui, sans-serif; -webkit-font-smoothing:antialiased }
.frame { position:relative; width:430px; height:932px; overflow:hidden; }
.light { background:#ffffff; color:var(--ink) }
.stone { background:var(--stone); color:var(--ink) }
.dark  { background:#0a0a0a; color:#fff }
.head { position:absolute; top:74px; left:34px; right:34px; z-index:3 }
.eyebrow { font-size:11.5px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; opacity:.5; margin-bottom:16px; display:flex; align-items:center; gap:10px }
.eyebrow::before { content:''; width:18px; height:2px; border-radius:2px; background:var(--gold); opacity:1 }
.dark .eyebrow { opacity:.65 }
h1 { font-size:41px; line-height:1.02; font-weight:800; letter-spacing:-.035em; text-wrap:balance }
.sub { margin-top:16px; font-size:16.5px; line-height:1.42; font-weight:500; color:var(--mute); max-width:330px; text-wrap:pretty }
.dark .sub { color:rgba(255,255,255,.62) }
.stage { position:absolute; left:0; right:0; top:300px; display:flex; justify-content:center; z-index:2 }
.phone { padding:11px; border-radius:52px; background:linear-gradient(145deg,#2a2a2c,#0d0d0e 40%,#1c1c1e); box-shadow: 0 0 0 1.5px #3a3a3c inset, 0 2px 4px rgba(0,0,0,.18), 0 30px 60px -18px rgba(10,10,10,.42), 0 60px 120px -40px rgba(10,10,10,.30) }
.dark .phone { box-shadow: 0 0 0 1.5px #4a4a4c inset, 0 30px 80px -20px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.06) }
.screen { position:relative; border-radius:42px; overflow:hidden; background:#fff }
.sb { position:relative; display:flex; justify-content:space-between; align-items:center; padding:2px 26px 0 30px; background:#fff; color:#0a0a0a; font-weight:600; font-size:13px; letter-spacing:-.01em }
.sb-dark { background:#0b0b0b; color:#fff }
.sb .ind { display:flex; gap:5px; align-items:center } .sb svg { fill:currentColor }
.island { position:absolute; top:9px; left:50%; transform:translateX(-50%); width:92px; height:26px; border-radius:20px; background:#000 }
.hi { background:#fff; display:flex; align-items:flex-end; justify-content:center; padding-bottom:7px }
.hi i { width:118px; height:4.5px; border-radius:3px; background:#0a0a0a; display:block }
.fl { position:absolute; z-index:4 }
.card { display:flex; align-items:center; gap:11px; padding:12px 16px 12px 12px; border-radius:20px; background:rgba(255,255,255,.96); color:var(--ink); box-shadow: 0 1px 2px rgba(10,10,10,.06), 0 18px 40px -14px rgba(10,10,10,.28); backdrop-filter: blur(10px) }
.card b { display:block; font-size:14px; font-weight:700; letter-spacing:-.01em } .card small { display:block; font-size:11.5px; color:var(--mute); font-weight:500; margin-top:1px }
.card .dot { width:10px; height:10px; border-radius:50%; background:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,.18); margin-left:4px }
.card .ic { width:34px; height:34px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex:none }
.ic.gold { background:#fff6e3; color:#b7801a } .ic.dark { background:#0a0a0a; color:#fff }
.price { padding:12px 16px; gap:18px } .price em { font-style:normal; font-size:22px; font-weight:800; letter-spacing:-.03em }
.chip { display:flex; align-items:center; gap:7px; padding:10px 16px; border-radius:999px; background:#fff; color:var(--ink); font-weight:600; font-size:14px; box-shadow: 0 1px 2px rgba(10,10,10,.06), 0 14px 30px -12px rgba(10,10,10,.25) }
.chip.dark { background:#0a0a0a; color:#fff }
.notif { display:flex; gap:11px; align-items:center; padding:12px 14px; border-radius:22px; background:rgba(245,245,245,.88); backdrop-filter: blur(18px); box-shadow: 0 20px 44px -16px rgba(10,10,10,.32); font-size:13.5px; line-height:1.3; color:var(--ink) }
.notif .app { width:36px; height:36px; border-radius:9px; background:#0a0a0a; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; flex:none; font-size:15px }
.notif .txt { display:flex; flex-direction:column; gap:1px; flex:1 } .notif .row { display:flex; justify-content:space-between } .notif small { color:var(--mute); font-size:11.5px }
.blob { position:absolute; border-radius:50%; z-index:1; pointer-events:none }
.strand { position:absolute; inset:0; width:430px; height:932px; z-index:1 }
.strand path { fill:none; stroke:var(--gold); stroke-width:1.4; opacity:.55; stroke-linecap:round }
.dark .card { background:rgba(28,28,30,.92); color:#fff; box-shadow:0 0 0 1px rgba(255,255,255,.08), 0 24px 50px -16px rgba(0,0,0,.7) }
.dark .card small { color:rgba(255,255,255,.55) } .dark .ic.gold { background:rgba(245,185,66,.14); color:var(--gold) }
`;

function html(s) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>${CSS}</style></head><body>
  <div class="frame ${s.theme}">
    ${s.deco || ''}
    <div class="head"><div class="eyebrow">${s.eyebrow}</div><h1>${s.title}</h1><p class="sub">${s.sub}</p></div>
    <div class="stage">${s.phone}</div>
    ${s.float || ''}
  </div></body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 3 });
  const only = process.argv.slice(2);
  for (const s of S) {
    if (only.length && !only.includes(s.id)) continue;
    const file = path.join(__dirname, 'appstore', 'src-' + s.id + '.html');
    fs.writeFileSync(file, html(s));
    await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, 'CHAIR-AppStore-' + s.id + '.png') });
    console.log('ok', s.id);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

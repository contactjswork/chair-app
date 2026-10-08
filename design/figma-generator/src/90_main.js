// ═══ Orchestration ══════════════════════════════════════════════════════

const PAGE_ORDER = [
  '00 — Project Overview', '01 — Foundations', '02 — Components',
  '03 — CHAIR Client — Mobile', '04 — CHAIR PRO — Mobile', '05 — CHAIR PRO — Desktop',
  '06 — CHAIR BUSINESS — Mobile', '07 — CHAIR BUSINESS — Desktop',
  '08 — User Flows', '09 — Interactive Prototypes', '10 — Variants & Experiments', '11 — Design Handoff',
];

async function cleanPreviousRun(keep) {
  for (const p of figma.root.children.slice()) {
    if (p !== keep && p.getPluginData(MARK) === '1') p.remove();
  }
}

async function step(label, fn) {
  prog(label);
  const t0 = Date.now();
  const r = await fn();
  await flush();
  log(label + ' — ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  return r;
}

async function main() {
  try {
    await figma.loadAllPagesAsync();
    let first;
    try { first = figma.createPage(); } catch (e) {
      // Plus aucune page disponible : on réutilise une page déjà générée,
      // vidée de ce que le plugin y avait mis (jamais le travail de l'utilisateur).
      first = figma.root.children.find((p) => p.getPluginData(MARK) === '1') || figma.currentPage;
      for (const n of first.children.slice()) if (n.getPluginData(MARK) === '1') n.remove();
    }
    first.name = '00 — Project Overview';
    first.setPluginData(MARK, '1');
    FIRST_PAGE = first;
    await figma.setCurrentPageAsync(first);
    await cleanPreviousRun(first);
    const cap = probePageCapacity(11);
    PAGE_MODE = cap >= 11 ? 'full' : 'compact';
    log('Pages disponibles : ' + cap + ' → mode ' + PAGE_MODE);

    await step('Polices et jetons…', async () => {
      await setupFonts();
      await setupVariables();
      await setupTextStyles();
      await setupEffects();
    });
    await step('Illustrations officielles…', () => loadImages(IMAGES));
    await step('01 — Foundations', buildFoundations);
    await step('02 — Components', buildComponents);

    const BUILDERS = [
      ['03 — CHAIR Client — Mobile', typeof buildClient === 'function' ? buildClient : null],
      ['04 — CHAIR PRO — Mobile', typeof buildProMobile === 'function' ? buildProMobile : null],
      ['05 — CHAIR PRO — Desktop', typeof buildProDesktop === 'function' ? buildProDesktop : null],
      ['06 — CHAIR BUSINESS — Mobile', typeof buildBusinessMobile === 'function' ? buildBusinessMobile : null],
      ['07 — CHAIR BUSINESS — Desktop', typeof buildBusinessDesktop === 'function' ? buildBusinessDesktop : null],
    ];
    for (const [name, fn] of BUILDERS) {
      if (!fn) continue;
      const page = await newPage(name);
      await go(page);
      await step(name, () => fn(page));
      endRow();
      closeContainer(page);
      const phys = physPage(page);
      if (CUR && CUR.flows.length) phys.flowStartingPoints = phys.flowStartingPoints.concat(CUR.flows);
    }

    const links = await step('Prototype : câblage des liens…', wireLinks);

    if (typeof buildDocs === 'function') await step('Pages de documentation…', () => buildDocs(links));

    // Ordre final des pages (mode complet)
    if (PAGE_MODE === 'full') PAGE_ORDER.forEach((n, i) => { const p = PAGES[n]; if (p && p.type === 'PAGE') figma.root.insertChild(Math.min(i, figma.root.children.length - 1), p); });
    await figma.setCurrentPageAsync(FIRST_PAGE);
    figma.closePlugin('CHAIR : système généré — ' + INVENTORY.length + ' écrans, ' + links.ok + ' liens de prototype.');
  } catch (e) {
    console.error(e);
    figma.closePlugin('Erreur : ' + (e && e.message ? e.message : e) + (e && e.stack ? ' | ' + e.stack.split('\n')[1] : ''));
  }
}

main();

// Simulateur minimal de l'API Figma pour tester le plugin hors Figma.
// Il ne calcule aucune mise en page : il vérifie les appels et lève les
// mêmes erreurs que Figma pour les usages interdits les plus courants.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let ID = 1;
const nid = () => (ID++) + ':' + 0;
let NODE_COUNT = 0;

class Node {
  constructor(type, name) {
    this.id = nid(); this.type = type; this.name = name || type; this.children = []; this.parent = null;
    this.x = 0; this.y = 0; this.width = 100; this.height = 100; this._pd = {}; this.fills = []; this.strokes = [];
    this.layoutMode = 'NONE'; this.reactions = []; this.componentPropertyReferences = null; this.visible = true;
    NODE_COUNT++;
  }
  appendChild(c) {
    if (this._inInstance) throw new Error('in appendChild: Cannot move node. New parent is an instance or is inside of an instance');
    if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1);
    c.parent = this; this.children.push(c); return c;
  }
  insertChild(i, c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.splice(i, 0, c); }
  resize(w, h) { if (!(w > 0) || !(h > 0)) throw new Error('in resize: Expected width and height > 0, got ' + w + 'x' + h + ' on ' + this.name); this.width = w; this.height = h; }
  resizeWithoutConstraints(w, h) { this.resize(w, h); }
  rescale(f) { this.width *= f; this.height *= f; }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; this._removed = true; }
  findOne(fn) { for (const c of this.children) { if (fn(c)) return c; const r = c.findOne(fn); if (r) return r; } return null; }
  findAll(fn) { const out = []; for (const c of this.children) { if (!fn || fn(c)) out.push(c); out.push(...c.findAll(fn)); } return out; }
  setPluginData(k, v) { this._pd[k] = v; } getPluginData(k) { return this._pd[k] || ''; }
  setBoundVariable(k, v) { if (!v) throw new Error('setBoundVariable: variable manquante pour ' + k); }
  async setReactionsAsync(r) {
    for (const x of r) for (const a of x.actions) if (a.type === 'NODE' && !a.destinationId) throw new Error('destination manquante');
    this.reactions = r;
  }
  async setEffectStyleIdAsync(id) { if (!id) throw new Error('style effet vide'); }
  async setTextStyleIdAsync(id) { if (!id) throw new Error('style texte vide'); }
  setExplicitVariableModeForCollection(c, m) { if (!m) throw new Error('mode manquant'); }
  get absoluteBoundingBox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  set layoutSizingHorizontal(v) { this._checkSizing(v); this._lsh = v; } get layoutSizingHorizontal() { return this._lsh; }
  set layoutSizingVertical(v) { this._checkSizing(v); this._lsv = v; } get layoutSizingVertical() { return this._lsv; }
  _checkSizing(v) {
    if (v === 'FILL' && (!this.parent || !this.parent.layoutMode || this.parent.layoutMode === 'NONE')) throw new Error('in set_layoutSizingHorizontal: FILL can only be set on children of auto-layout frames (' + this.name + ')');
    if (v === 'HUG' && (this.type !== 'TEXT' && (!this.layoutMode || this.layoutMode === 'NONE')) && !(this.type === 'INSTANCE')) throw new Error('HUG can only be set on auto-layout frames and text (' + this.name + ')');
  }
  set layoutPositioning(v) { if (v === 'ABSOLUTE' && (!this.parent || this.parent.layoutMode === 'NONE')) throw new Error('ABSOLUTE requires auto-layout parent (' + this.name + ')'); this._lp = v; } get layoutPositioning() { return this._lp; }
  set characters(v) { if (this.type === 'TEXT' && !this.fontName) throw new Error('fontName requis avant characters'); if (typeof v !== 'string') throw new Error('characters doit être une chaîne'); this._ch = v; } get characters() { return this._ch || ''; }
  clone() { return deepCopy(this, null); }
  createInstance() {
    if (this.type !== 'COMPONENT') throw new Error('createInstance sur ' + this.type);
    const i = deepCopy(this, null); i.type = 'INSTANCE'; i.mainComponent = this; markInInstance(i);
    i._defs = this.parent && this.parent.type === 'COMPONENT_SET' ? this.parent._propDefs() : this._propDefs();
    return i;
  }
  _propDefs() {
    const d = {};
    for (const [k, v] of Object.entries(this._props || {})) d[k] = v;
    if (this.type === 'COMPONENT_SET') {
      for (const c of this.children) for (const part of c.name.split(', ')) { const [k, val] = part.split('='); d[k] = d[k] || { type: 'VARIANT', values: new Set() }; d[k].values.add(val); }
    }
    return d;
  }
  get componentProperties() {
    if (this.type !== 'INSTANCE') throw new Error('componentProperties hors instance');
    const out = {}; for (const [k, v] of Object.entries(this._defs)) out[k] = { type: v.type, value: v.def }; return out;
  }
  setProperties(obj) {
    for (const [k, v] of Object.entries(obj)) {
      const d = this._defs[k];
      if (!d) throw new Error('in setProperties: propriété inconnue « ' + k + ' » sur ' + this.name);
      if (d.type === 'VARIANT' && !d.values.has(v)) throw new Error('in setProperties: variante inexistante ' + k + '=' + v + ' sur ' + this.mainComponent.parent.name);
      if (d.type === 'TEXT' && typeof v !== 'string') throw new Error('TEXT attend une chaîne : ' + k);
      if (d.type === 'BOOLEAN' && typeof v !== 'boolean') throw new Error('BOOLEAN attend un booléen : ' + k + ' = ' + v);
    }
  }
  swapComponent(c) { if (!c || c.type !== 'COMPONENT') throw new Error('swapComponent invalide'); this.mainComponent = c; }
  addComponentProperty(name, type, def) {
    if (this.type !== 'COMPONENT' && this.type !== 'COMPONENT_SET') throw new Error('addComponentProperty sur ' + this.type);
    if (this.type === 'COMPONENT' && this.parent && this.parent.type === 'COMPONENT_SET') throw new Error('propriété à ajouter sur l\'ensemble, pas la variante');
    this._props = this._props || {}; const key = name + '#' + ID++ + ':0'; this._props[key] = { type, def }; return key;
  }
  get defaultVariant() { return this.children[0]; }
}
function markInInstance(n) { for (const c of n.children) { c._inInstance = true; markInInstance(c); } }
function deepCopy(n, parent) {
  const c = new Node(n.type, n.name);
  for (const k of ['fontName', '_ch', 'layoutMode', 'width', 'height', '_defs', 'mainComponent']) c[k] = n[k];
  c.parent = parent;
  c.children = n.children.map((x) => deepCopy(x, c));
  return c;
}

function makeFigma(log) {
  const root = new Node('DOCUMENT', 'Document');
  const page1 = new Node('PAGE', 'Page 1'); root.appendChild(page1);
  page1.flowStartingPoints = [];
  let current = page1;
  const pageLimit = Number(process.env.PAGE_LIMIT || 3);
  const mk = (type) => () => { const n = new Node(type); current.appendChild(n); return n; };
  const varsById = {};
  const figma = {
    root,
    get currentPage() { return current; },
    async setCurrentPageAsync(p) { if (p.type !== 'PAGE') throw new Error('setCurrentPageAsync attend une page'); current = p; },
    async loadAllPagesAsync() {},
    createPage() { if (root.children.length >= pageLimit) throw new Error('Limited to ' + pageLimit + ' pages'); const p = new Node('PAGE'); p.flowStartingPoints = []; root.appendChild(p); return p; },
    createFrame: mk('FRAME'), createComponent: mk('COMPONENT'), createRectangle: mk('RECTANGLE'), createEllipse: mk('ELLIPSE'), createSection: mk('SECTION'),
    createText() { const n = new Node('TEXT'); current.appendChild(n); return n; },
    createNodeFromSvg(svg) { if (!svg.startsWith('<svg')) throw new Error('svg'); const f = new Node('FRAME'); f.appendChild(new Node('VECTOR')); current.appendChild(f); return f; },
    createComponentFromNode(n) { n.type = 'COMPONENT'; return n; },
    combineAsVariants(nodes, parent) {
      for (const n of nodes) { if (n.type !== 'COMPONENT') throw new Error('combineAsVariants : pas un composant'); if (!/=/.test(n.name)) throw new Error('Nom de variante invalide : ' + n.name); }
      const s = new Node('COMPONENT_SET'); parent.appendChild(s); for (const n of nodes) s.appendChild(n); return s;
    },
    createTextStyle() { return { id: 'S:' + ID++, name: '', fontName: null }; },
    createEffectStyle() { return { id: 'E:' + ID++, name: '' }; },
    async getLocalTextStylesAsync() { return []; }, async getLocalEffectStylesAsync() { return []; },
    async listAvailableFontsAsync() { return ['Regular', 'Medium', 'SemiBold', 'Bold', 'Black'].map((s) => ({ fontName: { family: 'Geist', style: s } })); },
    async loadFontAsync() {},
    async createImageAsync(url) { if (!url.startsWith('https://www.getchair.app/')) throw new Error('domaine non autorisé'); return { hash: 'h' + ID++ }; },
    notify(m) { log('notify: ' + m); },
    closePlugin(m) { figma._closed = m; },
    variables: {
      async getLocalVariableCollectionsAsync() { return []; },
      createVariableCollection(name) {
        let modes = [{ modeId: 'm' + ID++, name: 'Mode 1' }];
        return { id: 'VC:' + ID++, name, modes, renameMode() {}, addMode() { if (process.env.ONE_MODE) throw new Error('in addMode: Limited to 1 modes only'); const m = 'm' + ID++; modes.push({ modeId: m }); return m; }, remove() {} };
      },
      createVariable(name, col, type) { const v = { id: 'V:' + ID++, name, variableCollectionId: col.id, setValueForMode(m, val) { if (!m) throw new Error('mode vide'); } }; varsById[v.id] = v; return v; },
      createVariableAlias(v) { if (!v) throw new Error('alias vers variable vide'); return { type: 'VARIABLE_ALIAS', id: v.id }; },
      setBoundVariableForPaint(p, f, v) { if (!v) throw new Error('setBoundVariableForPaint : variable vide'); return Object.assign({}, p, { boundVariables: { color: v.id } }); },
    },
  };
  return figma;
}

module.exports = { makeFigma, getCount: () => NODE_COUNT };

if (require.main === module) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'dist', 'code.js'), 'utf8');
  const logs = [];
  const figma = makeFigma((m) => logs.push(m));
  const ctx = { figma, console: { log: (m) => logs.push(String(m)), error: (e) => logs.push('ERREUR ' + (e && e.stack || e)) }, setTimeout, Promise, Date, Math, JSON, Object, Array, String, Number, Set, Map, Error };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'code.js' });
  const t0 = Date.now();
  const wait = () => {
    if (figma._closed !== undefined) {
      const errs = logs.filter((l) => /ERREUR|Lien sans|Lien en échec|Icône absente/.test(l));
      console.log(errs.slice(0, 40).join('\n'));
      console.log('…', errs.length, 'alertes');
      console.log('FERMETURE :', figma._closed);
      console.log('Nœuds créés :', module.exports.getCount(), '· pages :', figma.root.children.map((p) => p.name).join(' | '));
      return;
    }
    if (Date.now() - t0 > 120000) { console.log('TIMEOUT'); return; }
    setTimeout(wait, 50);
  };
  wait();
}

/* Notación técnica (v3.3): subíndices reales en textos y dibujos.
 * Convierte símbolos escritos en texto plano (σmax, φVc, Mux, As, ldc…) en base + subíndice:
 * <sub> en HTML y <tspan class="sub" baseline-shift="sub"> en SVG.
 * Un observador aplica la conversión a todo lo que la app inserta; las fórmulas KaTeX,
 * los campos de formulario y las listas desplegables se dejan intactos.
 */
(function (global) {
  'use strict';
  const T = {
    'σmax': ['σ', 'max'], 'σmin': ['σ', 'min'], 'σadm': ['σ', 'adm'], 'σu': ['σ', 'u'],
    'φVc1': ['φV', 'c1'], 'φVc2': ['φV', 'c2'], 'φVc3': ['φV', 'c3'], 'φVc': ['φV', 'c'], 'φPnb': ['φP', 'nb'],
    'Vc1': ['V', 'c1'], 'Vc2': ['V', 'c2'], 'Vc3': ['V', 'c3'], 'Vu': ['V', 'u'], 'Vux': ['V', 'ux'], 'Vuy': ['V', 'uy'],
    'Mux': ['M', 'ux'], 'Muy': ['M', 'uy'], 'Mu': ['M', 'u'], 'Mx': ['M', 'x'], 'My': ['M', 'y'],
    'Kx': ['K', 'x'], 'Ky': ['K', 'y'], 'Ax': ['A', 'x'], 'Ay': ['A', 'y'], 'A2D': ['A', '2D'], 'A1': ['A', '1'], 'A2': ['A', '2'],
    'As': ['A', 's'], 'Ab': ['A', 'b'], 'Asx': ['A', 'sx'], 'Asy': ['A', 'sy'], 'ldc': ['l', 'dc'], 'db': ['d', 'b'],
    'Cx': ['C', 'x'], 'Cy': ['C', 'y'], 'Lx': ['L', 'x'], 'Ly': ['L', 'y'], 'Pu': ['P', 'u'], 'Df': ['D', 'f'],
    'Rnx': ['R', 'nx'], 'Rny': ['R', 'ny'], 'Rn': ['R', 'n'], 'bo': ['b', 'o'], 'fy': ['f', 'y'], "f'c": ["f'", 'c'],
    'ρmin': ['ρ', 'min'], 'ρmax': ['ρ', 'max'], 'sL': ['s', 'L'], 'sT': ['s', 'T'], 'smax': ['s', 'max'],
  };
  // σ1…σ4 y σ1u…σ4u
  for (let i = 1; i <= 4; i++) { T['σ' + i] = ['σ', String(i)]; T['σ' + i + 'u'] = ['σ', i + 'u']; }
  const claves = Object.keys(T).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\']/g, '\\$&'));
  const LETRA = 'A-Za-zÀ-ÿ0-9_\'';
  const RE = new RegExp('(?<![' + LETRA + '])(' + claves.join('|') + ')(?![' + LETRA + '])', 'g');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const SALTAR = 'script, style, textarea, select, option, title, .katex, .sin-notacion, input';

  function convertir(nodo) {
    const txt = nodo.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(txt)) return;
    const enSvg = nodo.parentNode.namespaceURI === SVGNS;
    const frag = document.createDocumentFragment();
    let ultimo = 0;
    RE.lastIndex = 0;
    let m;
    while ((m = RE.exec(txt))) {
      const [base, sub] = T[m[1]];
      frag.appendChild(document.createTextNode(txt.slice(ultimo, m.index) + base));
      let el;
      if (enSvg) { el = document.createElementNS(SVGNS, 'tspan'); el.setAttribute('class', 'subi'); el.setAttribute('baseline-shift', 'sub'); el.setAttribute('font-size', '72%'); }
      else el = document.createElement('sub');
      el.textContent = sub;
      frag.appendChild(el);
      ultimo = RE.lastIndex;
    }
    frag.appendChild(document.createTextNode(txt.slice(ultimo)));
    nodo.parentNode.replaceChild(frag, nodo);
  }

  function aplicar(raiz) {
    if (!raiz || raiz.nodeType !== 1 || raiz.closest(SALTAR)) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && (n.parentElement.closest(SALTAR) || n.parentElement.matches('sub, tspan.subi')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const lista = [];
    while (w.nextNode()) lista.push(w.currentNode);
    lista.forEach(convertir);
  }

  // Todo lo que se inserta en la página pasa por aquí
  function observar() {
    aplicar(document.body);
    new MutationObserver((cambios) => {
      cambios.forEach((c) => {
        if (c.type === 'characterData') { const p = c.target.parentElement; if (p) aplicar(p); return; }
        c.addedNodes.forEach((n) => { if (n.nodeType === 1) aplicar(n); else if (n.nodeType === 3 && n.parentElement) aplicar(n.parentElement); });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  global.Notacion = { aplicar, observar };
})(window);

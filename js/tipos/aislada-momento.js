/* Tipo de zapata: aislada con momento biaxial.
 * Método: Ing. Gustavo A. Chang Nieto (Diseño de Concreto II, Univ. del Magdalena), NSR-10.
 * Unidades: fuerzas en tonf, longitudes en m, momentos en tonf·m, f'c y fy en kgf/cm².
 * No toca el DOM: recibe la entrada y devuelve todos los resultados.
 */
(function (global) {
  'use strict';

  const RF = global.Refuerzo;
  const D_MIN = 0.15; // NSR-10 C.15.7: altura sobre el refuerzo inferior ≥ 150 mm

  // Ejemplo del documento (pág. 3–4).
  const EJEMPLO = {
    tipo: 'aislada-momento',
    proyecto: { nombre: 'Ejemplo del documento', elemento: 'Nudo 206' },
    cargas: {
      D: { P: 44.262, Mx: 0.196, My: 0.300 },
      L: { P: 8.534, Mx: 0.036, My: 0.057 },
    },
    suelo: { qadm: 12, pesoPropio: false, Df: 1.5, gs: 1.8, gc: 2.4 },
    columna: { Cx: 0.50, Cy: 0.40, barra: 7, nBarras: 8, alpha: 40 },
    materiales: { fc: 280, fy: 4200, lambda: 1, phiV: 0.75, phiF: 0.90, phiB: 0.65 },
    zapata: { Lx: 2.50, Ly: 2.00, d: 0.475, r: 0.075 },
    acero: { tipo: 'barras', barX: null, barY: null, malla: null, capas: 'auto', fyMalla: 4200 },
    informe: { titulo: '', elaboro: '', responsables: '', fecha: '' },
  };

  // Zapata nueva: todos los campos vacíos (null). El refuerzo arranca en barras.
  const VACIO = {
    tipo: 'aislada-momento',
    proyecto: { nombre: '', elemento: '' },
    cargas: { D: { P: null, Mx: null, My: null }, L: { P: null, Mx: null, My: null } },
    suelo: { qadm: null, pesoPropio: false, Df: null, gs: null, gc: null },
    columna: { Cx: null, Cy: null, barra: null, nBarras: null, alpha: null },
    materiales: { fc: null, fy: null, lambda: null, phiV: null, phiF: null, phiB: null },
    zapata: { Lx: null, Ly: null, d: null, r: null },
    acero: { tipo: 'barras', barX: null, barY: null, malla: null, capas: 'auto', fyMalla: 4200 },
    informe: { titulo: '', elaboro: '', responsables: '', fecha: '' },
  };

  // Valores de la NSR-10 que el botón "Usar valores de la NSR-10" llena de un clic.
  const NSR = { 'materiales.lambda': 1, 'materiales.phiV': 0.75, 'materiales.phiF': 0.90, 'materiales.phiB': 0.65, 'zapata.r': 0.075, 'columna.alpha': 40 };

  // Campos obligatorios por categoría (los momentos vacíos se toman como cero).
  const REQUERIDOS = {
    cargas: ['cargas.D.P', 'cargas.L.P'],
    suelo: ['suelo.qadm', 'suelo.Df'],
    columna: ['columna.Cx', 'columna.Cy', 'columna.barra', 'columna.nBarras', 'columna.alpha'],
    materiales: ['materiales.fc', 'materiales.fy', 'materiales.lambda', 'materiales.phiV', 'materiales.phiF', 'materiales.phiB'],
    planta: ['zapata.Lx', 'zapata.Ly'],
    altura: ['zapata.d', 'zapata.r'],
  };
  const vacio = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v));

  // Lista de campos vacíos por categoría: { cargas: [...], ... } solo con las incompletas.
  function faltantes(e) {
    const out = {};
    Object.keys(REQUERIDOS).forEach((cat) => {
      const req = REQUERIDOS[cat].slice();
      if (cat === 'suelo' && e.suelo.pesoPropio) req.push('suelo.gs', 'suelo.gc');
      const f = req.filter((k) => vacio(get(e, k)) || (k === 'columna.barra' && !RF.BARS[get(e, k)])); // barra que no existe
      if (f.length) out[cat] = f;
    });
    return out;
  }

  // Copia lista para calcular: momentos vacíos = 0.
  function preparar(e) {
    const c = clone(e);
    ['D', 'L'].forEach((t) => ['Mx', 'My'].forEach((m) => { if (vacio(c.cargas[t][m])) c.cargas[t][m] = 0; }));
    if (!c.unid) c.unid = global.Unidades ? global.Unidades.actual() : 'curso'; // sistema de las ecuaciones
    return c;
  }

  // Vista previa del paso Planta: presiones con Lx, Ly aunque falten materiales o d.
  function vistaPlanta(e) {
    const c = preparar(e);
    const rel = (k, v) => { const ks = k.split('.'); if (vacio(c[ks[0]][ks[1]])) c[ks[0]][ks[1]] = v; };
    rel('zapata.d', 0.5); rel('zapata.r', 0.075);
    rel('materiales.fc', 280); rel('materiales.fy', 4200); rel('materiales.lambda', 1);
    rel('materiales.phiV', 0.75); rel('materiales.phiF', 0.9); rel('materiales.phiB', 0.65);
    rel('columna.barra', 5); rel('columna.nBarras', 4); rel('columna.alpha', 40);
    return calcular(c);
  }

  // Valores reportados en el PDF para la validación automática.
  // Muy se compara contra el valor corregido (el PDF reporta 8.8 por usar Ly·Ky).
  const VALORES_PDF = [
    { k: 'serv.s1', v: 10.87, lbl: 'σ1 servicio', u: 'tonf/m²' },
    { k: 'serv.s2', v: 10.59, lbl: 'σ2 servicio', u: 'tonf/m²' },
    { k: 'serv.s3', v: 10.25, lbl: 'σ3 servicio', u: 'tonf/m²' },
    { k: 'serv.s4', v: 10.53, lbl: 'σ4 servicio', u: 'tonf/m²' },
    { k: 'ult.P', v: 66.77, lbl: 'Pu (1.2D + 1.6L)', u: 'tonf' },
    { k: 'ult.su', v: 13.75, lbl: 'σu máximo', u: 'tonf/m²' },
    { k: 'pz.bo', v: 3.70, lbl: 'bo', u: 'm' },
    { k: 'pz.A2D', v: 4.15, lbl: 'Área a cortante doble', u: 'm²' },
    { k: 'pz.Vu', v: 57.0, lbl: 'Vu en dos direcciones', u: 'tonf' },
    { k: 'pz.Vc1', v: 405.25, lbl: 'Vc C.11-31', u: 'tonf' },
    { k: 'pz.Vc2', v: 566.55, lbl: 'Vc C.11-32', u: 'tonf' },
    { k: 'pz.Vc3', v: 294.09, lbl: 'Vc C.11-33', u: 'tonf' },
    { k: 'pz.phiVc', v: 220.56, lbl: 'φVc punzonamiento', u: 'tonf' },
    { k: 'cx.A', v: 1.05, lbl: 'Ax cortante', u: 'm²' },
    { k: 'cy.A', v: 0.81, lbl: 'Ay cortante', u: 'm²' },
    { k: 'cx.Vu', v: 14.43, lbl: 'Vux', u: 'tonf' },
    { k: 'cy.Vu', v: 11.17, lbl: 'Vuy', u: 'tonf' },
    { k: 'cx.phiVc', v: 63.19, lbl: 'φVcx', u: 'tonf' },
    { k: 'cy.phiVc', v: 78.99, lbl: 'φVcy', u: 'tonf' },
    { k: 'fx.Mu', v: 13.75, lbl: 'Mux', u: 'tonf·m' },
    { k: 'fx.Rn', v: 3.38, lbl: 'Rnx', u: 'kgf/cm²' },
    { k: 'fx.As', v: 17.1, lbl: 'Asx', u: 'cm²' },
    { k: 'fy.Mu', v: 11.0, lbl: 'Muy (corregido, PDF: 8.8)', u: 'tonf·m' },
    { k: 'fy.As', v: 21.38, lbl: 'Asy', u: 'cm²' },
    { k: 'ap.phiPnb1', v: 309.4, lbl: 'φPnb1', u: 'tonf' },
    { k: 'ap.phiPnb2', v: 618.8, lbl: 'φPnb2', u: 'tonf' },
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function get(obj, path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj); }

  const CO = global.Concreto;

  function pesoPropio(inp, Lx, Ly, d) {
    const s = inp.suelo;
    if (!s.pesoPropio) return 0;
    const h = d + inp.zapata.r;
    return Lx * Ly * (h * s.gc + Math.max(s.Df - h, 0) * s.gs);
  }

  function esquinas(P, Mx, My, Lx, Ly) {
    const A = Lx * Ly;
    const Ix = Lx * Math.pow(Ly, 3) / 12;
    const Iy = Ly * Math.pow(Lx, 3) / 12;
    const p = P / A;
    const tx = Mx * (Ly / 2) / Ix;
    const ty = My * (Lx / 2) / Iy;
    return {
      A, Ix, Iy, p, tx, ty,
      s1: p + tx + ty, s2: p - tx + ty, s3: p - tx - ty, s4: p + tx - ty,
      // Campo lineal σ(x, y) = P/A + Mx·y/Ix + My·x/Iy (origen en el centro)
      gx: My / Iy, gy: Mx / Ix,
    };
  }

  function servicio(inp, Lx, Ly, d) {
    const c = inp.cargas;
    const W = pesoPropio(inp, Lx, Ly, d);
    const P = Math.abs(c.D.P) + Math.abs(c.L.P) + W;
    const Mx = Math.abs(c.D.Mx) + Math.abs(c.L.Mx);
    const My = Math.abs(c.D.My) + Math.abs(c.L.My);
    const e = esquinas(P, Mx, My, Lx, Ly);
    return Object.assign(e, { W, P, Mx, My, smax: Math.max(e.s1, e.s2, e.s3, e.s4), smin: Math.min(e.s1, e.s2, e.s3, e.s4) });
  }

  function combos(inp) {
    const D = inp.cargas.D, L = inp.cargas.L;
    const a = Math.abs;
    return [
      { id: '1.4D', tex: '1.4D', P: 1.4 * a(D.P), Mx: 1.4 * a(D.Mx), My: 1.4 * a(D.My) },
      { id: '1.2D + 1.6L', tex: '1.2D + 1.6L', P: 1.2 * a(D.P) + 1.6 * a(L.P), Mx: 1.2 * a(D.Mx) + 1.6 * a(L.Mx), My: 1.2 * a(D.My) + 1.6 * a(L.My) },
    ];
  }

  function ultimo(inp, Lx, Ly) {
    const lista = combos(inp).map((cb) => {
      const e = esquinas(cb.P, cb.Mx, cb.My, Lx, Ly);
      return Object.assign({}, cb, e, { su: Math.max(e.s1, e.s2, e.s3, e.s4) });
    });
    const gob = lista.reduce((a, b) => (b.su > a.su ? b : a));
    return Object.assign({ lista, gob }, gob);
  }

  // Coeficientes de la norma según el sistema de unidades (ver js/nucleo/unidades.js)
  function coef(inp) { return CO.coef(inp.unid); }
  const vc = CO.vc;

  function punzonamiento(inp, Lx, Ly, d, su) {
    const { Cx, Cy, alpha } = inp.columna;
    const { fc, lambda, phiV } = inp.materiales;
    const beta = Math.max(Cx, Cy) / Math.min(Cx, Cy);
    const bo = 2 * (Cx + d) + 2 * (Cy + d);
    const A2D = Math.max(Lx * Ly - (Cx + d) * (Cy + d), 0);
    const Vu = su * A2D;
    const C = coef(inp).eq;
    const Vc1 = vc(C.pz1 * (1 + 2 / beta), lambda, fc, bo, d);
    const Vc2 = vc(C.pz2 * (alpha * d / bo + 2), lambda, fc, bo, d);
    const Vc3 = vc(C.pz3, lambda, fc, bo, d);
    const Vc = Math.min(Vc1, Vc2, Vc3);
    const phiVc = phiV * Vc;
    const dentro = (Cx + d) < Lx && (Cy + d) < Ly;
    return { beta, bo, A2D, Vu, Vc1, Vc2, Vc3, Vc, phiVc, dentro, ok: Vu <= phiVc, util: Vu / phiVc };
  }

  function cortanteUnaDir(inp, Lx, Ly, d, su) {
    const { Cx, Cy } = inp.columna;
    const { fc, lambda, phiV } = inp.materiales;
    const kx = (Lx - Cx) / 2 - d, ky = (Ly - Cy) / 2 - d;
    const kc = coef(inp).eq.cu;
    const x = { k: kx, A: Ly * Math.max(kx, 0), phiVc: phiV * vc(kc, lambda, fc, Ly, d) };
    const y = { k: ky, A: Lx * Math.max(ky, 0), phiVc: phiV * vc(kc, lambda, fc, Lx, d) };
    [x, y].forEach((o) => { o.Vu = su * o.A; o.ok = o.Vu <= o.phiVc; o.util = o.Vu / o.phiVc; });
    return { x, y, util: Math.max(x.util, y.util) };
  }

  // Flexión en una dirección: voladizo (L − C)/2, ancho b. fy depende del tipo de refuerzo.
  function flexionDir(inp, L, C, b, d, su, fy) {
    const { fc, phiF } = inp.materiales;
    const K = (L - C) / 2;
    const Af = b * K;
    const F = su * Af;
    const Mu = F * K / 2;
    const s = CO.flexion(Mu, b, d, fc, fy, phiF, 'bd');
    return { K, Af, F, Mu, Rn: s.Rn, raiz: s.raiz, rhoCalc: s.rhoCalc, rhoMin: s.rhoMin, rhoMax: s.rhoMax, beta1: s.beta1, rho: s.rho, As: s.As, b, fy, ok: s.ok, gobiernaMin: !(s.rhoCalc > s.rhoMin) };
  }

  function aplastamiento(inp, Lx, Ly, h, Pu) {
    const { Cx, Cy } = inp.columna;
    const { fc, phiB } = inp.materiales;
    const a2x = Cx + 4 * h, a2y = Cy + 4 * h;
    const A2sin = a2x * a2y; // como en el PDF, sin limitar a la zapata
    // A2 debe estar contenida en el apoyo
    const { A1, A2, raiz, K, phiPnb1, phiPnb2 } = CO.aplastamiento(Cx, Cy, Math.min(a2x, Lx), Math.min(a2y, Ly), fc, phiB, Pu);
    return { A1, A2, A2sin, a2x, a2y, raiz, K, phiPnb1, phiPnb2, ok1: Pu <= phiPnb1, ok2: Pu <= phiPnb2,
      recortada: A2 < A2sin - 1e-9, util: Pu / Math.min(phiPnb1, phiPnb2) };
  }

  function desarrollo(inp, d) {
    const { fc, fy, lambda } = inp.materiales;
    const { db, fyM, fcM, l1, l2, lmin, ldc } = CO.ldc(inp.columna.barra, fc, fy, lambda, inp.unid);
    const disponible = d * 1000; // h − r, como en el esquema del PDF (pág. 14)
    const tabla = Math.abs(fyM - 412) < 15 ? RF.interpTabla(inp.columna.barra, fcM) : null;
    return { barra: inp.columna.barra, db, fyM, fcM, l1, l2, lmin, ldc, disponible, tabla, ok: disponible >= ldc, util: ldc / disponible };
  }

  function seleccionRefuerzo(inp, fx, fyv, Lx, Ly, h, r) {
    const a = inp.acero;
    if (a.tipo === 'malla') {
      const reqX = fx.As / Ly, reqY = fyv.As / Lx; // cm²/m
      const ops = RF.opcionesMallas(reqX, reqY, a.capas, Math.min(3 * h, 0.45), Lx, Ly);
      const ref = a.malla && ops.find((o) => o.ref === a.malla) ? a.malla : RF.mallaPorDefecto(ops);
      const sel = ops.find((o) => o.ref === ref);
      const util = Math.max(reqX / sel.provX, reqY / sel.provY);
      return { tipo: 'malla', ops, ref, sel, reqX, reqY, ok: sel.estado !== 'mal', util,
        resumenX: (sel.capas > 1 ? '2 × ' : '') + sel.ref + ' (' + sel.provX.toFixed(2) + ' cm²/m)',
        resumenY: (sel.capas > 1 ? '2 × ' : '') + sel.ref + ' (' + sel.provY.toFixed(2) + ' cm²/m)' };
    }
    const opsX = RF.opcionesBarras(fx.As, Ly, h, r);
    const opsY = RF.opcionesBarras(fyv.As, Lx, h, r);
    const barX = a.barX && RF.BARS[a.barX] ? a.barX : RF.barraPorDefecto(opsX);
    const barY = a.barY && RF.BARS[a.barY] ? a.barY : RF.barraPorDefecto(opsY);
    const selX = opsX.find((o) => o.barra === barX);
    const selY = opsY.find((o) => o.barra === barY);
    return { tipo: 'barras', opsX, opsY, barX, barY, selX, selY,
      ok: selX.estado !== 'mal' && selY.estado !== 'mal',
      util: Math.max(1 / selX.ratio, 1 / selY.ratio),
      resumenX: selX.n + ' #' + selX.barra + ' @ ' + selX.s.toFixed(2) + ' m',
      resumenY: selY.n + ' #' + selY.barra + ' @ ' + selY.s.toFixed(2) + ' m' };
  }

  function calcular(inp) {
    const { Lx, Ly, d, r } = inp.zapata;
    const h = d + r;
    const qadm = inp.suelo.qadm;
    const serv = servicio(inp, Lx, Ly, d);
    serv.ex = serv.P > 0 ? serv.My / serv.P : 0;
    serv.ey = serv.P > 0 ? serv.Mx / serv.P : 0;
    serv.caso = Math.abs(serv.smin) < 1e-6 ? 'B' : serv.smin < 0 ? 'C' : 'A';
    serv.Areq = serv.P / qadm;
    serv.okMax = serv.smax <= qadm + 1e-9;
    serv.okMin = serv.caso === 'A';
    serv.util = serv.okMin ? serv.smax / qadm : Math.max(serv.smax / qadm, 1.01);

    const ult = ultimo(inp, Lx, Ly);
    const pz = punzonamiento(inp, Lx, Ly, d, ult.su);
    const cu = cortanteUnaDir(inp, Lx, Ly, d, ult.su);
    const fyDis = inp.acero.tipo === 'malla' ? inp.acero.fyMalla : inp.materiales.fy;
    // X: barras paralelas a X, voladizo (Lx − Cx)/2, repartidas en Ly.
    const fx = flexionDir(inp, Lx, inp.columna.Cx, Ly, d, ult.su, fyDis);
    // Y: barras paralelas a Y, voladizo (Ly − Cy)/2, repartidas en Lx (el PDF usa Ly por error).
    const fyv = flexionDir(inp, Ly, inp.columna.Cy, Lx, d, ult.su, fyDis);
    fyv.AfPdf = Ly * fyv.K;
    fyv.MuPdf = ult.su * fyv.AfPdf * fyv.K / 2;
    // Banda central en zapatas rectangulares (NSR-10 C.15.4.4.2), solo informativa
    const betaL = Math.max(Lx, Ly) / Math.min(Lx, Ly);
    const banda = { beta: betaL, gamma: 2 / (betaL + 1), corta: Lx <= Ly ? 'X' : 'Y' };

    const ref = seleccionRefuerzo(inp, fx, fyv, Lx, Ly, h, r);
    const ap = aplastamiento(inp, Lx, Ly, h, ult.P);
    const ld = desarrollo(inp, d);
    const dMinOk = d >= D_MIN - 1e-9;
    const flexOk = fx.ok && fyv.ok && ref.ok;
    const flexUtil = Math.max(ref.util, fx.rho / fx.rhoMax, fyv.rho / fyv.rhoMax);

    const sis = inp.unid || 'curso';
    const N = (x, mag) => (global.Unidades ? global.Unidades.num(x, mag, sis) : Number(x).toFixed(2));
    const Uu = (mag) => (global.Unidades ? global.Unidades.u(mag, sis) : '');
    const chequeos = [
      { id: 'serv', titulo: 'Esfuerzos sobre el suelo', ok: serv.okMax && serv.okMin, util: serv.util,
        det: 'σmax ' + N(serv.smax, 'presion') + ' de ' + N(qadm, 'presion') + ' ' + Uu('presion') + ', caso ' + serv.caso },
      { id: 'pz', titulo: 'Cortante en dos direcciones', ok: pz.ok, util: pz.util,
        det: 'Vu ' + N(pz.Vu, 'fuerza') + ' de φVc ' + N(pz.phiVc, 'fuerza') + ' ' + Uu('fuerza') },
      { id: 'cu', titulo: 'Cortante en una dirección', ok: cu.x.ok && cu.y.ok, util: cu.util,
        det: 'X ' + N(cu.x.Vu, 'fuerza') + ' de ' + N(cu.x.phiVc, 'fuerza') + ', Y ' + N(cu.y.Vu, 'fuerza') + ' de ' + N(cu.y.phiVc, 'fuerza') + ' ' + Uu('fuerza') },
      { id: 'fl', titulo: 'Flexión y refuerzo', ok: flexOk, util: flexUtil,
        det: ref.tipo === 'malla' ? 'Malla ' + ref.resumenX : 'X ' + ref.resumenX + ', Y ' + ref.resumenY },
      { id: 'ap', titulo: 'Aplastamiento', ok: ap.ok1 && ap.ok2, util: ap.util,
        det: 'Pu ' + N(ult.P, 'fuerza') + ' de ' + N(Math.min(ap.phiPnb1, ap.phiPnb2), 'fuerza') + ' ' + Uu('fuerza') },
      { id: 'ld', titulo: 'Longitud de desarrollo', ok: ld.ok && dMinOk, util: ld.util,
        det: 'ldc ' + N(ld.ldc, 'ldmm') + ' de ' + N(ld.disponible, 'ldmm') + ' ' + Uu('ldmm') + ' disponibles' },
    ];

    // Desigualdad de cada chequeo en LaTeX (para el resumen del PDF)
    const rel = (ok) => (ok ? '\\le' : '>');
    const relG = (ok) => (ok ? '\\ge' : '<');
    const UT = (mag) => (global.Unidades ? global.Unidades.tex(mag, sis) : '');
    const T = UT('fuerza');
    chequeos[0].tex = '\\sigma_{max} = ' + N(serv.smax, 'presion') + ' \\;' + rel(serv.okMax) + '\\; \\sigma_{adm} = ' + N(qadm, 'presion') + UT('presion');
    chequeos[1].tex = 'V_u = ' + N(pz.Vu, 'fuerza') + ' \\;' + rel(pz.ok) + '\\; \\phi V_c = ' + N(pz.phiVc, 'fuerza') + T;
    chequeos[2].tex = 'V_{ux} = ' + N(cu.x.Vu, 'fuerza') + ' \\;' + rel(cu.x.ok) + '\\; ' + N(cu.x.phiVc, 'fuerza') + ',\\quad V_{uy} = ' + N(cu.y.Vu, 'fuerza') + ' \\;' + rel(cu.y.ok) + '\\; ' + N(cu.y.phiVc, 'fuerza') + T;
    chequeos[3].tex = ref.tipo === 'malla'
      ? 'a_{s,prov} = ' + N(Math.min(ref.sel.provX, ref.sel.provY), 'aceroM') + ' \\;' + relG(ref.ok) + '\\; a_{s,req} = ' + N(Math.max(ref.reqX, ref.reqY), 'aceroM') + UT('aceroM')
      : 'A_{sx} = ' + N(ref.selX.AsProv, 'acero') + ' \\;' + relG(ref.selX.AsProv >= fx.As) + '\\; ' + N(fx.As, 'acero') + ',\\quad A_{sy} = ' + N(ref.selY.AsProv, 'acero') + ' \\;' + relG(ref.selY.AsProv >= fyv.As) + '\\; ' + N(fyv.As, 'acero') + UT('acero');
    chequeos[4].tex = 'P_u = ' + N(ult.P, 'fuerza') + ' \\;' + rel(ap.ok1 && ap.ok2) + '\\; \\phi P_{nb} = ' + N(Math.min(ap.phiPnb1, ap.phiPnb2), 'fuerza') + T;
    chequeos[5].tex = 'l_{dc} = ' + N(ld.ldc, 'ldmm') + ' \\;' + rel(ld.ok) + '\\; h - r = ' + N(ld.disponible, 'ldmm') + UT('ldmm');

    return {
      inp, Lx, Ly, d, r, h, serv, ult, pz, cu, fx, fy: fyv, banda, ref,
      ap, ld, dMinOk, chequeos, todoOk: chequeos.every((c) => c.ok),
      utilMax: Math.max.apply(null, chequeos.map((c) => c.util)),
    };
  }

  // Lx·Ly en pasos de 5 cm que cumplan σmax ≤ qadm y σmin > 0, con área casi mínima.
  // Entre las plantas con área hasta 3 % mayor que la mínima, prefiere voladizos parecidos.
  function optimizarPlanta(inp) {
    const { Cx, Cy } = inp.columna;
    const d = inp.zapata.d;
    const paso = 0.05;
    const redArriba = (v) => Math.ceil(v / paso - 1e-9) * paso;
    const candidatos = [];
    const minX = redArriba(Cx + 0.2), minY = redArriba(Cy + 0.2);
    for (let i = 0; minX + i * paso <= 10 + 1e-9; i++) {
      const Lx = +(minX + i * paso).toFixed(2);
      for (let j = 0; minY + j * paso <= 10 + 1e-9; j++) {
        const Ly = +(minY + j * paso).toFixed(2);
        if (Math.max(Lx / Ly, Ly / Lx) > 2) continue;
        const s = servicio(inp, Lx, Ly, d);
        if (s.smax > inp.suelo.qadm + 1e-9 || s.smin <= 0) continue;
        candidatos.push({ Lx, Ly, A: Lx * Ly, dif: Math.abs((Lx - Cx) - (Ly - Cy)) });
        break; // para este Lx, el primer Ly válido es el de menor área
      }
    }
    if (!candidatos.length) return null;
    const Amin = Math.min.apply(null, candidatos.map((c) => c.A));
    return candidatos.filter((c) => c.A <= Amin * 1.03 + 1e-9).sort((a, b) => a.dif - b.dif || a.A - b.A)[0];
  }

  // d mínimo (pasos de 2.5 cm) que cumpla cortante, flexión, aplastamiento y ld.
  function optimizarPeralte(inp) {
    for (let d = D_MIN; d <= 2.0 + 1e-9; d += 0.025) {
      const prueba = clone(inp);
      prueba.zapata.d = +d.toFixed(3);
      const R = calcular(prueba);
      if (R.pz.ok && R.cu.x.ok && R.cu.y.ok && R.fx.ok && R.fy.ok && R.ld.ok && R.ap.ok1 && R.ap.ok2) return prueba.zapata.d;
    }
    return null;
  }

  function validarContraPdf() {
    const ej = clone(EJEMPLO);
    const R = calcular(ej);
    const mapa = { serv: R.serv, ult: R.ult, pz: R.pz, cx: R.cu.x, cy: R.cu.y, fx: R.fx, fy: R.fy, ap: R.ap };
    return VALORES_PDF.map((t) => {
      const calc = get(mapa, t.k);
      const err = Math.abs(calc - t.v) / Math.abs(t.v);
      return Object.assign({}, t, { calc, err, ok: err <= 0.01 });
    });
  }

  function validarEntrada(e) {
    const pos = [e.zapata.Lx, e.zapata.Ly, e.zapata.d, e.columna.Cx, e.columna.Cy, e.materiales.fc, e.materiales.fy, e.suelo.qadm, e.materiales.lambda];
    if (pos.some((x) => !(x > 0))) return 'Las dimensiones, los materiales y σadm deben ser mayores que cero.';
    if (e.columna.Cx >= e.zapata.Lx || e.columna.Cy >= e.zapata.Ly) return 'La columna no cabe en la zapata. Aumente Lx o Ly.';
    if (e.zapata.r < 0 || e.zapata.r * 2 >= Math.min(e.zapata.Lx, e.zapata.Ly)) return 'Revise el recubrimiento.';
    if (!(Math.abs(e.cargas.D.P) + Math.abs(e.cargas.L.P) > 0)) return 'Ingrese la carga axial de servicio.';
    return null;
  }

  const modulo = {
    id: 'aislada-momento', nombre: 'Aislada con momento',
    EJEMPLO, VACIO, NSR, REQUERIDOS, D_MIN, calcular, optimizarPlanta, optimizarPeralte, validarContraPdf, validarEntrada,
    faltantes, preparar, vistaPlanta, clone,
  };
  global.Tipos = global.Tipos || {};
  global.Tipos['aislada-momento'] = modulo;
  // Alias de compatibilidad con la v1 (pruebas y consola)
  global.Zapata = Object.assign({ BARS: RF.BARS, EJEMPLO }, modulo);
})(window);

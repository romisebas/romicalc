/* Tipo de zapata: combinada (dos columnas sobre una zapata rectangular).
 * Método: Ing. Gustavo A. Chang Nieto (Diseño de Concreto II, Univ. del Magdalena), NSR-10.
 * Unidades: fuerzas en tonf, longitudes en m, momentos en tonf·m, f'c y fy en kgf/cm².
 * Eje x a lo largo de la zapata con origen en el borde izquierdo (lindero); columna 0 = exterior, 1 = interior.
 * Método 'corregido' (por defecto) o 'documento' (reproduce el PDF). No toca el DOM.
 */
(function (global) {
  'use strict';

  const PASO = 0.05; // L y B se redondean hacia arriba a múltiplos de 0.05 m

  // Ejemplo del documento (pág. 1–3): nudos 186 (exterior) y 187 (interior), sismo Y.
  const EJEMPLO = {
    tipo: 'combinada', metodo: 'corregido',
    proyecto: { nombre: 'Ejemplo del documento', elemento: 'Nudos 186 y 187' },
    columnas: [
      { c1: 0.5, c2: 0.5, D: 80.806, L: 18.264, E: 70.607, barra: 6, nBarras: 8 },
      { c1: 0.5, c2: 0.5, D: 146.067, L: 37.556, E: 8.820, barra: 6, nBarras: 8 },
    ],
    geometria: { a: 0, s: 5.0, modoL: 'uniforme', L: null, modoB: 'auto', B: null },
    sismo: { R0: 5, phiA: 0.9, phiP: 0.9, phiR: 1.0 },
    suelo: { qadm: 12, factorSismo: 1.33 },
    materiales: { fc: 280, fy: 4200, lambda: 1, phiV: 0.75, phiF: 0.90, phiB: 0.65 },
    zapata: { d: 0.68, r: 0.07 },
    acero: { barSup: null, barInf: null, barTrans: null },
    informe: { titulo: '', elaboro: '', responsables: '', fecha: '' },
  };

  const colVacia = () => ({ c1: null, c2: null, D: null, L: null, E: null, barra: null, nBarras: null });
  const VACIO = {
    tipo: 'combinada', metodo: 'corregido',
    proyecto: { nombre: '', elemento: '' },
    columnas: [colVacia(), colVacia()],
    geometria: { a: 0, s: null, modoL: 'uniforme', L: null, modoB: 'auto', B: null },
    sismo: { R0: null, phiA: null, phiP: null, phiR: null },
    suelo: { qadm: null, factorSismo: null },
    materiales: { fc: null, fy: null, lambda: null, phiV: null, phiF: null, phiB: null },
    zapata: { d: null, r: null },
    acero: { barSup: null, barInf: null, barTrans: null },
    informe: { titulo: '', elaboro: '', responsables: '', fecha: '' },
  };

  // Valores de la norma que el botón "Usar valores de la NSR-10" puede llenar
  const NSR = {
    'sismo.phiA': 0.9, 'sismo.phiP': 0.9, 'sismo.phiR': 1.0, 'suelo.factorSismo': 1.33,
    'materiales.lambda': 1, 'materiales.phiV': 0.75, 'materiales.phiF': 0.90, 'materiales.phiB': 0.65, 'zapata.r': 0.075,
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function get(obj, path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj); }
  const vacio = (x) => x === null || x === undefined || x === '' || !isFinite(x);
  function redondear(x) { return Math.ceil(x / PASO - 1e-9) * PASO; }

  // Campos que faltan (rutas). D debe ser mayor que cero; L y E pueden ser cero.
  function faltantes(e) {
    const f = [];
    const pos = (k) => { const v = get(e, k); if (vacio(v) || v <= 0) f.push(k); };
    const num = (k) => { const v = get(e, k); if (vacio(v) || v < 0) f.push(k); };
    [0, 1].forEach((i) => {
      ['c1', 'c2', 'D', 'barra', 'nBarras'].forEach((k) => pos('columnas.' + i + '.' + k));
      num('columnas.' + i + '.L');
    });
    pos('geometria.s'); num('geometria.a');
    if (e.geometria && e.geometria.modoL === 'fijo') pos('geometria.L');
    if (e.geometria && e.geometria.modoB === 'fijo') pos('geometria.B');
    ['sismo.R0', 'sismo.phiA', 'sismo.phiP', 'sismo.phiR', 'suelo.qadm', 'suelo.factorSismo',
      'materiales.fc', 'materiales.fy', 'materiales.lambda', 'materiales.phiV', 'materiales.phiF', 'materiales.phiB',
      'zapata.d', 'zapata.r'].forEach(pos);
    return f;
  }

  function preparar(e) {
    const c = clone(e);
    c.tipo = 'combinada';
    if (!c.metodo) c.metodo = 'corregido';
    if (!c.unid) c.unid = global.Unidades ? global.Unidades.actual() : 'curso';
    c.columnas.forEach((col) => { if (vacio(col.E)) col.E = 0; });
    if (vacio(c.geometria.a)) c.geometria.a = 0;
    return c;
  }

  // ---------------------------------------------------------------- cargas y planta
  function combinaciones(cols, R) {
    const def = [
      ['1.4D', 1.4, 0, 0], ['1.2D + 1.6L', 1.2, 1.6, 0],
      ['1.2D + 1.0L + 1.0E', 1.2, 1.0, 1], ['1.2D + 1.0L − 1.0E', 1.2, 1.0, -1],
      ['0.9D + 1.0E', 0.9, 0, 1], ['0.9D − 1.0E', 0.9, 0, -1],
    ];
    const lista = def.map(([id, kD, kL, kE]) => {
      const P = cols.map((c) => kD * c.D + kL * c.L + kE * c.E / R);
      return { id, P, suma: P[0] + P[1] };
    });
    const gob = lista.reduce((a, b) => (b.suma > a.suma + 1e-9 ? b : a));
    return { lista, combo: gob.id, gob };
  }

  // Presiones de servicio para una carga total P con resultante en xr
  function presionServicio(P, xr, L, B, lim) {
    const e = xr - L / 2, q = P / (L * B);
    const smax = q * (1 + 6 * Math.abs(e) / L), smin = q * (1 - 6 * Math.abs(e) / L);
    return { P, xr, e, smax, smin, lim, ok: smax <= lim + 1e-9 && smin >= -1e-9, util: smax / lim };
  }

  function planta(inp) {
    const g = inp.geometria, s = inp.sismo, su = inp.suelo;
    const R = s.R0 * s.phiA * s.phiP * s.phiR;
    const cols = inp.columnas.map((c, i) => {
      const x = i === 0 ? g.a + c.c1 / 2 : g.a + inp.columnas[0].c1 / 2 + g.s;
      return { i, x, c1: c.c1, c2: c.c2, D: c.D, L: c.L, E: c.E, Ps: c.D + c.L, PsE: c.D + 0.75 * 0.7 * c.E / R + 0.75 * c.L };
    });
    const Ps = cols[0].Ps + cols[1].Ps, PsE = cols[0].PsE + cols[1].PsE;
    const xbar = (cols[0].Ps * cols[0].x + cols[1].Ps * cols[1].x) / Ps;
    const xbarE = (cols[0].PsE * cols[0].x + cols[1].PsE * cols[1].x) / PsE;
    const L = g.modoL === 'fijo' ? g.L : redondear(2 * xbar);
    const Asin = Ps / su.qadm, Acon = PsE / (su.qadm * su.factorSismo);
    const caso = Acon > Asin ? 'con' : 'sin';
    const A = Math.max(Asin, Acon);
    const B = g.modoB === 'fijo' ? g.B : redondear(A / L);
    const avisos = [];
    const fin = cols[1].x + cols[1].c1 / 2;
    const cubre = L >= fin - 1e-9;
    if (!cubre) avisos.push('La zapata no cubre la columna interior: L debe ser al menos ' + fin.toFixed(2) + ' m.');
    const sin = presionServicio(Ps, xbar, L, B, su.qadm);
    const con = presionServicio(PsE, xbarE, L, B, su.qadm * su.factorSismo);
    const gobS = caso === 'con' ? con : sin;
    if ([sin, con].some((c) => Math.abs(c.e) > L / 6 + 1e-9)) avisos.push('La resultante cae fuera del tercio central (|e| > L/6)' + (Math.abs(sin.e) > L / 6 + 1e-9 ? '' : ' en el caso con sismo') + ': parte de la zapata no apoya.');
    const anchoMin = Math.max(cols[0].c2, cols[1].c2);
    if (B < anchoMin - 1e-9) avisos.push('El ancho B es menor que la columna: debe ser al menos ' + anchoMin.toFixed(2) + ' m.');
    const valido = cubre && B >= anchoMin - 1e-9;
    const serv = { caso, A, Asin, Acon, sin, con, smax: gobS.smax, smin: gobS.smin,
      ok: valido && sin.ok && con.ok, util: Math.max(sin.util, con.util) };
    const ult = combinaciones(cols, R);
    cols.forEach((c, i) => { c.Pu = ult.gob.P[i]; });
    return { R, cols, Ps, PsE, xbar, xbarE, L, B, e: L / 2 - xbar, area: L * B, serv, ult, avisos, valido };
  }

  // ---------------------------------------------------------------- presión última y viga invertida
  // w(x) = B·q(x) = w0 + gw·(x − L/2). Corregido: resultante en el punto de aplicación de ΣPu (equilibrio exacto).
  // Documento: presión uniforme qu = ΣPu/(L·B).
  function presionUltima(inp, R) {
    const P = R.cols[0].Pu + R.cols[1].Pu;
    const xr = (R.cols[0].Pu * R.cols[0].x + R.cols[1].Pu * R.cols[1].x) / P;
    const w0 = P / R.L;
    const gw = inp.metodo === 'documento' ? 0 : 12 * P * (xr - R.L / 2) / Math.pow(R.L, 3);
    const q = (x) => (w0 + gw * (x - R.L / 2)) / R.B;
    return { Pu: P, xr, w0, gw, q1: q(0), q2: q(R.L), qm: w0 / R.B, uniforme: Math.abs(gw) < 1e-12 };
  }

  // Cortante y momento en x (V a la izquierda de una carga en x, salvo con lado = 'der').
  function esfuerzos(R, x, lado) {
    const { w0, gw } = R.q, L = R.L;
    let V = w0 * x + gw * (x * x / 2 - L * x / 2);
    let M = w0 * x * x / 2 + gw * (x * x * x / 6 - L * x * x / 4);
    R.cols.forEach((c) => {
      if (x > c.x + 1e-12 || (lado === 'der' && Math.abs(x - c.x) <= 1e-12)) { V -= c.Pu; M -= c.Pu * (x - c.x); }
    });
    return { V, M, q: (w0 + gw * (x - L / 2)) / R.B };
  }

  function raiz(f, a, b) {
    let fa = f(a);
    if (fa * f(b) > 0) return null;
    for (let k = 0; k < 80; k++) {
      const m = (a + b) / 2, fm = f(m);
      if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }

  function longitudinal(R) {
    const L = R.L, [c0, c1] = R.cols, eps = 1e-9;
    const V = (x) => esfuerzos(R, x).V, M = (x) => esfuerzos(R, x).M;
    const V0 = raiz((x) => esfuerzos(R, x, 'der').V, c0.x + eps, c1.x - eps);
    const PI = [];
    if (V0 !== null) {
      [[c0.x, V0], [V0, c1.x]].forEach(([a, b]) => { const r = raiz(M, a, b); if (r !== null) PI.push(r); });
    }
    const punto = (c) => ({ x: c.x, Vizq: V(c.x), Vder: esfuerzos(R, c.x, 'der').V, M: M(c.x) });
    // Muestreo uniforme más los puntos singulares; en las cargas, dos puntos (izquierda y derecha)
    const marcas = [c0.x, c1.x, c0.x - c0.c1 / 2, c0.x + c0.c1 / 2, c1.x - c1.c1 / 2, c1.x + c1.c1 / 2].concat(V0 !== null ? [V0] : [], PI);
    const todos = [];
    for (let k = 0; k <= 400; k++) todos.push(L * k / 400);
    marcas.forEach((x) => { if (x > 0 && x < L) todos.push(x); });
    todos.sort((a, b) => a - b);
    const xs = [], Vs = [], Ms = [];
    todos.forEach((x, k) => {
      if (k > 0 && Math.abs(x - todos[k - 1]) < 1e-12) return;
      xs.push(x); Vs.push(V(x)); Ms.push(M(x));
      if (R.cols.some((c) => Math.abs(c.x - x) < 1e-12)) { xs.push(x); Vs.push(esfuerzos(R, x, 'der').V); Ms.push(M(x)); }
    });
    const Mneg = V0 !== null ? { x: V0, M: M(V0) } : { x: null, M: Math.min.apply(null, Ms) };
    return { xs, V: Vs, M: Ms, puntos: { V0, PI, ext: punto(c0), int: punto(c1) }, Mneg,
      Mpos: [{ x: c0.x, M: M(c0.x) }, { x: c1.x, M: M(c1.x) }] };
  }

  // ---------------------------------------------------------------- diseño
  function elegirBarras(As, b, h, r, pedida) {
    const RF = global.Refuerzo;
    // Sin solución a flexión (la sección no alcanza): no hay barras que elegir
    if (!isFinite(As)) return { ops: [], barra: pedida && RF.BARS[pedida] ? pedida : 6, n: 0, s: 0, estado: 'mal', ratio: 0, sinSolucion: true, resumen: 'Sin solución: aumente d' };
    const ops = RF.opcionesBarras(As, b, h, r);
    const barra = pedida && RF.BARS[pedida] ? pedida : RF.barraPorDefecto(ops);
    const sel = ops.find((o) => o.barra === barra);
    return Object.assign({ ops, resumen: sel.n + ' #' + sel.barra + ' @ ' + sel.s.toFixed(2) + ' m' }, sel);
  }

  function diseno(inp, R) {
    const m = inp.materiales, z = inp.zapata, h = z.d + z.r, d = z.d, a = inp.acero;
    const base = inp.metodo === 'documento' ? 'bd' : 'bh';
    const kc = global.Concreto.coef(inp.unid).eq.cu;
    const flex = (Mu, b) => global.Concreto.flexion(Mu, b, d, m.fc, m.fy, m.phiF, base, h);
    const phiVc = (b) => m.phiV * global.Concreto.vc(kc, m.lambda, m.fc, b, d);

    // Sentido longitudinal: acero superior con el momento negativo, inferior con el positivo mayor
    const Mpos = Math.max(0, R.lon.Mpos[0].M, R.lon.Mpos[1].M);
    const sup = flex(Math.abs(Math.min(0, R.lon.Mneg.M)), R.B);
    const inf = flex(Mpos, R.B);
    sup.sel = elegirBarras(sup.As, R.B, h, z.r, a.barSup);
    inf.sel = elegirBarras(inf.As, R.B, h, z.r, a.barInf);

    // Cortante longitudinal
    const lim = phiVc(R.B), p = R.lon.puntos, [c0, c1] = R.cols;
    let secciones;
    if (inp.metodo === 'documento') {
      // Fórmula del documento: Vud = Vu,centro·(X − d)/X, X = distancia de V = 0 a la cara hacia el vano
      secciones = p.V0 === null ? [] : [
        { x: c0.x + c0.c1 / 2, Vc: Math.abs(p.ext.Vder), X: p.V0 - (c0.x + c0.c1 / 2) },
        { x: c1.x - c1.c1 / 2, Vc: Math.abs(p.int.Vizq), X: (c1.x - c1.c1 / 2) - p.V0 },
      ].map((s) => ({ x: s.x, X: s.X, Vu: s.X > 0 ? s.Vc * Math.max(0, s.X - d) / s.X : 0 }));
    } else {
      secciones = [c0.x - c0.c1 / 2 - d, c0.x + c0.c1 / 2 + d, c1.x - c1.c1 / 2 - d, c1.x + c1.c1 / 2 + d]
        .filter((x) => x > 0 && x < R.L).map((x) => ({ x, Vu: Math.abs(esfuerzos(R, x).V) }));
    }
    secciones.forEach((s) => { s.phiVc = lim; });
    const Vud = secciones.reduce((mx, s) => Math.max(mx, s.Vu), 0);
    const cl = { secciones, Vud, phiVc: lim, ok: Vud <= lim, util: Vud / lim };

    // Sentido transversal: una franja bajo cada columna (d a cada lado, recortada por los bordes)
    const tr = R.cols.map((c) => {
      const x0 = Math.max(0, c.x - c.c1 / 2 - d), x1 = Math.min(R.L, c.x + c.c1 / 2 + d), b = x1 - x0;
      const wu = c.Pu / R.B, Lv = (R.B - c.c2) / 2, Mu = wu * Lv * Lv / 2;
      const fl = flex(Mu, b), Vu = wu * Math.max(Lv - d, 0), lv = phiVc(b);
      return { x0, x1, b, wu, Lv, Mu, fl, Vu, phiVc: lv, ok: fl.ok && Vu <= lv, util: Vu / lv, sel: elegirBarras(fl.As, b, h, z.r, a.barTrans) };
    });
    const union = tr[1].x0 < tr[0].x1 ? Math.max(tr[0].x1, tr[1].x1) - tr[0].x0 : tr[0].b + tr[1].b;
    const bEntre = Math.max(0, R.L - union);
    const AsEntre = 0.0018 * bEntre * 100 * h * 100;
    const entre = { b: bEntre, As: AsEntre, sel: bEntre > 0 ? elegirBarras(AsEntre, bEntre, h, z.r, a.barTrans) : null };
    return { fl: { sup, inf }, cl, tr, entre };
  }

  // ---------------------------------------------------------------- punzonamiento, aplastamiento y desarrollo
  // Perímetro crítico a d/2 de la columna; un lado se pierde si el borde está a menos de d/2.
  function punzonamiento(inp, R) {
    const m = inp.materiales, d = inp.zapata.d, C = global.Concreto.coef(inp.unid).eq, vc = global.Concreto.vc;
    return R.cols.map((c) => {
      const oL = c.x - c.c1 / 2, oR = R.L - (c.x + c.c1 / 2);
      const libres = (oL < d / 2 ? 1 : 0) + (oR < d / 2 ? 1 : 0);
      const dx = c.c1 + Math.min(oL, d / 2) + Math.min(oR, d / 2), dy = c.c2 + d;
      const lados = 4 - libres, alpha = lados === 4 ? 40 : lados === 3 ? 30 : 20;
      const bo = 2 * dx + (2 - libres) * dy, A = dx * dy;
      const Vu = c.Pu - esfuerzos(R, c.x).q * A;
      const beta = Math.max(c.c1, c.c2) / Math.min(c.c1, c.c2);
      const Vc1 = vc(C.pz1 * (1 + 2 / beta), m.lambda, m.fc, bo, d);
      const Vc2 = vc(C.pz2 * (alpha * d / bo + 2), m.lambda, m.fc, bo, d);
      const Vc3 = vc(C.pz3, m.lambda, m.fc, bo, d);
      const Vc = Math.min(Vc1, Vc2, Vc3), phiVc = m.phiV * Vc;
      return { lados, alpha, dx, dy, bo, A, Vu, beta, Vc1, Vc2, Vc3, Vc, phiVc, ok: Vu <= phiVc, util: Vu / phiVc };
    });
  }

  function aplastamientos(inp, R) {
    const m = inp.materiales, h = inp.zapata.d + inp.zapata.r;
    return R.cols.map((c) => {
      const A2x = Math.min(c.x + c.c1 / 2 + 2 * h, R.L) - Math.max(c.x - c.c1 / 2 - 2 * h, 0);
      const A2y = Math.min(c.c2 + 4 * h, R.B);
      return Object.assign({ A2x, A2y }, global.Concreto.aplastamiento(c.c1, c.c2, A2x, A2y, m.fc, m.phiB, c.Pu));
    });
  }

  function desarrollo(inp, R) {
    const m = inp.materiales, z = inp.zapata, CO = global.Concreto;
    const dovelas = inp.columnas.map((col) => {
      const l = CO.ldc(col.barra, m.fc, m.fy, m.lambda, inp.unid);
      return Object.assign(l, { barra: col.barra, disponible: z.d * 1000, ok: z.d * 1000 >= l.ldc, util: l.ldc / (z.d * 1000) });
    });
    const sup = CO.ldTraccion(R.fl.sup.sel.barra, m.fc, m.fy, m.lambda, true, inp.unid);
    const inf = CO.ldTraccion(R.fl.inf.sel.barra, m.fc, m.fy, m.lambda, false, inp.unid);
    // Las barras transversales se anclan en el voladizo: disponible = Lv − r
    const trans = R.tr.map((t) => {
      const ld = CO.ldTraccion(t.sel.barra, m.fc, m.fy, m.lambda, false, inp.unid), disp = (t.Lv - z.r) * 1000;
      return { barra: t.sel.barra, ld, disponible: disp, ok: disp >= ld, util: ld / disp };
    });
    const util = Math.max.apply(null, dovelas.map((x) => x.util).concat(trans.map((x) => x.util)));
    return { dovelas, sup, inf, trans, ok: dovelas.every((x) => x.ok) && trans.every((x) => x.ok), util };
  }

  // ---------------------------------------------------------------- despiece
  function despiece(inp, R) {
    const RF = global.Refuerzo, z = inp.zapata, h = z.d + z.r, L = R.L, B = R.B;
    const gancho = (n) => 12 * RF.BARS[n].db / 1000;
    const marcas = [];
    const add = (marca, desc, n, barra, recto, ganchos) => {
      const largo = recto + ganchos * gancho(barra);
      marcas.push({ marca, desc, barra, n, recto, ganchos, largo, forma: ganchos === 2 ? 'U' : ganchos === 1 ? 'L' : 'recta',
        kg: RF.BARS[barra].A * 0.785 * largo * n });
    };
    // Superior: del punto de inflexión menos ld al punto de inflexión más ld (o hasta los extremos)
    const PI = R.lon.puntos.PI, ldS = R.ld.sup / 1000;
    const xa = PI.length === 2 ? Math.max(z.r, PI[0] - ldS) : z.r;
    const xb = PI.length === 2 ? Math.min(L - z.r, PI[1] + ldS) : L - z.r;
    add('L1', 'Longitudinal superior', R.fl.sup.sel.n, R.fl.sup.sel.barra, xb - xa, (xa <= z.r + 1e-9 ? 1 : 0) + (xb >= L - z.r - 1e-9 ? 1 : 0));
    add('L2', 'Longitudinal inferior', R.fl.inf.sel.n, R.fl.inf.sel.barra, L - 2 * z.r, 2);
    add('T1', 'Transversal, franja exterior', R.tr[0].sel.n, R.tr[0].sel.barra, B - 2 * z.r, 2);
    add('T2', 'Transversal, franja interior', R.tr[1].sel.n, R.tr[1].sel.barra, B - 2 * z.r, 2);
    if (R.entre.sel) add('T3', 'Transversal entre franjas', R.entre.sel.n, R.entre.sel.barra, B - 2 * z.r, 2);
    inp.columnas.forEach((col, i) => {
      const db = RF.BARS[col.barra].db, emp = Math.max(0.071 * inp.materiales.fy * global.Concreto.KGFCM2_A_MPA * db, 300) / 1000; // empalme a compresión C.12.16.1
      add('D' + (i + 1), 'Dovelas, columna ' + (i ? 'interior' : 'exterior'), col.nBarras, col.barra, (h - z.r) + emp, 1);
    });
    return { marcas, total: marcas.reduce((s, x) => s + x.kg, 0) };
  }

  function chequeos(R) {
    const fmt = (x) => x.toFixed(2);
    const flOk = [R.fl.sup, R.fl.inf, R.tr[0].fl, R.tr[1].fl].every((f) => f.ok) &&
      [R.fl.sup.sel, R.fl.inf.sel, R.tr[0].sel, R.tr[1].sel].every((s) => s.estado !== 'mal');
    const sels = [R.fl.sup.sel, R.fl.inf.sel, R.tr[0].sel, R.tr[1].sel];
    const flUtil = Math.max.apply(null, sels.filter((s) => s.ratio > 0).map((s) => 1 / s.ratio).concat(sels.some((s) => s.sinSolucion) ? [1.01] : [0]));
    const ct = R.tr[0].util > R.tr[1].util ? R.tr[0] : R.tr[1];
    return [
      { id: 'suelo', titulo: 'Presión del suelo', ok: R.serv.ok, util: R.serv.util, det: 'σmax = ' + fmt(R.serv.smax) + ' tonf/m²' },
      { id: 'pz-ext', titulo: 'Punzonamiento, columna exterior', ok: R.pz[0].ok, util: R.pz[0].util, det: 'Vu = ' + fmt(R.pz[0].Vu) + ' ≤ φVc = ' + fmt(R.pz[0].phiVc) + ' tonf' },
      { id: 'pz-int', titulo: 'Punzonamiento, columna interior', ok: R.pz[1].ok, util: R.pz[1].util, det: 'Vu = ' + fmt(R.pz[1].Vu) + ' ≤ φVc = ' + fmt(R.pz[1].phiVc) + ' tonf' },
      { id: 'cl', titulo: 'Cortante longitudinal', ok: R.cl.ok, util: R.cl.util, det: 'Vud = ' + fmt(R.cl.Vud) + ' ≤ φVc = ' + fmt(R.cl.phiVc) + ' tonf' },
      { id: 'ct', titulo: 'Cortante transversal', ok: R.tr[0].Vu <= R.tr[0].phiVc && R.tr[1].Vu <= R.tr[1].phiVc, util: ct.util, det: 'Vu = ' + fmt(ct.Vu) + ' ≤ φVc = ' + fmt(ct.phiVc) + ' tonf' },
      { id: 'fl', titulo: 'Flexión', ok: flOk, util: flUtil, det: 'Superior ' + R.fl.sup.sel.resumen + '; inferior ' + R.fl.inf.sel.resumen },
      { id: 'ap', titulo: 'Aplastamiento', ok: R.ap.every((a) => a.ok), util: Math.max(R.ap[0].util, R.ap[1].util), det: 'Pu ≤ φPnb en las dos columnas' },
      { id: 'ld', titulo: 'Desarrollo', ok: R.ld.ok, util: R.ld.util, det: 'Dovelas y barras transversales anclan dentro de la zapata' },
    ];
  }

  function calcular(inp) {
    const R = planta(inp);
    R.inp = inp;
    R.h = inp.zapata.d + inp.zapata.r;
    R.d = inp.zapata.d;
    if (!R.valido) {
      // La zapata no cubre la columna interior o es más angosta que una columna: no tiene sentido diseñarla
      R.chequeos = [{ id: 'suelo', titulo: 'Presión del suelo', ok: false, util: Math.max(R.serv.util, 1.01), det: R.avisos.join(' ') }];
      R.todoOk = false;
      R.resumen = R.avisos.join(' ');
      return R;
    }
    R.q = presionUltima(inp, R);
    R.lon = longitudinal(R);
    Object.assign(R, diseno(inp, R));
    R.pz = punzonamiento(inp, R);
    R.ap = aplastamientos(inp, R);
    R.ld = desarrollo(inp, R);
    R.despiece = despiece(inp, R);
    R.chequeos = chequeos(R);
    R.todoOk = R.chequeos.every((c) => c.ok);
    R.resumen = 'Zapata de ' + R.L.toFixed(2) + ' × ' + R.B.toFixed(2) + ' m con h = ' + R.h.toFixed(2) + ' m.';
    return R;
  }

  // ---------------------------------------------------------------- validación contra el documento
  function validarContraPdf() {
    const e = clone(EJEMPLO);
    e.metodo = 'documento'; e.unid = 'curso';
    const R = calcular(preparar(e)), p = R.lon.puntos;
    const rel = (app, pdf, t) => Math.abs(app - pdf) <= Math.abs(pdf) * t + 1e-9;
    const absd = (app, pdf, t) => Math.abs(app - pdf) <= t + 1e-9;
    const filas = [
      ['Ps ext / int', [[R.cols[0].Ps, 99.07], [R.cols[1].Ps, 183.62]], rel, 0.005],
      ['x̄', [[R.xbar, 3.50]], absd, 0.01],
      ['L', [[R.L, 7.00]], absd, 0],
      ['Área requerida', [[R.serv.A, 23.56]], rel, 0.005],
      ['B', [[R.B, 3.40]], absd, 0],
      ['qu / wu', [[R.q.qm, 15.20], [R.q.w0, 51.68]], rel, 0.005],
      ['V ext (izq/der)', [[p.ext.Vizq, 12.91], [p.ext.Vder, -113.27]], rel, 0.005],
      ['V int (izq/der)', [[p.int.Vizq, 144.97], [p.int.Vder, -90.39]], rel, 0.005],
      ['x (V = 0) desde col. ext', [[p.V0 - R.cols[0].x, 2.19]], absd, 0.01],
      ['Mu⁻', [[R.lon.Mneg.M, -122.42]], rel, 0.005],
      ['Mu⁺ int / ext', [[p.int.M, 81.26], [p.ext.M, 1.61]], rel, 0.01],
      ['As⁻ / As⁺', [[R.fl.sup.As, 48.53], [R.fl.inf.As, 41.62]], rel, 0.01],
      ['Vud / φVc longitudinal', [[R.cl.Vud, 106.46], [R.cl.phiVc, 153.78]], rel, 0.005],
      ['Franjas b ext / int', [[R.tr[0].b, 1.18], [R.tr[1].b, 1.86]], absd, 1e-6],
      ['Mu transv ext / int', [[R.tr[0].Mu, 39.02], [R.tr[1].Mu, 72.78]], rel, 0.005],
      ['As transv ext / int', [[R.tr[0].fl.As, 15.44], [R.tr[1].fl.As, 28.90]], rel, 0.02],
      ['Vu / φVc transv ext', [[R.tr[0].Vu, 28.57], [R.tr[0].phiVc, 53.37]], rel, 0.005],
      ['Vu / φVc transv int', [[R.tr[1].Vu, 53.30], [R.tr[1].phiVc, 84.13]], rel, 0.005],
    ];
    return filas.map(([lbl, pares, f, tol]) => ({ lbl, pdf: pares.map((x) => x[1]), app: pares.map((x) => x[0]), tol,
      ok: pares.every(([app, pdf]) => f(app, pdf, tol)) }));
  }

  const modulo = { id: 'combinada', nombre: 'Combinada', EJEMPLO, VACIO, NSR, preparar, faltantes, calcular, esfuerzos, validarContraPdf, clone, redondear };
  global.Tipos = global.Tipos || {};
  global.Tipos.combinada = modulo;
})(window);

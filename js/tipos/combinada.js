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
    if (Math.abs(sin.e) > L / 6 + 1e-9) avisos.push('La resultante cae fuera del tercio central (|e| > L/6): parte de la zapata no apoya.');
    const serv = { caso, A, Asin, Acon, sin, con, smax: gobS.smax, smin: gobS.smin,
      ok: cubre && sin.ok && con.ok, util: Math.max(sin.util, con.util) };
    const ult = combinaciones(cols, R);
    cols.forEach((c, i) => { c.Pu = ult.gob.P[i]; });
    return { R, cols, Ps, PsE, xbar, xbarE, L, B, e: L / 2 - xbar, area: L * B, serv, ult, avisos };
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
    const RF = global.Refuerzo, ops = RF.opcionesBarras(As, b, h, r);
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
    const bEntre = Math.max(0, R.L - tr[0].b - tr[1].b);
    const AsEntre = 0.0018 * bEntre * 100 * h * 100;
    const entre = { b: bEntre, As: AsEntre, sel: bEntre > 0 ? elegirBarras(AsEntre, bEntre, h, z.r, a.barTrans) : null };
    return { fl: { sup, inf }, cl, tr, entre };
  }

  function calcular(inp) {
    const R = planta(inp);
    R.inp = inp;
    R.q = presionUltima(inp, R);
    R.lon = longitudinal(R);
    Object.assign(R, diseno(inp, R));
    return R;
  }

  const modulo = { id: 'combinada', nombre: 'Combinada', EJEMPLO, VACIO, NSR, preparar, faltantes, calcular, esfuerzos, clone, redondear };
  global.Tipos = global.Tipos || {};
  global.Tipos.combinada = modulo;
})(window);

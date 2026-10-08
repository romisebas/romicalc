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

  function calcular(inp) {
    const R = planta(inp);
    R.inp = inp;
    return R;
  }

  const modulo = { id: 'combinada', nombre: 'Combinada', EJEMPLO, VACIO, NSR, preparar, faltantes, calcular, clone, redondear };
  global.Tipos = global.Tipos || {};
  global.Tipos.combinada = modulo;
})(window);

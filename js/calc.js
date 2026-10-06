/* Motor de cálculo — Zapata aislada con momento biaxial.
 * Método: Ing. Gustavo A. Chang Nieto (Diseño de Concreto II, Univ. del Magdalena), NSR-10.
 * Unidades: fuerzas en tonf, longitudes en m, momentos en tonf·m, f'c y fy en kgf/cm².
 * Este archivo no toca el DOM: recibe un objeto de entrada y devuelve todos los resultados.
 */
(function (global) {
  'use strict';

  // Barras corrugadas designación en octavos de pulgada (NSR-10 Tabla C.3.5.3-2).
  // db en mm, A en cm².
  const BARS = {
    2: { db: 6.4, A: 0.32 },
    3: { db: 9.5, A: 0.71 },
    4: { db: 12.7, A: 1.29 },
    5: { db: 15.9, A: 1.99 },
    6: { db: 19.1, A: 2.84 },
    7: { db: 22.2, A: 3.87 },
    8: { db: 25.4, A: 5.10 },
    9: { db: 28.7, A: 6.45 },
    10: { db: 32.3, A: 8.19 },
  };

  // Tabla 4.21 (J. Segura): ld básica a compresión en mm, fy = 420 MPa.
  const TABLA_421 = {
    fc: [14.1, 17.6, 21.1, 24.6, 28.1, 31.7, 35.2, 38.7, 42.2],
    filas: {
      2: [200, 200, 200, 200, 200, 200, 200, 200, 200],
      3: [256, 229, 209, 200, 200, 200, 200, 200, 200],
      4: [341, 306, 279, 259, 242, 230, 230, 230, 230],
      5: [427, 383, 349, 324, 303, 288, 288, 288, 288],
      6: [513, 459, 420, 389, 364, 345, 345, 345, 345],
      7: [596, 534, 488, 452, 423, 401, 401, 401, 401],
      8: [682, 611, 558, 517, 483, 459, 459, 459, 459],
      9: [771, 690, 630, 584, 546, 519, 519, 519, 519],
      10: [868, 777, 709, 657, 615, 584, 584, 584, 584],
    },
  };

  const KGFCM2_A_MPA = 0.0980665;
  const RHO_MIN = 0.0018;
  const D_MIN = 0.15; // NSR-10 C.15.7: altura sobre el refuerzo inferior ≥ 150 mm

  // Ejemplo del documento (pág. 3–4).
  const EJEMPLO = {
    proyecto: { nombre: 'Ejemplo del documento', elemento: 'Nudo 206' },
    cargas: {
      D: { P: 44.262, Mx: 0.196, My: 0.300 },
      L: { P: 8.534, Mx: 0.036, My: 0.057 },
    },
    suelo: { qadm: 12, pesoPropio: false, Df: 1.5, gs: 1.8, gc: 2.4 },
    columna: { Cx: 0.50, Cy: 0.40, barra: 7, nBarras: 8, alpha: 40 },
    materiales: { fc: 280, fy: 4200, lambda: 1, phiV: 0.75, phiF: 0.90, phiB: 0.65 },
    zapata: { Lx: 2.50, Ly: 2.00, d: 0.475, r: 0.075 },
    acero: { barX: null, barY: null },
  };

  // Valores reportados en el PDF para la validación automática.
  // Muy se compara contra el valor corregido (el PDF reporta 8.8 por usar Ly·Ky).
  const VALORES_PDF = [
    { k: 'serv.s1', v: 10.87, lbl: 'σ1 servicio', u: 'tonf/m²' },
    { k: 'serv.s2', v: 10.59, lbl: 'σ2 servicio', u: 'tonf/m²' },
    { k: 'serv.s3', v: 10.25, lbl: 'σ3 servicio', u: 'tonf/m²' },
    { k: 'serv.s4', v: 10.53, lbl: 'σ4 servicio', u: 'tonf/m²' },
    { k: 'ult.P', v: 66.77, lbl: 'Pu (1.2D+1.6L)', u: 'tonf' },
    { k: 'ult.su', v: 13.75, lbl: 'σu máximo', u: 'tonf/m²' },
    { k: 'pz.bo', v: 3.70, lbl: 'bo', u: 'm' },
    { k: 'pz.A2D', v: 4.15, lbl: 'A cortante doble', u: 'm²' },
    { k: 'pz.Vu', v: 57.0, lbl: 'Vu 2D', u: 'tonf' },
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
    { k: 'fy.Mu', v: 11.0, lbl: 'Muy (corregido; PDF: 8.8)', u: 'tonf·m' },
    { k: 'fy.As', v: 21.38, lbl: 'Asy', u: 'cm²' },
    { k: 'ap.phiPnb1', v: 309.4, lbl: 'φPnb1', u: 'tonf' },
    { k: 'ap.phiPnb2', v: 618.8, lbl: 'φPnb2', u: 'tonf' },
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function get(obj, path) {
    return path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);
  }

  function beta1(fc) {
    // NSR-10 C.10.2.7.3 (fc en kgf/cm²; 280 kgf/cm² ≈ 28 MPa)
    const fcM = fc * KGFCM2_A_MPA;
    if (fcM <= 28) return 0.85;
    return Math.max(0.65, 0.85 - 0.05 * (fcM - 28) / 7);
  }

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
    const smax = Math.max(e.s1, e.s2, e.s3, e.s4);
    const smin = Math.min(e.s1, e.s2, e.s3, e.s4);
    return Object.assign(e, { W, P, Mx, My, smax, smin });
  }

  function combos(inp) {
    const D = inp.cargas.D, L = inp.cargas.L;
    const a = (x) => Math.abs(x);
    return [
      { id: '1.4D', P: 1.4 * a(D.P), Mx: 1.4 * a(D.Mx), My: 1.4 * a(D.My) },
      { id: '1.2D + 1.6L', P: 1.2 * a(D.P) + 1.6 * a(L.P), Mx: 1.2 * a(D.Mx) + 1.6 * a(L.Mx), My: 1.2 * a(D.My) + 1.6 * a(L.My) },
    ];
  }

  function ultimo(inp, Lx, Ly) {
    const lista = combos(inp).map((cb) => {
      const e = esquinas(cb.P, cb.Mx, cb.My, Lx, Ly);
      return Object.assign({}, cb, e, { su: Math.max(e.s1, e.s2, e.s3, e.s4) });
    });
    const gob = lista.reduce((a, b) => (b.su > a.su ? b : a));
    return { lista, gob, P: gob.P, Mx: gob.Mx, My: gob.My, su: gob.su,
      s1: gob.s1, s2: gob.s2, s3: gob.s3, s4: gob.s4, gx: gob.gx, gy: gob.gy, A: gob.A, Ix: gob.Ix, Iy: gob.Iy };
  }

  // Resistencia a cortante en tonf: k·λ·√f'c·b·d con b, d en cm y f'c en kgf/cm².
  function vc(k, lambda, fc, b_m, d_m) {
    return k * lambda * Math.sqrt(fc) * (b_m * 100) * (d_m * 100) / 1000;
  }

  function punzonamiento(inp, Lx, Ly, d, su) {
    const { Cx, Cy, alpha } = inp.columna;
    const { fc, lambda, phiV } = inp.materiales;
    const beta = Math.max(Cx, Cy) / Math.min(Cx, Cy);
    const bo = 2 * (Cx + d) + 2 * (Cy + d);
    const A2D = Math.max(Lx * Ly - (Cx + d) * (Cy + d), 0);
    const Vu = su * A2D;
    const Vc1 = vc(0.53 * (1 + 2 / beta), lambda, fc, bo, d);
    const Vc2 = vc(0.27 * (alpha * d / bo + 2), lambda, fc, bo, d);
    const Vc3 = vc(1.0, lambda, fc, bo, d);
    const Vc = Math.min(Vc1, Vc2, Vc3);
    const phiVc = phiV * Vc;
    // Si el perímetro crítico se sale de la zapata el chequeo no aplica como tal.
    const dentro = (Cx + d) < Lx && (Cy + d) < Ly;
    return { beta, bo, A2D, Vu, Vc1, Vc2, Vc3, Vc, phiVc, dentro, ok: Vu <= phiVc };
  }

  function cortanteUnaDir(inp, Lx, Ly, d, su) {
    const { Cx, Cy } = inp.columna;
    const { fc, lambda, phiV } = inp.materiales;
    const brazoX = (Lx - Cx) / 2 - d;
    const brazoY = (Ly - Cy) / 2 - d;
    const Ax = Ly * Math.max(brazoX, 0);
    const Ay = Lx * Math.max(brazoY, 0);
    const x = { k: brazoX, A: Ax, Vu: su * Ax, phiVc: phiV * vc(0.53, lambda, fc, Ly, d) };
    const y = { k: brazoY, A: Ay, Vu: su * Ay, phiVc: phiV * vc(0.53, lambda, fc, Lx, d) };
    x.ok = x.Vu <= x.phiVc;
    y.ok = y.Vu <= y.phiVc;
    return { x, y };
  }

  function flexionDir(inp, L, C, b, d, su) {
    const { fc, fy, phiF } = inp.materiales;
    const K = (L - C) / 2;
    const Af = b * K;
    const F = su * Af;
    const Mu = F * K / 2;
    const Rn = Mu * 1e5 / (phiF * (b * 100) * Math.pow(d * 100, 2)); // kgf/cm²
    const raiz = 1 - 2 * Rn / (0.85 * fc);
    const rhoCalc = raiz >= 0 ? (0.85 * fc / fy) * (1 - Math.sqrt(raiz)) : NaN;
    const b1 = beta1(fc);
    const rhoMax = 0.85 * b1 * (fc / fy) * (0.003 / (0.003 + 0.005));
    const rho = Math.max(isNaN(rhoCalc) ? Infinity : rhoCalc, RHO_MIN);
    const As = rho * (b * 100) * (d * 100);
    const ok = raiz >= 0 && rho <= rhoMax;
    return { K, Af, F, Mu, Rn, rhoCalc, rhoMin: RHO_MIN, rhoMax, beta1: b1, rho, As, b, ok, gobiernaMin: !(rhoCalc > RHO_MIN) };
  }

  // Alternativas de armado #2–#10 para un ancho b (m) y As requerido (cm²).
  function opcionesAcero(As, b, h, r) {
    const W = b - 2 * r; // ancho disponible entre ejes de barras extremas
    const smax = Math.min(3 * h, 0.45);
    return Object.keys(BARS).map(Number).map((n) => {
      const bar = BARS[n];
      const nAs = Math.ceil(As / bar.A - 1e-9);
      const nSmax = Math.ceil(W / smax - 1e-9) + 1;
      const nReq = Math.max(nAs, nSmax, 2);
      const sTeo = W / (nReq - 1);
      const s = Math.floor(sTeo * 100 + 1e-9) / 100; // redondeo hacia abajo al cm
      const nReal = s > 0 ? Math.floor(W / s + 1e-9) + 1 : nReq;
      const AsProv = nReal * bar.A;
      const libre = s - bar.db / 1000;
      const libreMin = Math.max(0.025, bar.db / 1000);
      let estado = 'ok';
      let motivo = 'Cumple';
      if (s <= 0 || libre < libreMin) { estado = 'mal'; motivo = 'Libre < ' + (libreMin * 100).toFixed(1) + ' cm'; }
      else if (s > smax + 1e-9) { estado = 'mal'; motivo = 's > smax'; }
      else if (s < 0.10) { estado = 'aviso'; motivo = 's < 10 cm'; }
      else if (s > 0.30) { estado = 'aviso'; motivo = 's > 30 cm'; }
      return { barra: n, db: bar.db, Ab: bar.A, n: nReal, s, AsProv, ratio: AsProv / As, estado, motivo, gobiernaSmax: nSmax > nAs, smax };
    });
  }

  function barraPorDefecto(ops) {
    const verde = ops.find((o) => o.estado === 'ok');
    if (verde) return verde.barra;
    const aviso = ops.find((o) => o.estado === 'aviso');
    return aviso ? aviso.barra : ops[ops.length - 1].barra;
  }

  function aplastamiento(inp, Lx, Ly, h, Pu) {
    const { Cx, Cy } = inp.columna;
    const { fc, phiB } = inp.materiales;
    const A1 = Cx * Cy;
    const a2x = Cx + 4 * h, a2y = Cy + 4 * h;
    const A2sin = a2x * a2y; // como en el PDF, sin limitar a la zapata
    const A2 = Math.min(a2x, Lx) * Math.min(a2y, Ly); // A2 debe estar contenida en el apoyo
    const raiz = Math.sqrt(A2 / A1);
    const K = Math.min(raiz, 2);
    const phiPnb1 = phiB * 0.85 * fc * (A1 * 1e4) / 1000;
    const phiPnb2 = phiPnb1 * K;
    return { A1, A2, A2sin, a2x, a2y, raiz, K, phiPnb1, phiPnb2, ok1: Pu <= phiPnb1, ok2: Pu <= phiPnb2, recortada: A2 < A2sin - 1e-9 };
  }

  function interpTabla(barra, fcM) {
    const fila = TABLA_421.filas[barra];
    if (!fila) return null;
    const xs = TABLA_421.fc;
    if (fcM <= xs[0]) return fila[0];
    if (fcM >= xs[xs.length - 1]) return fila[fila.length - 1];
    for (let i = 0; i < xs.length - 1; i++) {
      if (fcM >= xs[i] && fcM <= xs[i + 1]) {
        const t = (fcM - xs[i]) / (xs[i + 1] - xs[i]);
        return fila[i] + t * (fila[i + 1] - fila[i]);
      }
    }
    return null;
  }

  function desarrollo(inp, d) {
    const { fc, fy, lambda } = inp.materiales;
    const bar = BARS[inp.columna.barra];
    const fyM = fy * KGFCM2_A_MPA, fcM = fc * KGFCM2_A_MPA;
    const l1 = 0.24 * bar.db * fyM / (lambda * Math.sqrt(fcM));
    const l2 = 0.043 * bar.db * fyM;
    const ldc = Math.max(l1, l2, 200);
    const disponible = d * 1000; // h − r, como en el esquema del PDF (pág. 14)
    const tabla = Math.abs(fyM - 412) < 15 ? interpTabla(inp.columna.barra, fcM) : null;
    return { barra: inp.columna.barra, db: bar.db, fyM, fcM, l1, l2, ldc, disponible, tabla, ok: disponible >= ldc };
  }

  function calcular(inp) {
    const { Lx, Ly, d, r } = inp.zapata;
    const h = d + r;
    const serv = servicio(inp, Lx, Ly, d);
    const qadm = inp.suelo.qadm;
    const ex = serv.P > 0 ? serv.My / serv.P : 0;
    const ey = serv.P > 0 ? serv.Mx / serv.P : 0;
    let caso = 'A';
    if (Math.abs(serv.smin) < 1e-6) caso = 'B';
    else if (serv.smin < 0) caso = 'C';
    serv.ex = ex; serv.ey = ey; serv.caso = caso;
    serv.Areq = serv.P / qadm;
    serv.okMax = serv.smax <= qadm + 1e-9;
    serv.okMin = caso === 'A';

    const ult = ultimo(inp, Lx, Ly);
    const pz = punzonamiento(inp, Lx, Ly, d, ult.su);
    const cu = cortanteUnaDir(inp, Lx, Ly, d, ult.su);
    // Dirección X: barras paralelas a X, momento en la cara con voladizo (Lx−Cx)/2, ancho Ly.
    const fx = flexionDir(inp, Lx, inp.columna.Cx, Ly, d, ult.su);
    // Dirección Y: barras paralelas a Y, voladizo (Ly−Cy)/2, ancho Lx (el PDF usa Ly por error).
    const fyv = flexionDir(inp, Ly, inp.columna.Cy, Lx, d, ult.su);
    fyv.AfPdf = Ly * fyv.K;
    fyv.MuPdf = ult.su * fyv.AfPdf * fyv.K / 2;

    const opsX = opcionesAcero(fx.As, Ly, h, r);
    const opsY = opcionesAcero(fyv.As, Lx, h, r);
    const barX = inp.acero.barX && BARS[inp.acero.barX] ? inp.acero.barX : barraPorDefecto(opsX);
    const barY = inp.acero.barY && BARS[inp.acero.barY] ? inp.acero.barY : barraPorDefecto(opsY);
    const selX = opsX.find((o) => o.barra === barX);
    const selY = opsY.find((o) => o.barra === barY);

    const ap = aplastamiento(inp, Lx, Ly, h, ult.P);
    const ld = desarrollo(inp, d);

    const chequeos = [
      { id: 'serv', titulo: 'Esfuerzos sobre el suelo', ok: serv.okMax && serv.okMin,
        det: 'σmax ' + serv.smax.toFixed(2) + ' ≤ ' + qadm.toFixed(2) + ' · caso ' + caso },
      { id: 'pz', titulo: 'Cortante en dos direcciones', ok: pz.ok,
        det: 'Vu ' + pz.Vu.toFixed(2) + ' ≤ φVc ' + pz.phiVc.toFixed(2) },
      { id: 'cu', titulo: 'Cortante en una dirección', ok: cu.x.ok && cu.y.ok,
        det: 'X ' + cu.x.Vu.toFixed(2) + '/' + cu.x.phiVc.toFixed(2) + ' · Y ' + cu.y.Vu.toFixed(2) + '/' + cu.y.phiVc.toFixed(2) },
      { id: 'fl', titulo: 'Flexión', ok: fx.ok && fyv.ok && selX.estado !== 'mal' && selY.estado !== 'mal',
        det: 'X ' + selX.n + '#' + selX.barra + ' @ ' + selX.s.toFixed(2) + ' · Y ' + selY.n + '#' + selY.barra + ' @ ' + selY.s.toFixed(2) },
      { id: 'ap', titulo: 'Aplastamiento', ok: ap.ok1 && ap.ok2,
        det: 'Pu ' + ult.P.toFixed(2) + ' ≤ ' + Math.min(ap.phiPnb1, ap.phiPnb2).toFixed(2) },
      { id: 'ld', titulo: 'Longitud de desarrollo', ok: ld.ok && d >= D_MIN - 1e-9,
        det: 'ldc ' + (ld.ldc / 10).toFixed(1) + ' cm ≤ ' + (ld.disponible / 10).toFixed(1) + ' cm' },
    ];

    return {
      inp, Lx, Ly, d, r, h, serv, ult, pz, cu, fx, fy: fyv,
      acero: { opsX, opsY, barX, barY, selX, selY },
      ap, ld, dMinOk: d >= D_MIN - 1e-9, chequeos,
      todoOk: chequeos.every((c) => c.ok),
    };
  }

  // Busca Lx·Ly (pasos de 5 cm) que cumplan σmax ≤ qadm y σmin > 0 con área casi mínima.
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
    return candidatos
      .filter((c) => c.A <= Amin * 1.03 + 1e-9)
      .sort((a, b) => a.dif - b.dif || a.A - b.A)[0];
  }

  // Busca el d mínimo (pasos de 2.5 cm) que cumpla cortante, flexión, aplastamiento y ld.
  function optimizarPeralte(inp) {
    for (let d = D_MIN; d <= 2.0 + 1e-9; d += 0.025) {
      const prueba = clone(inp);
      prueba.zapata.d = +d.toFixed(3);
      const R = calcular(prueba);
      const ok = R.pz.ok && R.cu.x.ok && R.cu.y.ok && R.fx.ok && R.fy.ok && R.ld.ok && R.ap.ok1 && R.ap.ok2;
      if (ok) return prueba.zapata.d;
    }
    return null;
  }

  function validarContraPdf() {
    const R = calcular(clone(EJEMPLO));
    const mapa = {
      serv: R.serv, ult: R.ult, pz: R.pz, cx: R.cu.x, cy: R.cu.y, fx: R.fx, fy: R.fy, ap: R.ap,
    };
    return VALORES_PDF.map((t) => {
      const calc = get(mapa, t.k);
      const err = Math.abs(calc - t.v) / Math.abs(t.v);
      return Object.assign({}, t, { calc, err, ok: err <= 0.01 });
    });
  }

  global.Zapata = {
    BARS, TABLA_421, EJEMPLO, D_MIN, RHO_MIN,
    calcular, optimizarPlanta, optimizarPeralte, validarContraPdf, opcionesAcero, clone,
  };
})(window);

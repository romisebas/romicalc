/* Fórmulas de concreto reforzado comunes a todos los tipos de zapata (NSR-10, ACI 318 en inglés).
 * Unidades: fuerzas en tonf, longitudes en m, momentos en tonf·m, f'c y fy en kgf/cm²; longitudes de
 * desarrollo en mm. No toca el DOM.
 */
(function (global) {
  'use strict';

  const KGFCM2_A_MPA = 0.0980665;
  const BARS = () => global.Refuerzo.BARS;

  function beta1(fc) {
    const fcM = fc * KGFCM2_A_MPA;
    if (fcM <= 28) return 0.85;
    return Math.max(0.65, 0.85 - 0.05 * (fcM - 28) / 7);
  }

  // Coeficientes de la norma según el sistema de unidades (ver js/nucleo/unidades.js)
  function coef(unid) {
    return global.Unidades ? global.Unidades.coef(unid || 'curso') : { sistema: 'curso', eq: { pz1: 0.53, pz2: 0.27, pz3: 1.0, cu: 0.53 } };
  }

  // Resistencia a cortante en tonf: k·λ·√f'c·b·d con b, d en cm y f'c en kgf/cm².
  function vc(k, lambda, fc, b_m, d_m) {
    return k * lambda * Math.sqrt(fc) * (b_m * 100) * (d_m * 100) / 1000;
  }

  // Flexión de una sección rectangular de ancho b y altura útil d.
  // base 'bd': As mínimo = ρmin·b·d (como el curso); base 'bh': As mínimo = ρmin·b·h (NSR-10 C.7.12).
  function flexion(Mu, b, d, fc, fy, phiF, base, h) {
    const Rn = Mu * 1e5 / (phiF * (b * 100) * Math.pow(d * 100, 2)); // kgf/cm²
    const raiz = 1 - 2 * Rn / (0.85 * fc);
    const rhoCalc = raiz >= 0 ? (0.85 * fc / fy) * (1 - Math.sqrt(raiz)) : NaN;
    const b1 = beta1(fc);
    const rhoMax = 0.85 * b1 * (fc / fy) * (0.003 / (0.003 + 0.005));
    // NSR-10 C.7.12.2.1: 0.0018 para fy = 420 MPa; para fy mayor, 0.0018·420/fy ≥ 0.0014
    const rhoMin = fy > 4200 ? Math.max(0.0018 * 4200 / fy, 0.0014) : 0.0018;
    const conH = base === 'bh' && h > 0;
    const AsMin = rhoMin * (b * 100) * ((conH ? h : d) * 100);
    const AsCalc = isNaN(rhoCalc) ? Infinity : rhoCalc * (b * 100) * (d * 100);
    const As = Math.max(AsCalc, AsMin);
    const rho = As / ((b * 100) * (d * 100));
    const ok = raiz >= 0 && (conH ? rhoCalc <= rhoMax : rho <= rhoMax);
    return { Mu, b, d, Rn, raiz, rhoCalc, rhoMin, rhoMax, beta1: b1, rho, As, AsMin, base: conH ? 'bh' : 'bd', ok, gobiernaMin: !(AsCalc > AsMin) };
  }

  // Longitud de desarrollo a compresión de las dovelas (mm).
  function ldc(barra, fc, fy, lambda, unid) {
    const bar = BARS()[barra];
    const fyM = fy * KGFCM2_A_MPA, fcM = fc * KGFCM2_A_MPA;
    let l1, l2, lmin;
    if (unid === 'ingles') {
      // ACI 318 25.4.9.2 en psi y pulgadas: 0.02·fy·db/(λ√f'c) ≥ 0.0003·fy·db ≥ 8 in
      const aPsi = global.Unidades.a(1, 'esfuerzo', 'ingles');
      const fyP = fy * aPsi, fcP = fc * aPsi, dbIn = bar.db / 25.4;
      l1 = 0.02 * fyP * dbIn / (lambda * Math.sqrt(fcP)) * 25.4;
      l2 = 0.0003 * fyP * dbIn * 25.4;
      lmin = 8 * 25.4;
    } else {
      // NSR-10 C.12.3.2 en MPa y mm (el curso también la usa en MPa)
      l1 = 0.24 * bar.db * fyM / (lambda * Math.sqrt(fcM));
      l2 = 0.043 * bar.db * fyM;
      lmin = 200;
    }
    return { db: bar.db, fyM, fcM, l1, l2, lmin, ldc: Math.max(l1, l2, lmin) };
  }

  // Longitud de desarrollo a tracción, método simplificado (mm).
  // NSR-10 C.12.2.2: fy·ψt·ψe/(2.1λ√f'c)·db hasta #6 y /1.7 desde #7, ≥ 300 mm. ψt = 1.3 en barras superiores.
  function ldTraccion(barra, fc, fy, lambda, superior, unid) {
    const db = BARS()[barra].db, psiT = superior ? 1.3 : 1.0, chica = barra <= 6;
    if (unid === 'ingles') {
      // ACI 318 25.4.2.3: fy·ψt/(25λ√f'c)·db hasta #6 y /20 desde #7, ≥ 12 in
      const aPsi = global.Unidades.a(1, 'esfuerzo', 'ingles');
      return Math.max(fy * aPsi * psiT / ((chica ? 25 : 20) * lambda * Math.sqrt(fc * aPsi)) * db, 12 * 25.4);
    }
    const fyM = fy * KGFCM2_A_MPA, fcM = fc * KGFCM2_A_MPA;
    return Math.max(fyM * psiT / ((chica ? 2.1 : 1.7) * lambda * Math.sqrt(fcM)) * db, 300);
  }

  // Aplastamiento bajo una columna c1 × c2; A2x, A2y = lados del área de apoyo ya limitada a la zapata.
  function aplastamiento(c1, c2, A2x, A2y, fc, phiB, Pu) {
    const A1 = c1 * c2, A2 = A2x * A2y;
    const raiz = Math.sqrt(A2 / A1);
    const K = Math.min(raiz, 2);
    const phiPnb1 = phiB * 0.85 * fc * (A1 * 1e4) / 1000;
    const phiPnb2 = phiPnb1 * K;
    return { A1, A2, raiz, K, phiPnb1, phiPnb2, ok1: Pu <= phiPnb1, ok2: Pu <= phiPnb2, ok: Pu <= Math.max(phiPnb1, phiPnb2), util: Pu / Math.max(phiPnb1, phiPnb2) };
  }

  global.Concreto = { KGFCM2_A_MPA, beta1, coef, vc, flexion, ldc, ldTraccion, aplastamiento };
})(window);

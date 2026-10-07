/* Sistemas de unidades (v3.3).
 * El motor calcula siempre en tonf · m · kgf/cm² (el sistema del curso, validado contra el PDF).
 * Esta capa convierte para mostrar y capturar, y define los coeficientes de la norma que cambian
 * con el sistema: la NSR-10 en kgf/cm² (como el curso), la NSR-10 en MPa (SI) y el ACI 318 en psi (inglés).
 *
 * Cada magnitud se describe con un factor: valor mostrado = valor interno × f.
 */
(function (global) {
  'use strict';
  const G = 9.80665;          // kgf → N
  const LB = 0.45359237;      // lb → kg
  const PIE = 0.3048, PULG = 0.0254;
  const KIP_TONF = 1000 / LB / 1000;          // tonf (métrica) → kip = 2.20462
  const PSI_KGFCM2 = 1 / (LB / Math.pow(PULG * 100, 2)); // kgf/cm² → psi = 14.2233

  const SISTEMAS = {
    curso: {
      id: 'curso', nombre: 'Curso', detalle: 'tonf · m · kgf/cm²', norma: 'NSR-10, Título C (ecuaciones en kgf/cm², como el curso)',
      fuerza: ['tonf', 1, 2], momento: ['tonf·m', 1, 2], presion: ['tonf/m²', 1, 2], peso: ['tonf/m³', 1, 2],
      longitud: ['m', 1, 2], corto: ['cm', 100, 1], esfuerzo: ['kgf/cm²', 1, 0], acero: ['cm²', 1, 2],
      aceroM: ['cm²/m', 1, 2], ldmm: ['cm', 0.1, 1], area: ['m²', 1, 3], inercia: ['m⁴', 1, 3],
    },
    si: {
      id: 'si', nombre: 'Internacional (SI)', detalle: 'kN · m · MPa', norma: 'NSR-10, Título C (ecuaciones en MPa)',
      fuerza: ['kN', G, 1], momento: ['kN·m', G, 1], presion: ['kPa', G, 1], peso: ['kN/m³', G, 2],
      longitud: ['m', 1, 2], corto: ['mm', 1000, 0], esfuerzo: ['MPa', G / 100, 1], acero: ['mm²', 100, 0],
      aceroM: ['mm²/m', 100, 0], ldmm: ['mm', 1, 0], area: ['m²', 1, 3], inercia: ['m⁴', 1, 3],
    },
    ingles: {
      id: 'ingles', nombre: 'Inglés', detalle: 'kip · ft · psi', norma: 'ACI 318 (ecuaciones en psi, equivalentes a la NSR-10 Título C)',
      fuerza: ['kip', KIP_TONF, 2], momento: ['kip·ft', KIP_TONF / PIE, 2], presion: ['ksf', KIP_TONF * PIE * PIE, 3],
      peso: ['pcf', KIP_TONF * 1000 * Math.pow(PIE, 3), 1], longitud: ['ft', 1 / PIE, 2], corto: ['in', 1 / PULG, 2],
      esfuerzo: ['psi', PSI_KGFCM2, 0], acero: ['in²', 1 / Math.pow(PULG * 100, 2), 2],
      aceroM: ['in²/ft', PIE / Math.pow(PULG * 100, 2), 3], ldmm: ['in', 1 / 25.4, 1], area: ['ft²', 1 / (PIE * PIE), 2],
      inercia: ['ft⁴', 1 / Math.pow(PIE, 4), 2],
    },
  };

  // Coeficientes de cortante: V_c = k·λ·√f'c·b·d en las unidades propias de cada sistema.
  // "eq" es el mismo coeficiente expresado en kgf/cm² (con b, d en cm), que es como calcula el motor.
  const A_KGF = {
    curso: 1,
    si: Math.sqrt(G / 100) * 100 / G,                     // MPa, mm, N  → kgf/cm², cm, kgf
    ingles: Math.sqrt(PSI_KGFCM2) * LB / Math.pow(PULG * 100, 2), // psi, in, lb → kgf/cm², cm, kgf
  };
  const COEF = {
    // pz1·(1 + 2/β), pz2·(αs·d/bo + 2), pz3, cu (una dirección)
    curso: { pz1: 0.53, pz2: 0.27, pz3: 1.0, cu: 0.53, ec: ['C.11-31', 'C.11-32', 'C.11-33', 'C.11-3'] },
    si: { pz1: 0.17, pz2: 0.083, pz3: 0.33, cu: 0.17, ec: ['C.11-31', 'C.11-32', 'C.11-33', 'C.11-3'] },
    ingles: { pz1: 2, pz2: 1, pz3: 4, cu: 2, ec: ['22.6.5.2(b)', '22.6.5.2(c)', '22.6.5.2(a)', '22.5.5.1'] },
  };

  let actual = 'curso';
  const sis = (id) => SISTEMAS[id || actual] || SISTEMAS.curso;

  function usar(id) { actual = SISTEMAS[id] ? id : 'curso'; return actual; }
  function a(x, mag, id) { return x == null || x === '' ? x : x * sis(id)[mag][1]; }    // interno → mostrado
  function de(x, mag, id) { return x == null || x === '' ? x : x / sis(id)[mag][1]; }   // mostrado → interno
  function u(mag, id) { return sis(id)[mag][0]; }
  function dec(mag, id) { return sis(id)[mag][2]; }
  function num(x, mag, id, d) { return Number(a(x, mag, id)).toFixed(d == null ? dec(mag, id) : d); }
  function fmt(x, mag, id, d) { return num(x, mag, id, d) + ' ' + u(mag, id); }
  // Unidad en LaTeX para la memoria
  function tex(mag, id) {
    const t = u(mag, id).replace('·', '\\cdot ').replace('²', '^2').replace('³', '^3').replace('⁴', '^4');
    return '\\,\\text{' + t.replace(/\\cdot /g, '}\\cdot\\text{').replace(/\^(\d)/g, '}^$1\\text{') + '}';
  }
  function coef(id) {
    const s = id || actual, c = COEF[s] || COEF.curso, k = A_KGF[s] || 1;
    return Object.assign({ sistema: s, eq: { pz1: c.pz1 * k, pz2: c.pz2 * k, pz3: c.pz3 * k, cu: c.cu * k } }, c);
  }

  global.Unidades = { SISTEMAS, usar, actual: () => actual, a, de, u, dec, num, fmt, tex, coef, sis };
})(window);

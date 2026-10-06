/* Núcleo compartido: catálogo de refuerzo (barras corrugadas y mallas electrosoldadas)
 * y selección de alternativas. Lo usan todos los tipos de zapata.
 */
(function (global) {
  'use strict';

  // Barras corrugadas, designación en octavos de pulgada (NSR-10 Tabla C.3.5.3-2). db en mm, A en cm².
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

  // Mallas electrosoldadas Diaco, ficha técnica NTC 5806 (V1.2026). Panel 6.00 × 2.35 m.
  // dL/dT: diámetro longitudinal/transversal (mm); sL/sT: separación (mm); peso por panel (kg).
  const MALLAS = [
    ['XX-050', 'E-050', 4, 4, 250, 250, 11.5],
    ['XX-063', 'M-063', 4, 4, 200, 200, 14.1],
    ['XX-084', 'M-084', 4, 4, 150, 150, 18.8],
    ['XX-106', 'M-106', 4.5, 4.5, 150, 150, 23.8],
    ['XX-131', 'M-131', 5, 5, 150, 150, 29.3],
    ['XX-158', 'M-158', 5.5, 5.5, 150, 150, 35.5],
    ['XX-188', 'M-188', 6, 6, 150, 150, 42.2],
    ['XX-221', 'M-221', 6.5, 6.5, 150, 150, 49.6],
    ['XX-257', 'M-257', 7, 7, 150, 150, 57.4],
    ['XX-295', 'M-295', 7.5, 7.5, 150, 150, 65.9],
    ['XX-335', 'M-335', 8, 8, 150, 150, 75.1],
    ['XX-378', 'M-378', 8.5, 8.5, 150, 150, 84.7],
    ['XY-084', 'H-084', 4, 4, 150, 250, 15.1],
    ['XY-106', 'H-106', 4.5, 4, 150, 250, 17.6],
    ['XY-131', 'H-131', 5, 4, 150, 250, 20.4],
    ['XY-158', 'H-158', 5.5, 4, 150, 250, 23.5],
    ['XY-221', 'H-221', 6.5, 4, 150, 250, 30.6],
    ['XY-257', 'H-257', 7, 5, 150, 250, 37.7],
    ['XY-335', 'H-335', 8, 5, 150, 250, 46.6],
    ['XY-378', 'H-378', 8.5, 5, 150, 250, 51.5],
  ].map(([ref, alt, dL, dT, sL, sT, peso]) => ({
    ref, alt, dL, dT, sL, sT, peso,
    dosDir: ref.startsWith('XX'),
    // Cuantía por metro lineal (cm²/m) = área del alambre / separación
    asL: Math.PI * dL * dL / 4 / sL * 10,
    asT: Math.PI * dT * dT / 4 / sT * 10,
  }));
  const PANEL = { largo: 6.0, ancho: 2.35 };
  const FY_MALLA_REAL = 4945; // 485 MPa en kgf/cm²

  // Alternativas de barras #2–#10 para un ancho b (m) y As requerido (cm²).
  function opcionesBarras(As, b, h, r) {
    const W = b - 2 * r; // distancia entre ejes de las barras extremas
    const smax = Math.min(3 * h, 0.45);
    return Object.keys(BARS).map(Number).map((n) => {
      const bar = BARS[n];
      const nAs = Math.ceil(As / bar.A - 1e-9);
      const nSmax = Math.ceil(W / smax - 1e-9) + 1;
      const nReq = Math.max(nAs, nSmax, 2);
      const s = Math.floor(W / (nReq - 1) * 100 + 1e-9) / 100; // redondeo hacia abajo al cm
      const nReal = s > 0 ? Math.floor(W / s + 1e-9) + 1 : nReq;
      const AsProv = nReal * bar.A;
      const libre = s - bar.db / 1000;
      const libreMin = Math.max(0.025, bar.db / 1000);
      let estado = 'ok', motivo = 'Cumple';
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

  // Alternativas de malla. reqX/reqY en cm²/m (acero paralelo a X / a Y).
  // En mallas XY los alambres principales se orientan hacia la dirección más exigida.
  function opcionesMallas(reqX, reqY, capasPref, smax, Lx, Ly) {
    const traslapo = Math.min(Lx, Ly) > PANEL.ancho + 1e-9 || Math.max(Lx, Ly) > PANEL.largo + 1e-9;
    return MALLAS.map((m) => {
      const principalEnX = m.dosDir ? true : reqX >= reqY;
      const provX1 = principalEnX ? m.asL : m.asT;
      const provY1 = principalEnX ? m.asT : m.asL;
      const sX = principalEnX ? m.sL : m.sT; // separación de los alambres paralelos a X
      const sY = principalEnX ? m.sT : m.sL;
      const cumpleCon = (n) => provX1 * n >= reqX - 1e-9 && provY1 * n >= reqY - 1e-9;
      let capas;
      if (capasPref === 1 || capasPref === 2) capas = capasPref;
      else capas = cumpleCon(1) ? 1 : 2;
      const provX = provX1 * capas, provY = provY1 * capas;
      const ratio = Math.min(provX / reqX, provY / reqY);
      let estado = 'ok', motivo = capas === 1 ? 'Cumple con 1 capa' : 'Cumple con 2 capas';
      if (!cumpleCon(capas)) {
        estado = 'mal';
        motivo = 'Falta ' + (Math.max(reqX - provX, reqY - provY)).toFixed(2) + ' cm²/m';
      } else if (Math.max(sX, sY) / 1000 > smax + 1e-9) { estado = 'mal'; motivo = 's > smax'; }
      return Object.assign({}, m, { principalEnX, capas, provX, provY, sX, sY, ratio, estado, motivo, traslapo, pesoTotal: m.peso * capas });
    });
  }

  function mallaPorDefecto(ops) {
    const buenas = ops.filter((o) => o.estado === 'ok');
    if (buenas.length) return buenas.reduce((a, b) => (b.pesoTotal < a.pesoTotal ? b : a)).ref;
    return ops.reduce((a, b) => (b.ratio > a.ratio ? b : a)).ref; // la que más se acerca
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

  global.Refuerzo = {
    BARS, TABLA_421, MALLAS, PANEL, FY_MALLA_REAL,
    opcionesBarras, barraPorDefecto, opcionesMallas, mallaPorDefecto, interpTabla,
  };
})(window);

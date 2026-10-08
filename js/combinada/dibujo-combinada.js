/* Dibujos de la zapata combinada (beta 1.2): miniatura de la carga, alzado con diagramas, planta, cortes,
 * despiece y figuras de la memoria. Todo en SVG; las cotas y valores se escriben con Unidades.
 */
(function (global) {
  'use strict';

  const f2 = (x) => Number(x).toFixed(2);

  // Tono de la presión: azul hasta σadm, rojo por encima (misma escala que la planta de la aislada)
  function tono(s, q) {
    if (s > q || s <= 0) return '#a3392c';
    return 'rgb(' + [223, 232, 243].map((b, i) => Math.round(b + ([66, 97, 136][i] - b) * Math.pow(Math.min(1, s / q), 2.4))).join(',') + ')';
  }

  // Planta simplificada para la pantalla de carga (mismas clases que la de la aislada)
  function miniCarga(R) {
    const U = global.Unidades, W = 300, H = 230, M = 44;
    const k = Math.min((W - 2 * M) / R.L, (H - 2 * M) / R.B);
    const w = R.L * k, h = R.B * k, x0 = (W - w) / 2, y0 = (H - h) / 2, q = R.inp.suelo.qadm;
    const col = (c) => '<rect class="cg-columna" x="' + f2(x0 + (c.x - c.c1 / 2) * k) + '" y="' + f2(y0 + (R.B - c.c2) / 2 * k) + '" width="' + f2(c.c1 * k) + '" height="' + f2(c.c2 * k) + '"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Planta del proyecto">' +
      '<defs><linearGradient id="cg-grad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + tono(R.serv.sin.smax, q) + '"/><stop offset="1" stop-color="' + tono(R.serv.sin.smin, q) + '"/></linearGradient></defs>' +
      '<rect class="cg-presion" x="' + f2(x0) + '" y="' + f2(y0) + '" width="' + f2(w) + '" height="' + f2(h) + '" fill="url(#cg-grad)"/>' +
      '<rect class="cg-contorno" pathLength="1" x="' + f2(x0) + '" y="' + f2(y0) + '" width="' + f2(w) + '" height="' + f2(h) + '"/>' +
      '<g class="cg-cotas"><path d="M' + f2(x0) + ' ' + f2(y0 + h + 18) + 'H' + f2(x0 + w) + 'M' + f2(x0 + w + 18) + ' ' + f2(y0) + 'V' + f2(y0 + h) + '"/>' +
      '<text x="' + f2(x0 + w / 2) + '" y="' + f2(y0 + h + 34) + '" text-anchor="middle">L = ' + U.fmt(R.L, 'longitud') + '</text>' +
      '<text x="' + f2(x0 + w + 30) + '" y="' + f2(y0 + h / 2) + '" transform="rotate(-90 ' + f2(x0 + w + 30) + ' ' + f2(y0 + h / 2) + ')" text-anchor="middle">B = ' + U.fmt(R.B, 'longitud') + '</text></g>' +
      R.cols.map(col).join('') + '</svg>';
  }

  // Miniatura de la lista de recientes
  function miniatura(R) {
    const k = 40 / Math.max(R.L, R.B), w = R.L * k, h = R.B * k, x0 = 24 - w / 2, y0 = 24 - h / 2;
    return '<svg class="rc-mini" viewBox="0 0 48 48" aria-hidden="true"><rect class="rc-zap" x="' + f2(x0) + '" y="' + f2(y0) + '" width="' + f2(w) + '" height="' + f2(h) + '"/>' +
      R.cols.map((c) => '<rect class="rc-col" x="' + f2(x0 + (c.x - c.c1 / 2) * k) + '" y="' + f2(24 - c.c2 * k / 2) + '" width="' + f2(c.c1 * k) + '" height="' + f2(c.c2 * k) + '"/>').join('') + '</svg>';
  }

  // ---------------------------------------------------------------- lienzo de la mesa
  // Alzado de la zapata con las columnas arrastrables, la presión última y los diagramas V y M,
  // todos sobre el mismo eje x. esc = { Xmax } fija la escala (se congela mientras se arrastra).
  const LZ = { W: 1000, H: 720, ML: 70, MR: 40, yCol: 60, yZap: 150, hZap: 36, yQ: 270, hQ: 40, yV: 440, yM: 612, hD: 58 };

  function geometria(e, R) {
    const g = e.geometria, c = e.columnas;
    const num = (x, def) => (x === null || x === undefined || x === '' || !isFinite(x) ? def : Number(x));
    const c1e = num(c[0].c1, 0.4), c1i = num(c[1].c1, 0.4), a = num(g.a, 0), s = num(g.s, 4);
    const x1 = a + c1e / 2, x2 = x1 + s;
    return { a, s, c1e, c1i, x1, x2, L: R ? R.L : x2 + c1i / 2 + 0.5, cols: [{ x: x1, c1: c1e }, { x: x2, c1: c1i }] };
  }

  function escalaLienzo(e, R) {
    const G = geometria(e, R);
    return { Xmax: Math.max(G.L, G.x2 + G.c1i / 2) * 1.06 + 0.2 };
  }

  function lienzo(e, R, esc) {
    const U = global.Unidades, G = geometria(e, R), { W, H, ML, yCol, yZap, hZap, yQ, hQ, yV, yM, hD } = LZ;
    const k = (W - ML - LZ.MR) / esc.Xmax, X = (x) => f2(ML + x * k);
    const p = [];
    // Lindero y suelo
    p.push('<line class="mesa-lindero" x1="' + X(0) + '" y1="' + (yCol - 30) + '" x2="' + X(0) + '" y2="' + (yZap + hZap + 26) + '"/>' +
      '<text class="mesa-etq" x="' + f2(ML - 8) + '" y="' + (yCol - 16) + '" text-anchor="end">Lindero</text>');
    p.push('<rect class="mesa-zap' + (R ? '' : ' provisional') + '" x="' + X(0) + '" y="' + yZap + '" width="' + f2(G.L * k) + '" height="' + hZap + '"/>');
    // Columnas: piezas que se arrastran (role=slider)
    G.cols.forEach((c, i) => {
      const val = i === 0 ? G.a : G.s;
      p.push('<g class="mesa-col" data-i="' + i + '" tabindex="0" role="slider" aria-label="' + (i ? 'Separación de la columna interior' : 'Voladizo de la columna exterior') + '"' +
        ' aria-valuenow="' + f2(val) + '" aria-valuemin="' + (i ? f2((G.c1e + G.c1i) / 2 + 0.05) : '0') + '" aria-valuemax="30" aria-valuetext="' + U.fmt(val, 'longitud') + '">' +
        '<rect class="mesa-col-cuerpo" x="' + X(c.x - c.c1 / 2) + '" y="' + yCol + '" width="' + f2(Math.max(c.c1 * k, 10)) + '" height="' + (yZap - yCol) + '" rx="2"/>' +
        '<path class="mesa-col-agarre" d="M' + f2(ML + c.x * k - 4) + ' ' + (yCol + 30) + 'v30M' + f2(ML + c.x * k + 4) + ' ' + (yCol + 30) + 'v30"/>' +
        '<path class="mesa-flecha" d="M' + X(c.x) + ' ' + (yCol - 34) + 'V' + (yCol - 4) + 'M' + f2(ML + c.x * k - 6) + ' ' + (yCol - 12) + 'l6 8 6-8"/></g>');
    });
    // Cotas de a y s
    const cota = (x0, x1, y, txt) => '<g class="mesa-cota"><path d="M' + X(x0) + ' ' + y + 'H' + X(x1) + 'M' + X(x0) + ' ' + (y - 5) + 'v10M' + X(x1) + ' ' + (y - 5) + 'v10"/>' +
      '<text x="' + f2(ML + (x0 + x1) / 2 * k) + '" y="' + (y - 6) + '" text-anchor="middle">' + txt + '</text></g>';
    p.push(cota(G.x1, G.x2, yZap - 14, 's = ' + U.fmt(G.s, 'longitud')));
    if (!R) return envolver(p, k, esc);

    // Centroide x̄ y largo L
    p.push('<g class="mesa-xbar" data-x="' + R.xbar.toFixed(4) + '"><path d="M' + X(R.xbar) + ' ' + (yZap + hZap + 4) + 'l-7 11h14z"/>' +
      '<text x="' + X(R.xbar) + '" y="' + (yZap + hZap + 30) + '" text-anchor="middle">x̄ = ' + U.fmt(R.xbar, 'longitud') + '</text></g>');
    p.push(cota(0, R.L, yZap + hZap + 50, 'L = ' + U.fmt(R.L, 'longitud')));

    // Presión última (hacia arriba)
    const qmax = Math.max(R.q.q1, R.q.q2, 1e-9), hq = (q) => hQ * q / qmax;
    p.push('<g id="mesa-diag-q" class="mesa-diag"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yQ - 12) + '">Presión última del suelo</text>' +
      '<polygon class="mesa-q" points="' + X(0) + ',' + yQ + ' ' + X(R.L) + ',' + yQ + ' ' + X(R.L) + ',' + f2(yQ + hq(R.q.q2)) + ' ' + X(0) + ',' + f2(yQ + hq(R.q.q1)) + '"/>' +
      [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => '<path class="mesa-q-flecha" d="M' + X(t * R.L) + ' ' + f2(yQ + hq(R.q.q1 + (R.q.q2 - R.q.q1) * t) - 2) + 'V' + (yQ + 4) + 'm-4 6l4-6 4 6"/>').join('') +
      '<text class="mesa-val" x="' + f2(ML + 4) + '" y="' + f2(yQ + hq(R.q.q1) + 14) + '">' + U.fmt(R.q.q1, 'presion') + '</text>' +
      '<text class="mesa-val" x="' + X(R.L) + '" y="' + f2(yQ + hq(R.q.q2) + 14) + '" text-anchor="end">' + U.fmt(R.q.q2, 'presion') + '</text>' +
      zona(X(0), yQ - 24, R.L * k, hQ + 30) + '</g>');

    // Diagramas V y M (M negativo hacia arriba, como en el documento)
    const xs = R.lon.xs, pts = (vals, y0, esc2) => xs.map((x, j) => X(x) + ',' + f2(y0 - vals[j] * esc2)).join(' ');
    const Vmax = Math.max.apply(null, R.lon.V.map(Math.abs)) || 1, Mmax = Math.max.apply(null, R.lon.M.map(Math.abs)) || 1;
    const kV = hD / Vmax, kM = hD / Mmax;
    const pp = R.lon.puntos;
    const etqV = (x, v, dy) => '<text class="mesa-val" x="' + X(x) + '" y="' + f2(yV - v * kV + dy) + '" text-anchor="middle">' + U.num(v, 'fuerza') + '</text>';
    p.push('<g id="mesa-diag-V" class="mesa-diag"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yV - hD - 18) + '">Cortante V (' + U.u('fuerza') + ')</text>' +
      '<line class="mesa-eje" x1="' + X(0) + '" y1="' + yV + '" x2="' + X(R.L) + '" y2="' + yV + '"/>' +
      '<polygon class="mesa-area diagrama-v" points="' + X(0) + ',' + yV + ' ' + pts(R.lon.V, yV, kV) + ' ' + X(R.L) + ',' + yV + '"/>' +
      '<polyline class="mesa-linea" points="' + pts(R.lon.V, yV, kV) + '"/>' +
      etqV(pp.ext.x, pp.ext.Vizq, -6) + etqV(pp.ext.x, pp.ext.Vder, 14) + etqV(pp.int.x, pp.int.Vizq, -6) + etqV(pp.int.x, pp.int.Vder, 14) +
      (pp.V0 !== null ? '<g class="mesa-v0"><circle cx="' + X(pp.V0) + '" cy="' + yV + '" r="4"/><text x="' + X(pp.V0) + '" y="' + (yV + 18) + '" text-anchor="middle">V = 0</text></g>' : '') +
      zona(X(0), yV - hD - 6, R.L * k, 2 * hD + 12) + '</g>');
    const ld = R.ld.sup / 1000;
    p.push('<g id="mesa-diag-M" class="mesa-diag"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yM - hD - 18) + '">Momento M (' + U.u('momento') + ')</text>' +
      '<line class="mesa-eje" x1="' + X(0) + '" y1="' + yM + '" x2="' + X(R.L) + '" y2="' + yM + '"/>' +
      '<polygon class="mesa-area diagrama-m" points="' + X(0) + ',' + yM + ' ' + pts(R.lon.M.map((m) => -m), yM, kM) + ' ' + X(R.L) + ',' + yM + '"/>' +
      '<polyline class="mesa-linea" points="' + pts(R.lon.M.map((m) => -m), yM, kM) + '"/>' +
      '<text class="mesa-val" x="' + X(R.lon.Mneg.x || 0) + '" y="' + f2(yM + R.lon.Mneg.M * kM - 8) + '" text-anchor="middle">' + U.num(R.lon.Mneg.M, 'momento') + '</text>' +
      R.lon.Mpos.map((m) => '<text class="mesa-val" x="' + X(m.x) + '" y="' + f2(yM + m.M * kM + 16) + '" text-anchor="middle">' + U.num(m.M, 'momento') + '</text>').join('') +
      pp.PI.map((x, j) => {
        const x2 = j === 0 ? Math.max(0, x - ld) : Math.min(R.L, x + ld);
        return '<g class="mesa-pi"><line x1="' + X(x) + '" y1="' + (yM - hD) + '" x2="' + X(x) + '" y2="' + (yM + hD) + '"/>' +
          '<text x="' + X(x) + '" y="' + (yM + hD + 14) + '" text-anchor="middle">PI</text>' +
          '<path class="mesa-ld" d="M' + X(x) + ' ' + (yM + hD + 24) + 'H' + X(x2) + '"/>' +
          '<text x="' + f2(ML + (x + x2) / 2 * k) + '" y="' + (yM + hD + 40) + '" text-anchor="middle">ld</text></g>';
      }).join('') +
      zona(X(0), yM - hD - 6, R.L * k, 2 * hD + 12) + '</g>');
    p.push('<line id="mesa-lector" class="mesa-lector" x1="0" y1="' + (yCol - 30) + '" x2="0" y2="' + (H - 10) + '" visibility="hidden"/>');
    return envolver(p, k, esc);
  }

  function zona(x, y, w, h) { return '<rect class="mesa-zona" x="' + x + '" y="' + y + '" width="' + f2(w) + '" height="' + h + '"/>'; }

  function envolver(p, k, esc) {
    return '<svg id="mesa-svg" class="mesa-svg" viewBox="0 0 ' + LZ.W + ' ' + LZ.H + '" data-k="' + k + '" data-ml="' + LZ.ML + '" data-xmax="' + esc.Xmax + '" role="img" aria-label="Alzado de la zapata combinada con diagramas de cortante y momento">' +
      p.join('') + '</svg>';
  }

  global.DibujoCombinada = { tono, miniCarga, miniatura, lienzo, escalaLienzo, geometria, LZ };
})(window);

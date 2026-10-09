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

  // op.diagramas = false: solo el alzado con el centroide y L (paso de ubicación del asistente)
  function lienzo(e, R, esc, op) {
    const conDiagramas = !op || op.diagramas !== false;
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
    if (!R) return envolver(p, k, esc, conDiagramas ? null : yZap + hZap + 64);

    // Centroide x̄ y largo L
    p.push('<g class="mesa-xbar" data-x="' + R.xbar.toFixed(4) + '"><path d="M' + X(R.xbar) + ' ' + (yZap + hZap + 4) + 'l-7 11h14z"/>' +
      '<text x="' + X(R.xbar) + '" y="' + (yZap + hZap + 30) + '" text-anchor="middle">x̄ = ' + U.fmt(R.xbar, 'longitud') + '</text></g>');
    p.push(cota(0, R.L, yZap + hZap + 50, 'L = ' + U.fmt(R.L, 'longitud')));
    if (!conDiagramas) return envolver(p, k, esc, yZap + hZap + 64);

    // Presión última (hacia arriba)
    const qmax = Math.max(R.q.q1, R.q.q2, 1e-9), hq = (q) => hQ * q / qmax;
    p.push('<g class="mesa-diag diag-q"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yQ - 12) + '">Presión última del suelo</text>' +
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
    p.push('<g class="mesa-diag diag-V"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yV - hD - 18) + '">Cortante V (' + U.u('fuerza') + ')</text>' +
      '<line class="mesa-eje" x1="' + X(0) + '" y1="' + yV + '" x2="' + X(R.L) + '" y2="' + yV + '"/>' +
      '<polygon class="mesa-area diagrama-v" points="' + X(0) + ',' + yV + ' ' + pts(R.lon.V, yV, kV) + ' ' + X(R.L) + ',' + yV + '"/>' +
      '<polyline class="mesa-linea" points="' + pts(R.lon.V, yV, kV) + '"/>' +
      etqV(pp.ext.x, pp.ext.Vizq, -6) + etqV(pp.ext.x, pp.ext.Vder, 14) + etqV(pp.int.x, pp.int.Vizq, -6) + etqV(pp.int.x, pp.int.Vder, 14) +
      (pp.V0 !== null ? '<g class="mesa-v0"><circle cx="' + X(pp.V0) + '" cy="' + yV + '" r="4"/><text x="' + X(pp.V0) + '" y="' + (yV + 18) + '" text-anchor="middle">V = 0</text></g>' : '') +
      zona(X(0), yV - hD - 6, R.L * k, 2 * hD + 12) + '</g>');
    const ld = R.ld.sup / 1000;
    p.push('<g class="mesa-diag diag-M"><text class="mesa-tit-diag" x="' + ML + '" y="' + (yM - hD - 18) + '">Momento M (' + U.u('momento') + ')</text>' +
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
    p.push('<line class="mesa-lector" x1="0" y1="' + (yCol - 30) + '" x2="0" y2="' + (H - 10) + '" visibility="hidden"/>');
    return envolver(p, k, esc);
  }

  function zona(x, y, w, h) { return '<rect class="mesa-zona" x="' + x + '" y="' + y + '" width="' + f2(w) + '" height="' + h + '"/>'; }

  function envolver(p, k, esc, alto) {
    return '<svg class="mesa-svg" viewBox="0 0 ' + LZ.W + ' ' + (alto || LZ.H) + '" data-k="' + k + '" data-ml="' + LZ.ML + '" data-xmax="' + esc.Xmax + '" role="img" aria-label="Alzado de la zapata combinada con diagramas de cortante y momento">' +
      p.join('') + '</svg>';
  }

  // ---------------------------------------------------------------- planos
  // Presión de servicio del caso que gobierna: σ(x) = P/(L·B) + g·(x − L/2)
  function servicioLineal(R) {
    const s = R.serv.caso === 'con' ? R.serv.con : R.serv.sin;
    const p = s.P / (R.L * R.B), g = 12 * s.P * (s.xr - R.L / 2) / (R.B * Math.pow(R.L, 3));
    return { p, g, lim: s.lim, en: (x) => p + g * (x - R.L / 2) };
  }

  const flechaCota = (x0, y0, x1, y1) => '<path class="punta" d="M' + f2(x0) + ' ' + f2(y0) + 'L' + f2(x1) + ' ' + f2(y1) + '"/>';
  function cotaH(x0, x1, y, txt, cls) {
    return '<g class="cota ' + (cls || '') + '"><path d="M' + f2(x0) + ' ' + f2(y) + 'H' + f2(x1) + 'M' + f2(x0) + ' ' + f2(y - 6) + 'v12M' + f2(x1) + ' ' + f2(y - 6) + 'v12"/>' +
      flechaCota(x0 + 7, y - 3, x0, y) + flechaCota(x0 + 7, y + 3, x0, y) + flechaCota(x1 - 7, y - 3, x1, y) + flechaCota(x1 - 7, y + 3, x1, y) +
      '<text class="halo" x="' + f2((x0 + x1) / 2) + '" y="' + f2(y - 7) + '" text-anchor="middle">' + txt + '</text></g>';
  }
  function cotaV(x, y0, y1, txt) {
    return '<g class="cota"><path d="M' + f2(x) + ' ' + f2(y0) + 'V' + f2(y1) + 'M' + f2(x - 6) + ' ' + f2(y0) + 'h12M' + f2(x - 6) + ' ' + f2(y1) + 'h12"/>' +
      '<text class="halo" x="' + f2(x + 10) + '" y="' + f2((y0 + y1) / 2 + 4) + '">' + txt + '</text></g>';
  }

  function planta(R, pre) {
    const U = global.Unidades, W = 760, k = (W - 150) / R.L, H = R.B * k + 150, x0 = 50, y0 = 60;
    const X = (x) => x0 + x * k, Y = (y) => y0 + y * k, sv = servicioLineal(R), id = (pre || 'pc') + '-grad';
    const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => '<stop offset="' + t + '" stop-color="' + tono(sv.en(t * R.L), sv.lim) + '"/>').join('');
    const p = [];
    p.push('<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0">' + stops + '</linearGradient>' +
      '<pattern id="' + (pre || 'pc') + '-rayas" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" class="rayado"/></pattern></defs>');
    p.push('<rect class="zap-presion" x="' + f2(X(0)) + '" y="' + f2(Y(0)) + '" width="' + f2(R.L * k) + '" height="' + f2(R.B * k) + '" fill="url(#' + id + ')"/>');
    R.tr.forEach((t, i) => {
      p.push('<g class="franja"><rect x="' + f2(X(t.x0)) + '" y="' + f2(Y(0)) + '" width="' + f2(t.b * k) + '" height="' + f2(R.B * k) + '" fill="url(#' + (pre || 'pc') + '-rayas)"/>' +
        '<text class="halo" x="' + f2(X((t.x0 + t.x1) / 2)) + '" y="' + f2(Y(R.B) - 8) + '" text-anchor="middle">Franja ' + (i ? 'int.' : 'ext.') + ' b = ' + U.fmt(t.b, 'longitud') + '</text></g>');
    });
    p.push('<rect class="zap-contorno" x="' + f2(X(0)) + '" y="' + f2(Y(0)) + '" width="' + f2(R.L * k) + '" height="' + f2(R.B * k) + '"/>');
    R.cols.forEach((c) => p.push('<rect class="col-planta" x="' + f2(X(c.x - c.c1 / 2)) + '" y="' + f2(Y((R.B - c.c2) / 2)) + '" width="' + f2(c.c1 * k) + '" height="' + f2(c.c2 * k) + '"/>'));
    p.push('<g class="xbar-planta"><path d="M' + f2(X(R.xbar)) + ' ' + f2(Y(R.B) + 6) + 'l-6 10h12z"/><text x="' + f2(X(R.xbar)) + '" y="' + f2(Y(R.B) + 30) + '" text-anchor="middle">x̄ = ' + U.fmt(R.xbar, 'longitud') + '</text></g>');
    p.push(cotaH(X(R.cols[0].x), X(R.cols[1].x), y0 - 22, 's = ' + U.fmt(R.cols[1].x - R.cols[0].x, 'longitud')));
    if (R.inp.geometria.a > 0) p.push(cotaH(X(0), X(R.inp.geometria.a), y0 - 22, 'a = ' + U.fmt(R.inp.geometria.a, 'longitud')));
    p.push(cotaH(X(0), X(R.L), Y(R.B) + 56, 'L = ' + U.fmt(R.L, 'longitud')));
    p.push(cotaV(X(R.L) + 22, Y(0), Y(R.B), 'B = ' + U.fmt(R.B, 'longitud')));
    p.push('<text class="pildora-txt" x="' + f2(X(0)) + '" y="' + f2(Y(0) - 8) + '">σ = ' + U.fmt(sv.en(0), 'presion') + '</text>' +
      '<text class="pildora-txt" x="' + f2(X(R.L)) + '" y="' + f2(Y(0) - 8) + '" text-anchor="end">σ = ' + U.fmt(sv.en(R.L), 'presion') + '</text>');
    return '<svg class="dibujo plano-comb" viewBox="0 0 ' + W + ' ' + f2(H) + '" role="img" aria-label="Planta de la zapata combinada"' +
      ' data-cx="' + f2(X(R.L / 2)) + '" data-cy="' + f2(Y(R.B / 2)) + '" data-k="' + k + '" data-lx="' + R.L + '" data-ly="' + R.B + '"' +
      ' data-p="' + sv.p + '" data-gx="' + sv.g + '" data-gy="0" data-qadm="' + sv.lim + '">' + p.join('') + '</svg>';
  }

  // Corte longitudinal: armado superior (cortado en PI ± ld) e inferior, columnas con dovelas
  function corteLongitudinal(R) {
    const U = global.Unidades, W = 760, k = (W - 150) / R.L, x0 = 50, yS = 90, h = R.h, r = R.inp.zapata.r;
    const X = (x) => x0 + x * k, Y = (y) => yS + (h - y) * k, H = Y(0) + 110, sv = servicioLineal(R);
    const L1 = R.despiece.marcas.find((m) => m.marca === 'L1'), PI = R.lon.puntos.PI, { xa, xb } = R.supMin;
    const gancho = 0.25 * h * k;
    const p = [];
    p.push('<rect class="zap-corte" x="' + f2(X(0)) + '" y="' + f2(Y(h)) + '" width="' + f2(R.L * k) + '" height="' + f2(h * k) + '"/>');
    R.cols.forEach((c) => {
      p.push('<rect class="col-corte" x="' + f2(X(c.x - c.c1 / 2)) + '" y="' + f2(Y(h) - 70) + '" width="' + f2(c.c1 * k) + '" height="70"/>');
      p.push('<path class="dovela" d="M' + f2(X(c.x - c.c1 / 2) + 6) + ' ' + f2(Y(h) - 66) + 'V' + f2(Y(r) - 2) + 'h-14M' + f2(X(c.x + c.c1 / 2) - 6) + ' ' + f2(Y(h) - 66) + 'V' + f2(Y(r) - 2) + 'h14"/>');
    });
    const ySup = Y(h - r), yInf = Y(r);
    p.push('<path class="acero-sup" d="M' + f2(X(xa)) + ' ' + f2(ySup + (L1.ganchos && xa <= r + 1e-9 ? gancho : 0)) + 'V' + f2(ySup) + 'H' + f2(X(xb)) + (xb >= R.L - r - 1e-9 ? 'v' + f2(gancho) : '') + '"/>');
    // L3 y L4: cuantía mínima en los extremos, un poco más abajo para que se vea el empalme con L1
    R.supMin.tramos.forEach((t) => {
      const y = ySup + 5, ext = t.x0 <= r + 1e-9;
      p.push('<path class="acero-min" d="M' + f2(X(ext ? t.x0 : t.x1)) + ' ' + f2(y + gancho) + 'V' + f2(y) + 'H' + f2(X(ext ? t.x1 : t.x0)) + '"/>' +
        '<text class="halo etq-acero" x="' + f2(X((t.x0 + t.x1) / 2)) + '" y="' + f2(y + 18) + '" text-anchor="middle">' + t.marca + '</text>');
    });
    p.push('<path class="acero-inf" d="M' + f2(X(r)) + ' ' + f2(yInf - gancho) + 'V' + f2(yInf) + 'H' + f2(X(R.L - r)) + 'v' + f2(-gancho) + '"/>');
    p.push('<text class="halo etq-acero" x="' + f2(X((xa + xb) / 2)) + '" y="' + f2(ySup - 8) + '" text-anchor="middle">L1 · ' + R.fl.sup.sel.resumen + '</text>');
    p.push('<text class="halo etq-acero" x="' + f2(X(R.L / 2)) + '" y="' + f2(Y(0) + 18) + '" text-anchor="middle">L2 · ' + R.fl.inf.sel.resumen + '</text>');
    PI.forEach((x) => p.push('<path class="pi-corte" d="M' + f2(X(x)) + ' ' + f2(Y(h) - 14) + 'V' + f2(Y(0) + 4) + '"/><text class="pi-txt" x="' + f2(X(x)) + '" y="' + f2(Y(h) - 18) + '" text-anchor="middle">PI</text>'));
    p.push(cotaH(X(0), X(R.L), Y(0) + 48, 'L = ' + U.fmt(R.L, 'longitud')));
    p.push(cotaV(X(R.L) + 22, Y(h), Y(0), 'h = ' + U.fmt(h, 'longitud')));
    p.push(cotaV(X(R.L) - 70, Y(h), Y(r), 'd = ' + U.fmt(R.d, 'longitud')));
    return '<svg class="dibujo corte-comb" viewBox="0 0 ' + W + ' ' + f2(H) + '" role="img" aria-label="Corte longitudinal" data-modo="corte"' +
      ' data-cx="' + f2(X(R.L / 2)) + '" data-k="' + k + '" data-l="' + R.L + '" data-izq="' + sv.en(0) + '" data-der="' + sv.en(R.L) + '" data-qadm="' + sv.lim + '">' + p.join('') + '</svg>';
  }

  // Corte transversal bajo la columna i: parrilla de su franja
  function corteTransversal(R, i) {
    const U = global.Unidades, t = R.tr[i], c = R.cols[i], W = 520, k = (W - 150) / R.B, x0 = 60, yS = 110, h = R.h, r = R.inp.zapata.r;
    const X = (x) => x0 + x * k, Y = (y) => yS + (h - y) * k, H = Y(0) + 96, sv = servicioLineal(R), sig = sv.en(c.x);
    const gancho = 0.25 * h * k, nSup = R.fl.sup.sel.n, nInf = R.fl.inf.sel.n;
    const p = [];
    p.push('<rect class="zap-corte" x="' + f2(X(0)) + '" y="' + f2(Y(h)) + '" width="' + f2(R.B * k) + '" height="' + f2(h * k) + '"/>');
    p.push('<rect class="col-corte" x="' + f2(X((R.B - c.c2) / 2)) + '" y="' + f2(Y(h) - 70) + '" width="' + f2(c.c2 * k) + '" height="70"/>');
    p.push('<path class="acero-trans" d="M' + f2(X(r)) + ' ' + f2(Y(r) - gancho) + 'V' + f2(Y(r)) + 'H' + f2(X(R.B - r)) + 'v' + f2(-gancho) + '"/>');
    p.push('<path class="acero-min" d="M' + f2(X(r)) + ' ' + f2(Y(h - r) + 5 + gancho) + 'V' + f2(Y(h - r) + 5) + 'H' + f2(X(R.B - r)) + 'v' + f2(gancho) + '"/>');
    const puntos = (n, y, cls) => { let s = ''; for (let j = 0; j < n; j++) s += '<circle class="' + cls + '" cx="' + f2(X(r + (R.B - 2 * r) * (n > 1 ? j / (n - 1) : 0.5))) + '" cy="' + f2(y) + '" r="2.6"/>'; return s; };
    p.push(puntos(nSup, Y(h - r), 'acero-sup-punto') + puntos(nInf, Y(r) - 5, 'acero-inf-punto'));
    p.push('<text class="halo etq-acero" x="' + f2(X(R.B / 2)) + '" y="' + f2(Y(0) + 18) + '" text-anchor="middle">T' + (i + 1) + ' · ' + t.sel.resumen + '</text>');
    p.push(cotaH(X(0), X(R.B), Y(0) + 46, 'B = ' + U.fmt(R.B, 'longitud')));
    p.push(cotaH(X((R.B - c.c2) / 2 + c.c2), X(R.B), Y(h) - 84, 'Lv = ' + U.fmt(t.Lv, 'longitud')));
    return '<svg class="dibujo corte-comb" viewBox="0 0 ' + W + ' ' + f2(H) + '" role="img" aria-label="Corte transversal bajo la columna ' + (i ? 'interior' : 'exterior') + '" data-modo="corte"' +
      ' data-cx="' + f2(X(R.B / 2)) + '" data-k="' + k + '" data-l="' + R.B + '" data-izq="' + sig + '" data-der="' + sig + '" data-qadm="' + sv.lim + '">' + p.join('') + '</svg>';
  }

  // ---------------------------------------------------------------- figuras de la memoria
  const FW = 560;
  const escalaFig = (R) => (FW - 100) / R.L;

  // ---------------------------------------------------------------- figuras de la memoria, en dibujo técnico (js/nucleo/svg-tecnico.js)
  // Son las del PDF y el respaldo del mini-3D: a escala, en una tinta y gris, con achurados y cotas.
  const T = () => global.SvgTec;
  const sufijo = (ult) => (ult ? 'u' : 's');

  // Zapata con las cargas de las columnas y el centroide (ult = cargas mayoradas)
  function figCargas(R, ult) {
    const t = T(), U = global.Unidades, k = escalaFig(R), x0 = 50, X = (x) => x0 + x * k, H = 276;
    const hz = Math.max(R.h * k, 18), yBot = 168, yTop = yBot - hz, colTop = yTop - 64;
    let s = t.suelo(X(0) - 20, X(R.L) + 20, yBot) + t.concreto(X(0), yTop, R.L * k, hz);
    R.cols.forEach((c) => {
      s += t.columna(X(c.x - c.c1 / 2), colTop, Math.max(c.c1 * k, 8), yTop - colTop) + t.eje(X(c.x), colTop - 10, X(c.x), yBot + 8);
      s += t.flecha(X(c.x), 26, X(c.x), colTop - 6, { grosor: 2 }) + t.txt(X(c.x) + (c.i ? -8 : 8), 20, ['P', sufijo(ult), ' = ' + U.fmt(ult ? c.Pu : c.Ps, 'fuerza')], { anc: c.i ? 'end' : 'start' });
    });
    s += '<g class="fig-xbar"><path d="M' + f2(X(R.xbar)) + ' ' + (yBot + 12) + 'l-6 10h12z" fill="' + t.TINTA + '"/>' +
      t.txt(X(R.xbar), yBot + 36, 'x̄ = ' + U.fmt(R.xbar, 'longitud') + ' (centroide de cargas)', { anc: 'middle', tam: 11 }) + '</g>';
    s += t.cota(X(0), yBot + 52, X(R.L), yBot + 52, 'L = ' + U.fmt(R.L, 'longitud')).replace('class="cota', 'class="cota zapata-cota');
    s += t.cota(X(R.L) + 14, yTop, X(R.L) + 14, yBot, 'h = ' + U.fmt(R.h, 'longitud'));
    s += t.pie(FW, H - 8, ult ? 'Cargas mayoradas de las columnas' : 'Cargas de servicio de las columnas');
    return t.svg(FW, H, s, 'Cargas sobre la zapata');
  }

  // Viga invertida: cargas de columna hacia abajo y presión del suelo hacia arriba
  function figPresion(R) {
    const t = T(), U = global.Unidades, k = escalaFig(R), x0 = 50, X = (x) => x0 + x * k, H = 230;
    const hz = Math.max(R.h * k * 0.6, 16), yTop = 80, yBot = yTop + hz, wmax = Math.max(R.q.q1, R.q.q2), hq = (q) => 58 * q / wmax;
    let s = t.concreto(X(0), yTop, R.L * k, hz);
    R.cols.forEach((c) => {
      s += '<rect class="columna" x="' + f2(X(c.x - c.c1 / 2)) + '" y="' + (yTop - 22) + '" width="' + f2(Math.max(c.c1 * k, 8)) + '" height="22" fill="url(#st-columna)" stroke="' + t.TINTA + '" stroke-width="1.4"/>';
      s += t.flecha(X(c.x), 18, X(c.x), yTop - 26, { grosor: 2 }) + t.txt(X(c.x) + (c.i ? -8 : 8), 14, ['P', 'u', ' = ' + U.fmt(c.Pu, 'fuerza')], { anc: c.i ? 'end' : 'start', tam: 11 });
    });
    const y0 = yBot + 4;
    s += '<polygon class="fig-presion" points="' + f2(X(0)) + ',' + y0 + ' ' + f2(X(R.L)) + ',' + y0 + ' ' + f2(X(R.L)) + ',' + f2(y0 + hq(R.q.q2)) + ' ' + f2(X(0)) + ',' + f2(y0 + hq(R.q.q1)) + '" fill="url(#st-suelo)" stroke="' + t.TINTA + '" stroke-width="1.4"/>';
    for (let j = 1; j < 12; j++) {
      const x = R.L * j / 12, q = R.q.q1 + (R.q.q2 - R.q.q1) * j / 12;
      s += '<g class="fig-presion-f">' + t.flecha(X(x), y0 + hq(q), X(x), y0 + 2, { grosor: 1, punta: 6 }) + '</g>';
    }
    s += t.txt(X(0), y0 + hq(R.q.q1) + 16, ['q', 'u1', ' = ' + U.fmt(R.q.q1, 'presion')], { tam: 11 }) +
      t.txt(X(R.L), y0 + hq(R.q.q2) + 16, ['q', 'u2', ' = ' + U.fmt(R.q.q2, 'presion')], { anc: 'end', tam: 11 });
    s += t.pie(FW, H - 8, 'Viga invertida: las columnas cargan y el suelo reacciona con presión lineal');
    return t.svg(FW, H, s, 'Viga invertida con la presión última');
  }

  // Diagramas de cortante y momento con los puntos de inflexión y ld
  function figVM(R) {
    const t = T(), U = global.Unidades, k = escalaFig(R), x0 = 50, X = (x) => x0 + x * k, yV = 116, yM = 270, h = 52;
    const Vmax = Math.max.apply(null, R.lon.V.map(Math.abs)) || 1, Mmax = Math.max.apply(null, R.lon.M.map(Math.abs)) || 1;
    const pts = (vals, y0, e) => R.lon.xs.map((x, j) => f2(X(x)) + ',' + f2(y0 - vals[j] * e)).join(' ');
    const pp = R.lon.puntos, ld = R.ld.sup / 1000, H = yM + h + 44;
    // la zapata arriba, como referencia de dónde están las columnas
    let s = t.concreto(X(0), 22, R.L * k, 10);
    R.cols.forEach((c) => { s += '<rect class="columna" x="' + f2(X(c.x - c.c1 / 2)) + '" y="10" width="' + f2(Math.max(c.c1 * k, 6)) + '" height="12" fill="url(#st-columna)" stroke="' + t.TINTA + '" stroke-width="1"/>'; });
    s += t.txt(x0 - 6, yV - h - 4, ['V', 'u', ' (' + U.u('fuerza') + ')'], { tam: 11, peso: 600 }) +
      '<line class="fig-eje" x1="' + f2(X(0)) + '" y1="' + yV + '" x2="' + f2(X(R.L)) + '" y2="' + yV + '" stroke="' + t.TINTA + '" stroke-width="1"/>' +
      '<polygon class="diagrama-v diagrama" points="' + f2(X(0)) + ',' + yV + ' ' + pts(R.lon.V, yV, h / Vmax) + ' ' + f2(X(R.L)) + ',' + yV + '" fill="#e6e6e6" stroke="' + t.TINTA + '" stroke-width="1.6"/>';
    [[pp.ext.x, pp.ext.Vizq, -5], [pp.ext.x, pp.ext.Vder, 13], [pp.int.x, pp.int.Vizq, -5], [pp.int.x, pp.int.Vder, 13]].forEach(([x, v, dy]) => {
      s += t.txt(X(x), yV - v * h / Vmax + dy, U.num(v, 'fuerza'), { anc: 'middle', tam: 10.5, fondo: true });
    });
    s += t.txt(x0 - 6, yM - h - 10, ['M', 'u', ' (' + U.u('momento') + ')'], { tam: 11, peso: 600 }) +
      '<line class="fig-eje" x1="' + f2(X(0)) + '" y1="' + yM + '" x2="' + f2(X(R.L)) + '" y2="' + yM + '" stroke="' + t.TINTA + '" stroke-width="1"/>' +
      '<polygon class="diagrama-m diagrama" points="' + f2(X(0)) + ',' + yM + ' ' + pts(R.lon.M.map((m) => -m), yM, h / Mmax) + ' ' + f2(X(R.L)) + ',' + yM + '" fill="url(#st-suelo)" stroke="' + t.TINTA + '" stroke-width="1.6"/>' +
      t.txt(X(R.lon.Mneg.x || 0), yM + R.lon.Mneg.M * h / Mmax - 6, U.num(R.lon.Mneg.M, 'momento'), { anc: 'middle', tam: 10.5, fondo: true }) +
      R.lon.Mpos.map((m) => t.txt(X(m.x), yM + m.M * h / Mmax + 14, U.num(m.M, 'momento'), { anc: 'middle', tam: 10.5, fondo: true })).join('');
    pp.PI.forEach((x, j) => {
      const x2 = j === 0 ? Math.max(0, x - ld) : Math.min(R.L, x + ld);
      s += '<line class="fig-pi" x1="' + f2(X(x)) + '" y1="' + (yM - h) + '" x2="' + f2(X(x)) + '" y2="' + (yM + h) + '" stroke="' + t.TINTA + '" stroke-width="1" stroke-dasharray="10 3 2 3"/>' +
        t.txt(X(x), yM + h + 14, 'PI', { anc: 'middle', tam: 10.5, peso: 600 }) +
        '<g class="cota ld"><line class="fig-ld" x1="' + f2(X(x)) + '" y1="' + (yM + h + 24) + '" x2="' + f2(X(x2)) + '" y2="' + (yM + h + 24) + '" stroke="' + t.TINTA + '" stroke-width="3" stroke-linecap="round"/>' +
        t.txt((X(x) + X(x2)) / 2, yM + h + 38, ['l', 'd', ''], { anc: 'middle', tam: 10.5 }) + '</g>';
    });
    return t.svg(FW, H, s, 'Diagramas de cortante y momento');
  }

  // Perímetro crítico de punzonamiento alrededor de la columna i (en planta); la exterior tiene 3 lados
  function figPunz(R, i) {
    const t = T(), U = global.Unidades, c = R.cols[i], pz = R.pz[i], d = R.d;
    const ventana = Math.min(R.L, c.c1 + 2 * d + 1.2), xi = Math.max(0, Math.min(R.L - ventana, c.x - ventana / 2));
    const k = 300 / Math.max(ventana, R.B), x0 = 90, y0 = 40, X = (x) => x0 + (x - xi) * k, Y = (y) => y0 + y * k;
    const oL = c.x - c.c1 / 2, izq = c.x - c.c1 / 2 - Math.min(oL, d / 2);
    const px = X(izq), py = Y((R.B - pz.dy) / 2), pw = pz.dx * k, ph = pz.dy * k, Wf = 480, H = R.B * k + 110;
    let s = '<rect class="zapata" x="' + f2(X(Math.max(0, xi))) + '" y="' + f2(Y(0)) + '" width="' + f2((Math.min(R.L, xi + ventana) - Math.max(0, xi)) * k) + '" height="' + f2(R.B * k) + '" fill="#f7f6f3" stroke="' + t.TINTA + '" stroke-width="1.6"/>';
    s += '<rect class="area" x="' + f2(px) + '" y="' + f2(py) + '" width="' + f2(pw) + '" height="' + f2(ph) + '" fill="url(#st-suelo)" fill-opacity="0.6" stroke="none"/>';
    // perímetro crítico: con 3 lados, el lado del borde de la zapata no cuenta
    const lados = pz.lados === 3 ? 'M' + f2(px) + ' ' + f2(py) + 'H' + f2(px + pw) + 'V' + f2(py + ph) + 'H' + f2(px) : 'M' + f2(px) + ' ' + f2(py) + 'h' + f2(pw) + 'v' + f2(ph) + 'h' + f2(-pw) + 'Z';
    s += '<path class="perimetro" d="' + lados + '" fill="none" stroke="' + t.TINTA + '" stroke-width="2" stroke-dasharray="8 4"/>';
    s += '<rect class="columna" x="' + f2(X(c.x - c.c1 / 2)) + '" y="' + f2(Y((R.B - c.c2) / 2)) + '" width="' + f2(c.c1 * k) + '" height="' + f2(c.c2 * k) + '" fill="url(#st-columna)" stroke="' + t.TINTA + '" stroke-width="1.6"/>';
    s += t.eje(X(c.x), Y(0) - 8, X(c.x), Y(R.B) + 8) + t.eje(X(Math.max(0, xi)) - 8, Y(R.B / 2), X(Math.min(R.L, xi + ventana)) + 8, Y(R.B / 2));
    s += t.cota(px, py - 14, px + pw, py - 14, 'b1 = ' + U.fmt(pz.dx, 'longitud'), { arriba: true });
    s += t.cota(px + pw + 16, py, px + pw + 16, py + ph, 'b2 = ' + U.fmt(pz.dy, 'longitud'));
    s += t.txt(px + pw / 2, Y(R.B) + 24, ['b', 'o', ' = ' + U.fmt(pz.bo, 'longitud') + ' (' + pz.lados + ' lados)'], { anc: 'middle' });
    s += t.pie(Wf, H - 10, 'Columna ' + (i ? 'interior' : 'exterior') + ': perímetro crítico a d/2 de sus caras');
    return t.svg(Wf, H, s, 'Perímetro crítico de punzonamiento');
  }

  global.DibujoCombinada = { tono, miniCarga, miniatura, lienzo, escalaLienzo, geometria, LZ, planta, corteLongitudinal, corteTransversal, servicioLineal,
    figCargas, figPresion, figVM, figPunz };
})(window);

/* Dibujos 2D en SVG: planta con capas y cortes. Compartido por las zapatas aisladas.
 * Coordenadas de cálculo en metros con origen en el centro de la zapata, Y hacia arriba.
 * Los colores salen de clases CSS para que respeten el tema claro/oscuro.
 */
(function (global) {
  'use strict';

  const f2 = (x) => Number(x).toFixed(2);
  // Números y unidades del sistema activo (curso, SI o inglés)
  const UD = () => global.Unidades;
  const nL = (x) => UD().num(x, 'longitud'), uL = (x) => UD().fmt(x, 'longitud');
  const nP = (x) => UD().num(x, 'presion'), uP = () => UD().u('presion');

  // Posiciones (x, y) de las barras longitudinales de la columna, en su perímetro.
  function barrasColumna(Cx, Cy, nBarras, rec) {
    const n = Math.max(4, nBarras - (nBarras % 2));
    const ax = Cx / 2 - rec, ay = Cy / 2 - rec;
    const pts = [[ax, ay], [-ax, ay], [-ax, -ay], [ax, -ay]];
    const extra = (n - 4) / 2;
    const kx = Math.round(extra * Cx / (Cx + Cy));
    const ky = extra - kx;
    for (let i = 1; i <= kx; i++) { const x = -ax + (2 * ax) * i / (kx + 1); pts.push([x, ay], [x, -ay]); }
    for (let i = 1; i <= ky; i++) { const y = -ay + (2 * ay) * i / (ky + 1); pts.push([ax, y], [-ax, y]); }
    return pts;
  }

  // Posiciones de los elementos de una capa a lo largo de un ancho b, centradas.
  function posicionesParrilla(b, r, capa) {
    const W = b - 2 * r;
    const usado = (capa.n - 1) * capa.s;
    const ini = -W / 2 + (W - usado) / 2;
    const out = [];
    for (let i = 0; i < capa.n; i++) out.push(ini + i * capa.s);
    return out;
  }

  // Describe las dos capas de refuerzo (barras o malla) de forma común para los dibujos.
  // X = elementos paralelos a X (repartidos en Ly); Y = paralelos a Y (repartidos en Lx).
  function refuerzoDibujo(R) {
    const rf = R.ref;
    if (rf.tipo === 'malla') {
      const m = rf.sel;
      const W = (b) => b - 2 * R.r;
      const capa = (b, smm, dmm) => ({ n: Math.floor(W(b) / (smm / 1000) + 1e-9) + 1, s: smm / 1000, db: dmm, mal: m.estado === 'mal' });
      const dX = m.principalEnX ? m.dL : m.dT, dY = m.principalEnX ? m.dT : m.dL;
      const X = capa(R.Ly, m.sX, dX), Y = capa(R.Lx, m.sY, dY);
      X.etq = Y.etq = (m.capas > 1 ? '2 × ' : '') + m.ref;
      return { malla: true, capas: m.capas, X, Y, etq: 'Malla ' + (m.capas > 1 ? '2 × ' : '') + m.ref + ' (' + m.alt + ')' };
    }
    const cap = (s) => ({ n: s.n, s: s.s, db: s.db, mal: s.estado === 'mal', etq: s.n + ' #' + s.barra + ' @ ' + uL(s.s) });
    const X = cap(rf.selX), Y = cap(rf.selY);
    return { malla: false, capas: 1, X, Y, etq: X.etq + ' en X, ' + Y.etq + ' en Y' };
  }

  function cota(x1, y1, x2, y2, texto, lado, cls) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    // Flechas en los extremos, apuntando hacia afuera de la cota
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const punta = (x, y, a) => {
      const l = 7, w = 2.6, c = Math.cos(a), s = Math.sin(a);
      return '<path class="punta" d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'L' + (x - l * c - w * s).toFixed(1) + ' ' + (y - l * s + w * c).toFixed(1) +
        'L' + (x - l * c + w * s).toFixed(1) + ' ' + (y - l * s - w * c).toFixed(1) + 'Z"/>';
    };
    const tick = (x, y) => (x === x1 && y === y1 ? punta(x, y, ang + Math.PI) : punta(x, y, ang));
    const tx = horiz ? mx : mx + lado;
    const ty = horiz ? my + lado : my;
    const rot = horiz ? '' : ' transform="rotate(-90 ' + tx + ' ' + ty + ')"';
    return '<g class="cota ' + (cls || '') + '"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
      tick(x1, y1) + tick(x2, y2) +
      '<text class="halo" x="' + tx + '" y="' + ty + '" text-anchor="middle" dominant-baseline="middle"' + rot + '>' + texto + '</text></g>';
  }

  function defs(id) {
    return '<defs>' +
      '<pattern id="' + id + '-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="hatch-line"/></pattern>' +
      '<pattern id="' + id + '-hatch-mal" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" class="hatch-line mal"/></pattern>' +
      '<pattern id="' + id + '-suelo" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="10" class="suelo-line"/></pattern>' +
      '</defs>';
  }

  // Color de presión según σ/σadm: de azul muy claro a azul crepúsculo; rojo si excede o si hay tensión.
  const BAJO = [223, 232, 243], ALTO = [66, 97, 136];
  function colorPresion(sigma, qadm) {
    if (sigma > qadm + 1e-9 || sigma <= 0) return 'var(--mal)';
    const k = Math.pow(Math.max(0, Math.min(1, sigma / qadm)), 2.4);
    return 'rgb(' + BAJO.map((b, i) => Math.round(b + (ALTO[i] - b) * k)).join(',') + ')';
  }
  function paradaPresion(offset, sigma, qadm) {
    return '<stop offset="' + offset.toFixed(4) + '" style="stop-color:' + colorPresion(sigma, qadm) + '"/>';
  }

  // Segmento de la recta gx·x + gy·y = c dentro del rectángulo |x| ≤ a, |y| ≤ b (para las isóbaras)
  function recortar(gx, gy, c, a, b) {
    const pts = [];
    if (Math.abs(gy) > 1e-12) [-a, a].forEach((x) => { const y = (c - gx * x) / gy; if (Math.abs(y) <= b + 1e-9) pts.push([x, y]); });
    if (Math.abs(gx) > 1e-12) [-b, b].forEach((y) => { const x = (c - gy * y) / gx; if (Math.abs(x) <= a + 1e-9) pts.push([x, y]); });
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
  }

  // ---------------------------------------------------------------- Planta
  // prefijo: distingue los id internos (gradientes, tramas) cuando hay varias plantas en la página
  function planta(R, capa, prefijo) {
    const W = 700, H = 540, M = 78;
    const { Lx, Ly, d, r } = R;
    const { Cx, Cy } = R.inp.columna;
    const k = Math.min((W - 2 * M) / Lx, (H - 2 * M) / Ly);
    const X = (x) => W / 2 + x * k;
    const Y = (y) => H / 2 - y * k;
    const rect = (x1, y1, x2, y2, cls, extra) =>
      '<rect x="' + X(Math.min(x1, x2)) + '" y="' + Y(Math.max(y1, y2)) + '" width="' + Math.abs(x2 - x1) * k + '" height="' + Math.abs(y2 - y1) * k + '" class="' + cls + '"' + (extra || '') + '/>';
    const id = (prefijo || 'pl') + '-' + capa;
    const sv0 = R.serv;
    // Datos para la lectura interactiva de σ (planta-interactiva.js)
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dibujo planta" role="img" aria-label="Planta de la zapata, capa ' + capa + '"' +
      ' data-cx="' + W / 2 + '" data-cy="' + H / 2 + '" data-k="' + k + '" data-lx="' + Lx + '" data-ly="' + Ly + '"' +
      ' data-p="' + sv0.p + '" data-gx="' + sv0.gx + '" data-gy="' + sv0.gy + '" data-qadm="' + R.inp.suelo.qadm + '">' + defs(id);

    // Campo lineal de presiones: un solo gradiente lineal es exacto
    const sv = R.serv;
    const gn = Math.hypot(sv.gx, sv.gy);
    const u = gn > 1e-12 ? [sv.gx / gn, sv.gy / gn] : [1, 0];
    const t = Math.abs(u[0]) * Lx / 2 + Math.abs(u[1]) * Ly / 2;
    const qadm = R.inp.suelo.qadm;
    // Varias paradas: así el paso a rojo (σ > σadm) queda en su sitio exacto
    let paradas = '';
    for (let i = 0; i <= 16; i++) { const f = i / 16; paradas += paradaPresion(f, sv.smin + (sv.smax - sv.smin) * f, qadm); }
    s += '<defs><linearGradient id="' + id + '-grad" gradientUnits="userSpaceOnUse" x1="' + X(-u[0] * t) + '" y1="' + Y(-u[1] * t) + '" x2="' + X(u[0] * t) + '" y2="' + Y(u[1] * t) + '">' +
      paradas + '</linearGradient>' +
      '<linearGradient id="' + id + '-escala" x1="0" y1="1" x2="0" y2="0">' +
      [0, 0.25, 0.5, 0.75, 1].map((f) => paradaPresion(f, Math.max(1e-6, f * Math.max(qadm, sv.smax)), qadm)).join('') + '</linearGradient></defs>';

    s += rect(-Lx / 2, -Ly / 2, Lx / 2, Ly / 2, 'zapata', capa === 'presion' ? ' style="fill:url(#' + id + '-grad)"' : '');

    // Isóbaras: rectas de igual presión (el campo es lineal), con su valor
    if (capa === 'presion' && gn > 1e-9 && sv.smax - sv.smin > 1e-6) {
      for (let i = 1; i <= 4; i++) {
        const v = sv.smin + (sv.smax - sv.smin) * i / 5;
        const seg = recortar(sv.gx, sv.gy, v - sv.p, Lx / 2, Ly / 2);
        if (!seg) continue;
        const [a, b] = seg;
        s += '<g class="isobara"><line x1="' + X(a[0]) + '" y1="' + Y(a[1]) + '" x2="' + X(b[0]) + '" y2="' + Y(b[1]) + '"/>' +
          '<text class="halo" x="' + ((X(a[0]) + X(b[0])) / 2) + '" y="' + ((Y(a[1]) + Y(b[1])) / 2 - 5) + '" text-anchor="middle">' + nP(v) + '</text></g>';
      }
    }

    if (capa === 'punz') {
      const mal = !R.pz.ok;
      const hx = (Cx + d) / 2, hy = (Cy + d) / 2;
      s += '<path class="area' + (mal ? ' mal' : '') + '" fill-rule="evenodd" style="fill:url(#' + id + (mal ? '-hatch-mal' : '-hatch') + ')" d="' +
        'M' + X(-Lx / 2) + ' ' + Y(Ly / 2) + 'H' + X(Lx / 2) + 'V' + Y(-Ly / 2) + 'H' + X(-Lx / 2) + 'Z ' +
        'M' + X(-hx) + ' ' + Y(hy) + 'H' + X(hx) + 'V' + Y(-hy) + 'H' + X(-hx) + 'Z"/>';
      s += rect(-hx, -hy, hx, hy, 'perimetro' + (mal ? ' mal' : ''));
      s += '<text class="etq-area" x="' + X(-Lx / 2) + '" y="' + (Y(Ly / 2) - 12) + '">A2D = ' + UD().fmt(R.pz.A2D, 'area') + ', bo = ' + uL(R.pz.bo) + '</text>';
      s += cota(X(-hx), Y(-hy) + 22, X(hx), Y(-hy) + 22, 'Cx + d = ' + nL(Cx + d), 12, 'interna');
      s += cota(X(hx) + 22, Y(hy), X(hx) + 22, Y(-hy), 'Cy + d = ' + nL(Cy + d), 12, 'interna');
    }

    if (capa === 'cortante') {
      const ax = R.cu.x, ay = R.cu.y;
      if (ax.k > 0) s += rect(Cx / 2 + d, -Ly / 2, Lx / 2, Ly / 2, 'area' + (ax.ok ? '' : ' mal'), ' style="fill:url(#' + id + (ax.ok ? '-hatch' : '-hatch-mal') + ')"');
      if (ay.k > 0) s += rect(-Lx / 2, Cy / 2 + d, Lx / 2, Ly / 2, 'area' + (ay.ok ? '' : ' mal'), ' style="fill:url(#' + id + (ay.ok ? '-hatch' : '-hatch-mal') + ')"');
      s += '<line class="seccion" x1="' + X(Cx / 2 + d) + '" y1="' + Y(Ly / 2) + '" x2="' + X(Cx / 2 + d) + '" y2="' + Y(-Ly / 2) + '"/>';
      s += '<line class="seccion" x1="' + X(-Lx / 2) + '" y1="' + Y(Cy / 2 + d) + '" x2="' + X(Lx / 2) + '" y2="' + Y(Cy / 2 + d) + '"/>';
      s += cota(X(Cx / 2), Y(0), X(Cx / 2 + d), Y(0), 'd', -10, 'interna');
      if (ax.k > 0) s += '<text class="etq-area" text-anchor="middle" x="' + X((Cx / 2 + d + Lx / 2) / 2) + '" y="' + Y(-Ly / 4) + '">Ax = ' + UD().fmt(ax.A, 'area') + '</text>';
      if (ay.k > 0) s += '<text class="etq-area" text-anchor="middle" x="' + X(-Lx / 4) + '" y="' + Y((Cy / 2 + d + Ly / 2) / 2) + '">Ay = ' + UD().fmt(ay.A, 'area') + '</text>';
    }

    if (capa === 'flexion') {
      s += rect(Cx / 2, -Ly / 2, Lx / 2, Ly / 2, 'area', ' style="fill:url(#' + id + '-hatch)"');
      s += rect(-Lx / 2, Cy / 2, Lx / 2, Ly / 2, 'area alt', ' style="fill:url(#' + id + '-hatch)"');
      s += '<text class="etq-area" text-anchor="middle" x="' + X((Cx / 2 + Lx / 2) / 2) + '" y="' + Y(-Ly / 4) + '">Mux = ' + UD().fmt(R.fx.Mu, 'momento') + '</text>';
      s += '<text class="etq-area" text-anchor="middle" x="' + X(-Lx / 4) + '" y="' + Y((Cy / 2 + Ly / 2) / 2) + '">Muy = ' + UD().fmt(R.fy.Mu, 'momento') + '</text>';
      s += cota(X(Cx / 2), Y(-Ly / 2) - 14, X(Lx / 2), Y(-Ly / 2) - 14, 'Kx = ' + nL(R.fx.K), -10, 'interna');
      s += cota(X(-Lx / 2) + 14, Y(Ly / 2), X(-Lx / 2) + 14, Y(Cy / 2), 'Ky = ' + nL(R.fy.K), 12, 'interna');
    }

    if (capa === 'acero') {
      const rd = refuerzoDibujo(R);
      const grosor = (db) => Math.max(rd.malla ? 0.9 : 1.2, db / 1000 * k);
      posicionesParrilla(Ly, r, rd.X).forEach((y) => {
        s += '<line class="barra' + (rd.X.mal ? ' mal' : '') + '" x1="' + X(-Lx / 2 + r) + '" y1="' + Y(y) + '" x2="' + X(Lx / 2 - r) + '" y2="' + Y(y) + '" style="stroke-width:' + grosor(rd.X.db) + '"/>';
      });
      posicionesParrilla(Lx, r, rd.Y).forEach((x) => {
        s += '<line class="barra' + (rd.Y.mal ? ' mal' : '') + '" x1="' + X(x) + '" y1="' + Y(-Ly / 2 + r) + '" x2="' + X(x) + '" y2="' + Y(Ly / 2 - r) + '" style="stroke-width:' + grosor(rd.Y.db) + '"/>';
      });
      s += '<text class="etq-acero" x="' + (W - 18) + '" y="24" text-anchor="end">' + rd.etq + '</text>';
      const ys = posicionesParrilla(Ly, r, rd.X), xs = posicionesParrilla(Lx, r, rd.Y);
      if (ys.length > 1) s += cota(X(-Lx / 2) - 22, Y(ys[ys.length - 1]), X(-Lx / 2) - 22, Y(ys[ys.length - 2]), 's = ' + nL(rd.X.s), -12, 'interna');
      if (xs.length > 1) s += cota(X(xs[0]), Y(-Ly / 2) + 20, X(xs[1]), Y(-Ly / 2) + 20, 's = ' + nL(rd.Y.s), 12, 'interna');
    }

    // Columna
    s += rect(-Cx / 2, -Cy / 2, Cx / 2, Cy / 2, 'columna');
    if (capa === 'acero') {
      const db = R.ld.db / 1000;
      barrasColumna(Cx, Cy, R.inp.columna.nBarras, 0.05).forEach((pt) => {
        s += '<circle class="dovela" cx="' + X(pt[0]) + '" cy="' + Y(pt[1]) + '" r="' + Math.max(2.2, db / 2 * k) + '"/>';
      });
    } else {
      s += '<line class="eje" x1="' + X(-Cx / 2) + '" y1="' + Y(0) + '" x2="' + X(Cx / 2) + '" y2="' + Y(0) + '"/>';
      s += '<line class="eje" x1="' + X(0) + '" y1="' + Y(-Cy / 2) + '" x2="' + X(0) + '" y2="' + Y(Cy / 2) + '"/>';
    }

    // Esquinas σ1..σ4 (σ1 arriba a la derecha, sentido horario)
    [[1, Lx / 2, Ly / 2, 'start', -1], [2, Lx / 2, -Ly / 2, 'start', 1], [3, -Lx / 2, -Ly / 2, 'end', 1], [4, -Lx / 2, Ly / 2, 'end', -1]].forEach(([i, x, y, anc, vy]) => {
      const val = R.serv['s' + i];
      const mal = val > R.inp.suelo.qadm || val <= 0;
      const ox = anc === 'start' ? 10 : -10;
      const txt = 'σ' + i + ' ' + nP(val), ancho = txt.length * 7 + 14, py = Y(y) + vy * 18;
      const px = anc === 'start' ? X(x) + ox : X(x) + ox - ancho;
      s += '<g class="esquina' + (mal ? ' mal' : '') + '"><circle cx="' + X(x) + '" cy="' + Y(y) + '" r="3.5"/>' +
        '<line class="guia" x1="' + X(x) + '" y1="' + Y(y) + '" x2="' + (anc === 'start' ? px : px + ancho) + '" y2="' + py + '"/>' +
        '<rect class="pildora" x="' + px + '" y="' + (py - 10) + '" width="' + ancho + '" height="20" rx="10"/>' +
        '<text class="pildora-txt" x="' + (px + ancho / 2) + '" y="' + (py + 4) + '" text-anchor="middle">' + txt + '</text>' +
        '<text class="sub" x="' + (px + ancho / 2) + '" y="' + (py + vy * 22 + 4) + '" text-anchor="middle">σ' + i + 'u ' + nP(R.ult['s' + i]) + '</text></g>';
    });

    s += cota(X(-Lx / 2), Y(-Ly / 2) + 46, X(Lx / 2), Y(-Ly / 2) + 46, 'Lx = ' + uL(Lx), 13);
    s += cota(X(Lx / 2) + 50, Y(Ly / 2), X(Lx / 2) + 50, Y(-Ly / 2), 'Ly = ' + uL(Ly), 13);
    s += '<text class="etq-col" x="' + X(0) + '" y="' + (Y(-Cy / 2) + 14) + '" text-anchor="middle">' + nL(Cx) + ' × ' + nL(Cy) + '</text>';
    const ox = 22, oy = H - 22;
    s += '<g class="ejes"><line x1="' + ox + '" y1="' + oy + '" x2="' + (ox + 30) + '" y2="' + oy + '"/><line x1="' + ox + '" y1="' + oy + '" x2="' + ox + '" y2="' + (oy - 30) + '"/>' +
      '<text x="' + (ox + 36) + '" y="' + (oy + 4) + '">X</text><text x="' + (ox - 4) + '" y="' + (oy - 36) + '">Y</text></g>';
    if (capa === 'presion') {
      s += '<text class="leyenda" x="' + (W - 18) + '" y="24" text-anchor="end">Servicio: ' + nP(sv.smin) + ' a ' + nP(sv.smax) + ' ' + uP() + ' (σadm ' + nP(qadm) + ')</text>';
      // Escala de color: de 0 a max(σadm, σmax), con la marca de σadm
      const top = M + 64, alto = H - 2 * M - 90, xe = W - 26, tope = Math.max(qadm, sv.smax);
      const ye = (v) => top + alto * (1 - v / tope);
      s += '<g class="escala-color"><rect x="' + xe + '" y="' + top + '" width="10" height="' + alto + '" rx="5" style="fill:url(#' + id + '-escala)"/>' +
        '<line class="marca" x1="' + (xe - 4) + '" y1="' + ye(qadm) + '" x2="' + (xe + 14) + '" y2="' + ye(qadm) + '"/>' +
        '<text x="' + (xe - 6) + '" y="' + (ye(qadm) + 4) + '" text-anchor="end">σadm</text>' +
        '<text x="' + (xe + 5) + '" y="' + (top + alto + 16) + '" text-anchor="middle">0</text>' +
        '<path class="nivel" d="M' + (xe - 2) + ' ' + ye(sv.smin) + 'H' + (xe + 12) + 'M' + (xe - 2) + ' ' + ye(sv.smax) + 'H' + (xe + 12) + '"/></g>';
    }
    return s + '</svg>';
  }

  // ---------------------------------------------------------------- Corte
  function corte(R, dir, prefijo) {
    const W = 640, H = 460;
    const enX = dir !== 'Y';
    const L = enX ? R.Lx : R.Ly;
    const C = enX ? R.inp.columna.Cx : R.inp.columna.Cy;
    const { h, d, r } = R;
    const Df = Math.max(R.inp.suelo.Df, h + 0.2);
    const total = Df + 0.45; // se dibuja un tramo de columna sobre el terreno
    const yBase = H - 90;
    const k = Math.min((W - 150) / L, (yBase - 60) / total);
    const X = (x) => W / 2 + x * k;
    const Y = (z) => yBase - z * k; // z = 0 en el fondo de la zapata
    const id = (prefijo || 'ct') + (enX ? 'x' : 'y');
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dibujo corte" role="img" aria-label="Corte ' + (enX ? 'X' : 'Y') + '">' + defs(id);

    s += '<rect class="relleno" x="' + X(-L / 2 - 0.35) + '" y="' + Y(Df) + '" width="' + (L + 0.7) * k + '" height="' + Df * k + '" style="fill:url(#' + id + '-suelo)"/>';
    s += '<line class="terreno" x1="' + X(-L / 2 - 0.45) + '" y1="' + Y(Df) + '" x2="' + X(L / 2 + 0.45) + '" y2="' + Y(Df) + '"/>';
    s += '<text class="etq-mini" x="14" y="' + (Y(Df) - 6) + '">Nivel de terreno, Df = ' + uL(R.inp.suelo.Df) + '</text>';
    s += '<rect class="zapata" x="' + X(-L / 2) + '" y="' + Y(h) + '" width="' + L * k + '" height="' + h * k + '"/>';
    s += '<rect class="columna" x="' + X(-C / 2) + '" y="' + Y(total) + '" width="' + C * k + '" height="' + (total - h) * k + '"/>';
    const yc = Y(total);
    s += '<path class="quiebre" d="M' + (X(-C / 2) - 8) + ' ' + (yc + 6) + 'L' + X(-C / 6) + ' ' + (yc + 6) + 'L' + X(0) + ' ' + (yc - 4) + 'L' + X(C / 6) + ' ' + (yc + 12) + 'L' + X(0) + ' ' + (yc + 4) + 'L' + (X(C / 2) + 8) + ' ' + (yc + 4) + '"/>';

    // Refuerzo: capa X abajo y capa Y encima. En el corte X la capa X se ve como línea.
    const rd = refuerzoDibujo(R);
    const par = enX ? rd.X : rd.Y, per = enX ? rd.Y : rd.X;
    const dbX = rd.X.db / 1000 * rd.capas, dbY = rd.Y.db / 1000 * rd.capas;
    const zX = r + dbX / 2, zY = r + dbX + dbY / 2;
    const zLinea = enX ? zX : zY, zPuntos = enX ? zY : zX;
    const dbPar = par.db / 1000;
    const gancho = rd.malla ? 0 : Math.min(h - r - 0.03, 12 * dbPar);
    s += '<path class="barra' + (par.mal ? ' mal' : '') + '" style="stroke-width:' + Math.max(rd.malla ? 1.2 : 1.6, dbPar * k) + '" d="M' + X(-L / 2 + r) + ' ' + Y(zLinea + gancho) + 'V' + Y(zLinea) + 'H' + X(L / 2 - r) + 'V' + Y(zLinea + gancho) + '"/>';
    posicionesParrilla(L, r, per).forEach((x) => {
      s += '<circle class="barra-punto' + (per.mal ? ' mal' : '') + '" cx="' + X(x) + '" cy="' + Y(zPuntos) + '" r="' + Math.max(rd.malla ? 1.4 : 2, per.db / 2000 * k) + '"/>';
    });

    // Dovelas con gancho de 90° hacia el centro de la columna
    const dbc = R.ld.db / 1000;
    const zApoyo = r + dbX + dbY + dbc / 2;
    const lg = 12 * dbc;
    [-C / 2 + 0.05, C / 2 - 0.05].forEach((x, i) => {
      const sgn = i === 0 ? 1 : -1;
      s += '<path class="dovela-l' + (R.ld.ok ? '' : ' mal') + '" style="stroke-width:' + Math.max(1.6, dbc * k) + '" d="M' + X(x) + ' ' + Y(total - 0.02) + 'V' + Y(zApoyo) + 'H' + X(x + sgn * lg) + '"/>';
    });

    s += cota(X(-L / 2), Y(0) + 64, X(L / 2), Y(0) + 64, (enX ? 'Lx' : 'Ly') + ' = ' + uL(L), 13);
    s += cota(X(-L / 2) - 30, Y(h), X(-L / 2) - 30, Y(0), 'h = ' + nL(h), -12);
    s += cota(X(L / 2) + 26, Y(h), X(L / 2) + 26, Y(h - d), 'd = ' + nL(d), 12);
    s += cota(X(L / 2) + 26, Y(h - d), X(L / 2) + 26, Y(0), 'r', 10);
    s += cota(X(-C / 2), Y(total) - 14, X(C / 2), Y(total) - 14, (enX ? 'Cx' : 'Cy') + ' = ' + nL(C), -10);
    const xl = X(C / 2 + 0.12);
    s += '<g class="cota ld' + (R.ld.ok ? '' : ' mal') + '"><line x1="' + xl + '" y1="' + Y(h) + '" x2="' + xl + '" y2="' + Y(Math.max(h - R.ld.ldc / 1000, -0.25)) + '"/>' +
      '<text x="' + (xl + 6) + '" y="' + Y(h / 2) + '" dominant-baseline="middle">ldc ' + UD().fmt(R.ld.ldc, 'ldmm') + '</text></g>';

    // Presiones de servicio bajo la zapata
    const sv = R.serv;
    const izq = enX ? Math.max(sv.s3, sv.s4) : Math.max(sv.s2, sv.s3);
    const der = enX ? Math.max(sv.s1, sv.s2) : Math.max(sv.s1, sv.s4);
    const esc = 46 / Math.max(R.inp.suelo.qadm, izq, der, 1e-6);
    const yB = Y(0) + 4;
    s += '<path class="presion' + (Math.max(izq, der) > R.inp.suelo.qadm ? ' mal' : '') + '" d="M' + X(-L / 2) + ' ' + yB + 'V' + (yB + izq * esc) + 'L' + X(L / 2) + ' ' + (yB + der * esc) + 'V' + yB + 'Z"/>';
    const yAdm = yB + R.inp.suelo.qadm * esc;
    s += '<line class="adm" x1="' + X(-L / 2) + '" y1="' + yAdm + '" x2="' + X(L / 2) + '" y2="' + yAdm + '"/>';
    s += '<text class="etq-mini" x="' + (X(-L / 2) - 6) + '" y="' + (yB + izq * esc + 12) + '" text-anchor="end">' + nP(izq) + '</text>';
    s += '<text class="etq-mini" x="' + (X(L / 2) + 6) + '" y="' + (yB + der * esc + 12) + '">' + nP(der) + '</text>';
    s += '<text class="etq-mini adm-t" x="' + X(L / 2) + '" y="' + (yAdm + 12) + '" text-anchor="end">σadm ' + nP(R.inp.suelo.qadm) + '</text>';
    s += '<text class="etq-acero" x="' + (W - 14) + '" y="22" text-anchor="end">' + rd.etq + ', dovelas #' + R.ld.barra + '</text>';
    return s + '</svg>';
  }

  global.Dibujo = { planta, corte, barrasColumna, posicionesParrilla, refuerzoDibujo };
})(window);

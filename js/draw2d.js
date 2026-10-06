/* Dibujos 2D en SVG: planta con capas y corte transversal.
 * Coordenadas de cálculo en metros con origen en el centro de la zapata, Y hacia arriba.
 * Los colores salen de clases CSS para que respeten el tema claro/oscuro.
 */
(function (global) {
  'use strict';

  const f2 = (x) => Number(x).toFixed(2);

  // Posiciones (x, y) de las barras longitudinales de la columna, en su perímetro.
  function barrasColumna(Cx, Cy, nBarras, rec) {
    const n = Math.max(4, nBarras - (nBarras % 2));
    const ax = Cx / 2 - rec, ay = Cy / 2 - rec;
    const pts = [[ax, ay], [-ax, ay], [-ax, -ay], [ax, -ay]];
    const extra = (n - 4) / 2;
    const kx = Math.round(extra * Cx / (Cx + Cy));
    const ky = extra - kx;
    for (let i = 1; i <= kx; i++) {
      const x = -ax + (2 * ax) * i / (kx + 1);
      pts.push([x, ay], [x, -ay]);
    }
    for (let i = 1; i <= ky; i++) {
      const y = -ay + (2 * ay) * i / (ky + 1);
      pts.push([ax, y], [-ax, y]);
    }
    return pts;
  }

  // Posiciones de las barras de una parrilla a lo largo de un ancho b.
  function posicionesParrilla(b, r, sel) {
    const W = b - 2 * r;
    const usado = (sel.n - 1) * sel.s;
    const ini = -W / 2 + (W - usado) / 2;
    const out = [];
    for (let i = 0; i < sel.n; i++) out.push(ini + i * sel.s);
    return out;
  }

  function cota(x1, y1, x2, y2, texto, lado, cls) {
    // Línea de cota con marcas a 45° y texto centrado; lado = desplazamiento del texto.
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const tick = (x, y) => '<line x1="' + (x - 4) + '" y1="' + (y + 4) + '" x2="' + (x + 4) + '" y2="' + (y - 4) + '"/>';
    const tx = horiz ? mx : mx + lado;
    const ty = horiz ? my + lado : my;
    const rot = horiz ? '' : ' transform="rotate(-90 ' + tx + ' ' + ty + ')"';
    return '<g class="cota ' + (cls || '') + '"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
      tick(x1, y1) + tick(x2, y2) +
      '<text x="' + tx + '" y="' + ty + '" text-anchor="middle" dominant-baseline="middle"' + rot + '>' + texto + '</text></g>';
  }

  function defs(id) {
    return '<defs>' +
      '<pattern id="' + id + '-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="7" class="hatch-line"/></pattern>' +
      '<pattern id="' + id + '-hatch-mal" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="7" class="hatch-line mal"/></pattern>' +
      '<pattern id="' + id + '-suelo" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(-45)">' +
      '<line x1="0" y1="0" x2="0" y2="10" class="suelo-line"/></pattern>' +
      '</defs>';
  }

  // Color de una parada del gradiente según σ/σadm (rojo si excede o si hay tensión).
  function paradaPresion(offset, sigma, qadm) {
    if (sigma > qadm + 1e-9 || sigma <= 0) return '<stop offset="' + offset + '" style="stop-color:var(--mal)"/>';
    const pct = Math.round(Math.max(0, Math.min(1, sigma / qadm)) * 100);
    return '<stop offset="' + offset + '" style="stop-color:color-mix(in srgb, var(--presion-hi) ' + pct + '%, var(--presion-lo))"/>';
  }

  // ---------------------------------------------------------------- Planta
  function planta(R, capa) {
    const W = 640, H = 540, M = 78;
    const { Lx, Ly, d, r } = R;
    const { Cx, Cy } = R.inp.columna;
    const k = Math.min((W - 2 * M) / Lx, (H - 2 * M) / Ly);
    const cx0 = W / 2, cy0 = H / 2;
    const X = (x) => cx0 + x * k;
    const Y = (y) => cy0 - y * k;
    const rect = (x1, y1, x2, y2, cls, extra) =>
      '<rect x="' + X(Math.min(x1, x2)) + '" y="' + Y(Math.max(y1, y2)) + '" width="' + Math.abs(x2 - x1) * k + '" height="' + Math.abs(y2 - y1) * k + '" class="' + cls + '"' + (extra || '') + '/>';
    const id = 'pl';
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dibujo planta" role="img" aria-label="Planta de la zapata">' + defs(id);

    // Gradiente del campo de presiones (lineal, por eso un solo gradiente es exacto)
    const sv = capa === 'presion' ? R.serv : R.ult;
    const g = [sv.gx, sv.gy];
    const gn = Math.hypot(g[0], g[1]);
    const u = gn > 1e-12 ? [g[0] / gn, g[1] / gn] : [1, 0];
    const t = Math.abs(u[0]) * Lx / 2 + Math.abs(u[1]) * Ly / 2;
    const smin = Math.min(sv.s1, sv.s2, sv.s3, sv.s4), smax = Math.max(sv.s1, sv.s2, sv.s3, sv.s4);
    s += '<defs><linearGradient id="' + id + '-grad" gradientUnits="userSpaceOnUse" x1="' + X(-u[0] * t) + '" y1="' + Y(-u[1] * t) + '" x2="' + X(u[0] * t) + '" y2="' + Y(u[1] * t) + '">' +
      paradaPresion(0, smin, R.inp.suelo.qadm) + paradaPresion(1, smax, R.inp.suelo.qadm) + '</linearGradient></defs>';

    // Zapata
    const fondo = capa === 'presion' ? 'url(#' + id + '-grad)' : null;
    s += rect(-Lx / 2, -Ly / 2, Lx / 2, Ly / 2, 'zapata', fondo ? ' style="fill:' + fondo + '"' : '');

    if (capa === 'punz') {
      const mal = !R.pz.ok;
      const hx = (Cx + d) / 2, hy = (Cy + d) / 2;
      s += '<path class="area' + (mal ? ' mal' : '') + '" fill-rule="evenodd" style="fill:url(#' + id + (mal ? '-hatch-mal' : '-hatch') + ')" d="' +
        'M' + X(-Lx / 2) + ' ' + Y(Ly / 2) + 'H' + X(Lx / 2) + 'V' + Y(-Ly / 2) + 'H' + X(-Lx / 2) + 'Z ' +
        'M' + X(-hx) + ' ' + Y(hy) + 'H' + X(hx) + 'V' + Y(-hy) + 'H' + X(-hx) + 'Z"/>';
      s += rect(-hx, -hy, hx, hy, 'perimetro' + (mal ? ' mal' : ''));
      s += '<text class="etq-area" x="' + X(-Lx / 2) + '" y="' + (Y(Ly / 2) - 10) + '">A2D = ' + f2(R.pz.A2D) + ' m²  ·  bo = ' + f2(R.pz.bo) + ' m</text>';
      s += cota(X(-hx), Y(-hy) + 22, X(hx), Y(-hy) + 22, 'Cx + d = ' + f2(Cx + d), 12, 'interna');
      s += cota(X(hx) + 22, Y(hy), X(hx) + 22, Y(-hy), 'Cy + d = ' + f2(Cy + d), 12, 'interna');
    }

    if (capa === 'cortante') {
      const ax = R.cu.x, ay = R.cu.y;
      if (ax.k > 0) s += rect(Cx / 2 + d, -Ly / 2, Lx / 2, Ly / 2, 'area' + (ax.ok ? '' : ' mal'), ' style="fill:url(#' + id + (ax.ok ? '-hatch' : '-hatch-mal') + ')"');
      if (ay.k > 0) s += rect(-Lx / 2, Cy / 2 + d, Lx / 2, Ly / 2, 'area' + (ay.ok ? '' : ' mal'), ' style="fill:url(#' + id + (ay.ok ? '-hatch' : '-hatch-mal') + ')"');
      s += '<line class="seccion" x1="' + X(Cx / 2 + d) + '" y1="' + Y(Ly / 2) + '" x2="' + X(Cx / 2 + d) + '" y2="' + Y(-Ly / 2) + '"/>';
      s += '<line class="seccion" x1="' + X(-Lx / 2) + '" y1="' + Y(Cy / 2 + d) + '" x2="' + X(Lx / 2) + '" y2="' + Y(Cy / 2 + d) + '"/>';
      s += cota(X(Cx / 2), Y(0) + 0, X(Cx / 2 + d), Y(0), 'd', -10, 'interna');
      if (ax.k > 0) s += '<text class="etq-area" text-anchor="middle" x="' + X((Cx / 2 + d + Lx / 2) / 2) + '" y="' + Y(-Ly / 4) + '">Ax = ' + f2(ax.A) + ' m²</text>';
      if (ay.k > 0) s += '<text class="etq-area" text-anchor="middle" x="' + X(-Lx / 4) + '" y="' + Y((Cy / 2 + d + Ly / 2) / 2) + '">Ay = ' + f2(ay.A) + ' m²</text>';
    }

    if (capa === 'flexion') {
      s += rect(Cx / 2, -Ly / 2, Lx / 2, Ly / 2, 'area', ' style="fill:url(#' + id + '-hatch)"');
      s += rect(-Lx / 2, Cy / 2, Lx / 2, Ly / 2, 'area alt', ' style="fill:url(#' + id + '-hatch)"');
      s += '<text class="etq-area" text-anchor="middle" x="' + X((Cx / 2 + Lx / 2) / 2) + '" y="' + Y(-Ly / 4) + '">Mux = ' + f2(R.fx.Mu) + '</text>';
      s += '<text class="etq-area" text-anchor="middle" x="' + X(-Lx / 4) + '" y="' + Y((Cy / 2 + Ly / 2) / 2) + '">Muy = ' + f2(R.fy.Mu) + '</text>';
      s += cota(X(Cx / 2), Y(-Ly / 2) - 14, X(Lx / 2), Y(-Ly / 2) - 14, 'Kx = ' + f2(R.fx.K), -10, 'interna');
      s += cota(X(-Lx / 2) + 14, Y(Ly / 2), X(-Lx / 2) + 14, Y(Cy / 2), 'Ky = ' + f2(R.fy.K), 12, 'interna');
    }

    if (capa === 'acero') {
      const sx = R.acero.selX, sy = R.acero.selY;
      // Barras paralelas a X, distribuidas a lo largo de Ly
      posicionesParrilla(Ly, r, sx).forEach((y) => {
        s += '<line class="barra barra-x' + (sx.estado === 'mal' ? ' mal' : '') + '" x1="' + X(-Lx / 2 + r) + '" y1="' + Y(y) + '" x2="' + X(Lx / 2 - r) + '" y2="' + Y(y) + '" style="stroke-width:' + Math.max(1.2, sx.db / 1000 * k) + '"/>';
      });
      posicionesParrilla(Lx, r, sy).forEach((x) => {
        s += '<line class="barra barra-y' + (sy.estado === 'mal' ? ' mal' : '') + '" x1="' + X(x) + '" y1="' + Y(-Ly / 2 + r) + '" x2="' + X(x) + '" y2="' + Y(Ly / 2 - r) + '" style="stroke-width:' + Math.max(1.2, sy.db / 1000 * k) + '"/>';
      });
      s += '<text class="etq-acero" x="' + X(Lx / 2) + '" y="' + (Y(Ly / 2) - 10) + '" text-anchor="end">' + sx.n + ' #' + sx.barra + ' @ ' + f2(sx.s) + ' (en X) · ' + sy.n + ' #' + sy.barra + ' @ ' + f2(sy.s) + ' (en Y)</text>';
    }

    // Columna con dovelas
    s += rect(-Cx / 2, -Cy / 2, Cx / 2, Cy / 2, 'columna');
    if (capa === 'acero') {
      const db = R.ld.db / 1000;
      barrasColumna(Cx, Cy, R.inp.columna.nBarras, 0.05).forEach((p) => {
        s += '<circle class="dovela" cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="' + Math.max(2.2, db / 2 * k) + '"/>';
      });
    } else {
      s += '<line class="eje" x1="' + X(-Cx / 2) + '" y1="' + Y(0) + '" x2="' + X(Cx / 2) + '" y2="' + Y(0) + '"/>';
      s += '<line class="eje" x1="' + X(0) + '" y1="' + Y(-Cy / 2) + '" x2="' + X(0) + '" y2="' + Y(Cy / 2) + '"/>';
    }

    // Esquinas σ1..σ4 (convención del documento: σ1 arriba-derecha, sentido horario)
    const esq = [[1, Lx / 2, Ly / 2, 'start', -1], [2, Lx / 2, -Ly / 2, 'start', 1], [3, -Lx / 2, -Ly / 2, 'end', 1], [4, -Lx / 2, Ly / 2, 'end', -1]];
    esq.forEach(([i, x, y, anc, vy]) => {
      const val = R.serv['s' + i];
      const mal = val > R.inp.suelo.qadm || val <= 0;
      const ox = anc === 'start' ? 8 : -8;
      s += '<g class="esquina' + (mal ? ' mal' : '') + '"><circle cx="' + X(x) + '" cy="' + Y(y) + '" r="3.5"/>' +
        '<text x="' + (X(x) + ox) + '" y="' + (Y(y) + vy * 14) + '" text-anchor="' + anc + '"><tspan class="sig">σ' + i + '</tspan> ' + f2(val) + '</text>' +
        '<text class="sub" x="' + (X(x) + ox) + '" y="' + (Y(y) + vy * 14 + 14) + '" text-anchor="' + anc + '">σ' + i + 'u ' + f2(R.ult['s' + i]) + '</text></g>';
    });

    // Cotas generales
    s += cota(X(-Lx / 2), Y(-Ly / 2) + 46, X(Lx / 2), Y(-Ly / 2) + 46, 'Lx = ' + f2(Lx) + ' m', 13);
    s += cota(X(Lx / 2) + 50, Y(Ly / 2), X(Lx / 2) + 50, Y(-Ly / 2), 'Ly = ' + f2(Ly) + ' m', 13);
    s += '<text class="etq-col" x="' + X(0) + '" y="' + (Y(-Cy / 2) + 14) + '" text-anchor="middle">' + f2(Cx) + ' × ' + f2(Cy) + '</text>';

    // Indicador de ejes
    const ox = 22, oy = H - 22;
    s += '<g class="ejes"><line x1="' + ox + '" y1="' + oy + '" x2="' + (ox + 30) + '" y2="' + oy + '"/><line x1="' + ox + '" y1="' + oy + '" x2="' + ox + '" y2="' + (oy - 30) + '"/>' +
      '<text x="' + (ox + 36) + '" y="' + (oy + 4) + '">X</text><text x="' + (ox - 4) + '" y="' + (oy - 36) + '">Y</text></g>';

    if (capa === 'presion') {
      s += '<g class="leyenda"><text x="' + (W - 18) + '" y="22" text-anchor="end">Presión de servicio (tonf/m²): ' + f2(smin) + ' → ' + f2(smax) + ' · σadm ' + f2(R.inp.suelo.qadm) + '</text></g>';
    }
    s += '</svg>';
    return s;
  }

  // ---------------------------------------------------------------- Corte
  function corte(R, dir) {
    const W = 640, H = 460;
    const enX = dir !== 'Y';
    const L = enX ? R.Lx : R.Ly;
    const C = enX ? R.inp.columna.Cx : R.inp.columna.Cy;
    const { h, d, r } = R;
    const Df = Math.max(R.inp.suelo.Df, h + 0.2);
    const alturaCol = 0.45; // tramo de columna dibujado sobre el terreno
    const total = Df + alturaCol;
    const yBase = H - 90; // fondo de la zapata; debajo va el diagrama de presiones
    const k = Math.min((W - 150) / L, (yBase - 60) / total);
    const x0 = W / 2;
    const X = (x) => x0 + x * k;
    const Y = (z) => yBase - z * k; // z = 0 en el fondo de la zapata
    const id = 'ct' + (enX ? 'x' : 'y');
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dibujo corte" role="img" aria-label="Corte ' + (enX ? 'X' : 'Y') + '">' + defs(id);

    // Relleno de suelo sobre la zapata y a los lados
    s += '<rect class="relleno" x="' + X(-L / 2 - 0.35) + '" y="' + Y(Df) + '" width="' + (L + 0.7) * k + '" height="' + Df * k + '" style="fill:url(#' + id + '-suelo)"/>';
    s += '<line class="terreno" x1="' + X(-L / 2 - 0.45) + '" y1="' + Y(Df) + '" x2="' + X(L / 2 + 0.45) + '" y2="' + Y(Df) + '"/>';
    s += '<text class="etq-mini" x="' + X(-L / 2 - 0.45) + '" y="' + (Y(Df) - 6) + '">N. terreno · Df = ' + f2(R.inp.suelo.Df) + ' m</text>';

    // Zapata y columna
    s += '<rect class="zapata" x="' + X(-L / 2) + '" y="' + Y(h) + '" width="' + L * k + '" height="' + h * k + '"/>';
    s += '<rect class="columna" x="' + X(-C / 2) + '" y="' + Y(total) + '" width="' + C * k + '" height="' + (total - h) * k + '"/>';
    // Línea de corte de la columna
    const yc = Y(total);
    s += '<path class="quiebre" d="M' + (X(-C / 2) - 8) + ' ' + (yc + 6) + 'L' + X(-C / 6) + ' ' + (yc + 6) + 'L' + X(0) + ' ' + (yc - 4) + 'L' + X(C / 6) + ' ' + (yc + 12) + 'L' + X(0) + ' ' + (yc + 4) + 'L' + (X(C / 2) + 8) + ' ' + (yc + 4) + '"/>';

    // Acero: barras paralelas al corte (línea) y perpendiculares (puntos)
    const selPar = enX ? R.acero.selX : R.acero.selY;
    const selPer = enX ? R.acero.selY : R.acero.selX;
    const dbPar = selPar.db / 1000, dbPer = selPer.db / 1000;
    const zPar = r + dbPar / 2; // capa inferior: barras en X; en el corte Y se ve como puntos
    const zPerSup = r + dbPar + dbPer / 2;
    // Para el corte X: barras X abajo (línea), barras Y encima (puntos).
    // Para el corte Y: barras X abajo (puntos), barras Y encima (línea).
    const zLinea = enX ? zPar : r + dbPer + dbPar / 2;
    const zPuntos = enX ? zPerSup : r + dbPer / 2;
    const ganchoH = Math.min(h - r - 0.03, 12 * dbPar);
    s += '<path class="barra' + (selPar.estado === 'mal' ? ' mal' : '') + '" style="stroke-width:' + Math.max(1.6, dbPar * k) + '" d="M' + X(-L / 2 + r) + ' ' + Y(zLinea + ganchoH) + 'V' + Y(zLinea) + 'H' + X(L / 2 - r) + 'V' + Y(zLinea + ganchoH) + '"/>';
    posicionesParrilla(L, r, selPer).forEach((x) => {
      s += '<circle class="barra-punto' + (selPer.estado === 'mal' ? ' mal' : '') + '" cx="' + X(x) + '" cy="' + Y(zPuntos) + '" r="' + Math.max(2, dbPer / 2 * k) + '"/>';
    });

    // Dovelas con gancho a 90° hacia el centro de la columna
    const dbc = R.ld.db / 1000;
    const zApoyo = r + dbPar + dbPer + dbc / 2;
    const gancho = 12 * dbc;
    const xs = [-C / 2 + 0.05, C / 2 - 0.05];
    xs.forEach((x, i) => {
      const sgn = i === 0 ? 1 : -1;
      s += '<path class="dovela-l' + (R.ld.ok ? '' : ' mal') + '" style="stroke-width:' + Math.max(1.6, dbc * k) + '" d="M' + X(x) + ' ' + Y(total - 0.02) + 'V' + Y(zApoyo) + 'H' + X(x + sgn * gancho) + '"/>';
    });

    // Cotas
    s += cota(X(-L / 2), Y(0) + 64, X(L / 2), Y(0) + 64, (enX ? 'Lx' : 'Ly') + ' = ' + f2(L) + ' m', 13);
    s += cota(X(-L / 2) - 30, Y(h), X(-L / 2) - 30, Y(0), 'h = ' + f2(h), -12);
    s += cota(X(L / 2) + 26, Y(h), X(L / 2) + 26, Y(h - d), 'd = ' + f2(d), 12);
    s += cota(X(L / 2) + 26, Y(h - d), X(L / 2) + 26, Y(0), 'r', 10);
    s += cota(X(-C / 2), Y(total) - 14, X(C / 2), Y(total) - 14, (enX ? 'Cx' : 'Cy') + ' = ' + f2(C), -10);
    // Longitud de desarrollo vs disponible
    const xl = X(C / 2 + 0.12);
    s += '<g class="cota ld' + (R.ld.ok ? '' : ' mal') + '"><line x1="' + xl + '" y1="' + Y(h) + '" x2="' + xl + '" y2="' + Y(Math.max(h - R.ld.ldc / 1000, -0.25)) + '"/>' +
      '<text x="' + (xl + 6) + '" y="' + Y(h / 2) + '" dominant-baseline="middle">ldc ' + (R.ld.ldc / 10).toFixed(1) + ' cm</text></g>';

    // Diagrama de presiones de servicio bajo la zapata
    const sv = R.serv;
    const izq = enX ? Math.max(sv.s3, sv.s4) : Math.max(sv.s2, sv.s3);
    const der = enX ? Math.max(sv.s1, sv.s2) : Math.max(sv.s1, sv.s4);
    const escala = 46 / Math.max(R.inp.suelo.qadm, izq, der, 1e-6);
    const yB = Y(0) + 4;
    s += '<path class="presion' + (Math.max(izq, der) > R.inp.suelo.qadm ? ' mal' : '') + '" d="M' + X(-L / 2) + ' ' + yB + 'V' + (yB + izq * escala) + 'L' + X(L / 2) + ' ' + (yB + der * escala) + 'V' + yB + 'Z"/>';
    const yAdm = yB + R.inp.suelo.qadm * escala;
    s += '<line class="adm" x1="' + X(-L / 2) + '" y1="' + yAdm + '" x2="' + X(L / 2) + '" y2="' + yAdm + '"/>';
    s += '<text class="etq-mini" x="' + (X(-L / 2) - 6) + '" y="' + (yB + izq * escala + 12) + '" text-anchor="end">' + f2(izq) + '</text>';
    s += '<text class="etq-mini" x="' + (X(L / 2) + 6) + '" y="' + (yB + der * escala + 12) + '">' + f2(der) + '</text>';
    s += '<text class="etq-mini adm-t" x="' + X(L / 2) + '" y="' + (yAdm + 12) + '" text-anchor="end">σadm ' + f2(R.inp.suelo.qadm) + '</text>';

    s += '<text class="etq-acero" x="' + (W / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + selPar.n + ' #' + selPar.barra + ' @ ' + f2(selPar.s) + ' en ' + (enX ? 'X' : 'Y') + ' · ' + selPer.n + ' #' + selPer.barra + ' @ ' + f2(selPer.s) + ' en ' + (enX ? 'Y' : 'X') + ' · dovelas #' + R.ld.barra + '</text>';
    s += '</svg>';
    return s;
  }

  global.Dibujo = { planta, corte, barrasColumna, posicionesParrilla };
})(window);

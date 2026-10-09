/* Dibujo técnico en SVG para las figuras de la memoria (PDF y respaldo del mini-3D).
 * Una tinta y gris para imprimir en blanco y negro: achurado de concreto (puntos y triángulos) y de suelo, grosores de
 * línea por jerarquía, cotas con remates a 45°, flechas de fuerza, momentos en arco según su signo y subíndices reales.
 * Los colores van como atributos (el CSS de .resaltado los puede cambiar al ligar ecuación y figura).
 */
(function (global) {
  'use strict';
  const TINTA = '#1d1d1d', GRIS = '#6b6b6b', GRIS_CLARO = '#9a9a9a';
  const f1 = (x) => Number(x).toFixed(1);

  // Patrones: concreto (puntos y triángulos pequeños) y suelo (rayado diagonal). Cada figura lleva los suyos con un id
  // propio: si dos figuras compartieran id, el PDF tomaría el de una figura oculta de la app y saldría sin achurado.
  let serie = 0;
  function defs(pre) {
    return '<defs>' +
      '<pattern id="' + pre + '-concreto" width="22" height="22" patternUnits="userSpaceOnUse">' +
        '<rect width="22" height="22" fill="#f4f3f0"/>' +
        '<circle cx="4" cy="5" r="0.9" fill="' + GRIS + '"/><circle cx="15" cy="3" r="0.6" fill="' + GRIS + '"/>' +
        '<circle cx="11" cy="14" r="0.8" fill="' + GRIS + '"/><circle cx="19" cy="18" r="0.6" fill="' + GRIS + '"/>' +
        '<path d="M5 15 l2.6 -1.2 l-0.4 2.6 z M16 9 l2.2 1.4 l-2.4 0.8 z" fill="none" stroke="' + GRIS + '" stroke-width="0.6"/>' +
      '</pattern>' +
      '<pattern id="' + pre + '-columna" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<rect width="8" height="8" fill="#e6e4df"/><line x1="0" y1="0" x2="0" y2="8" stroke="' + GRIS_CLARO + '" stroke-width="0.8"/>' +
      '</pattern>' +
      '<pattern id="' + pre + '-suelo" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<line x1="0" y1="0" x2="0" y2="10" stroke="' + GRIS + '" stroke-width="0.8"/>' +
      '</pattern>' +
    '</defs>';
  }

  function svg(w, h, cont, titulo) {
    const pre = 'st' + (++serie);
    return '<svg class="fig-tec" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + titulo + '" font-family="Inter, system-ui, sans-serif">' +
      defs(pre) + '<rect class="fig-papel" width="' + w + '" height="' + h + '" fill="#ffffff"/>' + cont.replace(/url\(#st-/g, 'url(#' + pre + '-') + '</svg>';
  }

  // Texto con subíndice: txt(x, y, ['M', 'x', ' = 0.23 tonf·m'])  ó  txt(x, y, 'texto')
  function txt(x, y, t, op) {
    const o = op || {};
    const partes = Array.isArray(t)
      ? t[0] + '<tspan dy="3.5" font-size="' + ((o.tam || 12) * 0.72).toFixed(1) + '">' + t[1] + '</tspan><tspan dy="-3.5">' + (t[2] || '') + '</tspan>'
      : t;
    return '<text x="' + f1(x) + '" y="' + f1(y) + '"' + (o.clase ? ' class="' + o.clase + '"' : '') + (o.anc ? ' text-anchor="' + o.anc + '"' : '') +
      ' font-size="' + (o.tam || 12) + '" font-weight="' + (o.peso || 500) + '" fill="' + (o.color || TINTA) + '"' +
      (o.fondo ? ' paint-order="stroke" stroke="#ffffff" stroke-width="3"' : '') + '>' + partes + '</text>';
  }

  // Concreto en corte o en vista: achurado con contorno grueso
  function concreto(x, y, w, h, clase) {
    return '<rect class="' + (clase || 'zapata') + '" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="url(#st-concreto)" stroke="' + TINTA + '" stroke-width="1.6"/>';
  }
  function columna(x, y, w, h) {
    return '<rect class="columna" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="url(#st-columna)" stroke="' + TINTA + '" stroke-width="1.6"/>' +
      // línea de corte arriba: la columna sigue
      '<path d="M' + f1(x - 6) + ' ' + f1(y) + 'h' + f1(w / 2 + 2) + 'l4 -5l4 10l4 -5h' + f1(w / 2 - 2) + '" fill="none" stroke="' + TINTA + '" stroke-width="0.8"/>';
  }
  // Terreno: línea y banda rayada bajo ella (de x0 a x1)
  function suelo(x0, x1, y, alto) {
    return '<rect x="' + f1(x0) + '" y="' + f1(y) + '" width="' + f1(x1 - x0) + '" height="' + (alto || 9) + '" fill="url(#st-suelo)"/>' +
      '<line class="suelo-line" x1="' + f1(x0) + '" y1="' + f1(y) + '" x2="' + f1(x1) + '" y2="' + f1(y) + '" stroke="' + TINTA + '" stroke-width="1"/>';
  }
  // Eje (raya y punto)
  function eje(x1, y1, x2, y2) {
    return '<line class="eje" x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + GRIS + '" stroke-width="0.6" stroke-dasharray="10 3 2 3"/>';
  }

  // Flecha de fuerza con punta llena
  function flecha(x1, y1, x2, y2, op) {
    const o = op || {};
    const a = Math.atan2(y2 - y1, x2 - x1), l = o.punta || 8;
    const p1 = [x2 - l * Math.cos(a - 0.38), y2 - l * Math.sin(a - 0.38)], p2 = [x2 - l * Math.cos(a + 0.38), y2 - l * Math.sin(a + 0.38)];
    const c = o.color || TINTA;
    return '<line class="fig-flecha" x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" stroke="' + c + '" stroke-width="' + (o.grosor || 1.6) + '"/>' +
      '<path class="fig-punta" d="M' + f1(x2) + ' ' + f1(y2) + 'L' + f1(p1[0]) + ' ' + f1(p1[1]) + 'L' + f1(p2[0]) + ' ' + f1(p2[1]) + 'Z" fill="' + c + '"/>';
  }

  // Momento: arco de 240° alrededor de (cx, cy) con punta en el sentido de su signo (positivo = antihorario)
  function momento(cx, cy, r, signo) {
    if (!signo) return '';
    const a0 = -150 * Math.PI / 180, a1 = 90 * Math.PI / 180;
    const P = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [ini, fin] = signo > 0 ? [a0, a1] : [a1, a0];
    const p0 = P(ini), p1 = P(fin);
    const atras = P(fin - (signo > 0 ? 1 : -1) * 0.3); // un poco antes del final, para orientar la punta
    return '<path class="fig-flecha" d="M' + f1(p0[0]) + ' ' + f1(p0[1]) + 'A' + r + ' ' + r + ' 0 1 ' + (signo > 0 ? 0 : 1) + ' ' + f1(p1[0]) + ' ' + f1(p1[1]) + '" fill="none" stroke="' + TINTA + '" stroke-width="1.6"/>' +
      flecha(atras[0], atras[1], p1[0], p1[1], { punta: 8 }).replace(/<line[^>]*\/>/, '');
  }

  // Cota con líneas de extensión y remates a 45° (como en los planos)
  function cota(x1, y1, x2, y2, texto, op) {
    const o = op || {};
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux, off = o.desfase || 0;
    const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off];
    const remate = (p) => '<line x1="' + f1(p[0] - 4 * (ux + nx)) + '" y1="' + f1(p[1] - 4 * (uy + ny)) + '" x2="' + f1(p[0] + 4 * (ux + nx)) + '" y2="' + f1(p[1] + 4 * (uy + ny)) + '" stroke="' + TINTA + '" stroke-width="1.1"/>';
    const ext = off ? '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(a[0] + nx * 3) + '" y2="' + f1(a[1] + ny * 3) + '" stroke="' + GRIS + '" stroke-width="0.6"/>' +
      '<line x1="' + f1(x2) + '" y1="' + f1(y2) + '" x2="' + f1(b[0] + nx * 3) + '" y2="' + f1(b[1] + ny * 3) + '" stroke="' + GRIS + '" stroke-width="0.6"/>' : '';
    const m = [(a[0] + b[0]) / 2 + nx * 6, (a[1] + b[1]) / 2 + ny * 6];
    const giro = Math.abs(dy) > Math.abs(dx) ? ' transform="rotate(-90 ' + f1(m[0]) + ' ' + f1(m[1]) + ')"' : '';
    return '<g class="cota' + (o.clase ? ' ' + o.clase : '') + '">' + ext +
      '<line x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" stroke="' + TINTA + '" stroke-width="0.7"/>' + remate(a) + remate(b) +
      '<g' + giro + '>' + txt(m[0], giro ? m[1] : (o.arriba ? Math.min(a[1], b[1]) - 5 : m[1] + (ny > 0 ? 9 : -2)), texto, { anc: 'middle', tam: 10.5, fondo: true }) + '</g></g>';
  }

  // Barra de refuerzo en corte
  function barra(cx, cy, r) {
    return '<circle class="barra-sec" cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="' + TINTA + '"/>';
  }

  // Pie de la figura: título corto y la nota
  function pie(w, y, texto) {
    return txt(w / 2, y, texto, { anc: 'middle', tam: 11, color: GRIS, clase: 'etq-mini' });
  }

  global.SvgTec = { TINTA, GRIS, GRIS_CLARO, defs, svg, txt, concreto, columna, suelo, eje, flecha, momento, cota, barra, pie, f1 };
})(window);

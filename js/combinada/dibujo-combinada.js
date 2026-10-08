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

  global.DibujoCombinada = { tono, miniCarga, miniatura };
})(window);

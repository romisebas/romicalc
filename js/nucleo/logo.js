/* Logo de ZapatAPP (v3.2): una varilla corrugada doblada en Z, con ganchos a 135° en los extremos.
 * Un solo trazo en currentColor: funciona en oscuro, claro, monocromo y en el PDF.
 * Fuente maestra: assets/logo/logo.svg (concepto C, elegido con la skill logo-design).
 */
(function (global) {
  'use strict';
  const TRAZO = 'M102 106 L66 70 Q54 56 74 56 H200 L56 200 H182 Q202 200 190 186 L154 150';
  function svg(clase, titulo) {
    return '<svg class="logo-dz ' + (clase || '') + '" viewBox="0 0 256 256"' + (titulo ? ' role="img" aria-label="' + titulo + '"' : ' aria-hidden="true"') + '>' +
      '<path class="lg-varilla" pathLength="1" d="' + TRAZO + '"/></svg>';
  }
  global.Logo = { svg, TRAZO };
})(window);

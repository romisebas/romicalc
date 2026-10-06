/* Logo: zapata y columna en isométrico, caras rellenas con tres tonos.
 * Las separaciones entre caras usan el color de fondo, así funciona en claro, oscuro y monocromo.
 * Fuente maestra: assets/logo/logo.svg (auditado con la skill logo-design).
 */
(function (global) {
  'use strict';
  const CARAS = [
    ['lg-zt', 'M8 38 L32 26 L56 38 L32 50 Z'],
    ['lg-zl', 'M8 38 L32 50 L32 57 L8 45 Z'],
    ['lg-zr', 'M32 50 L56 38 L56 45 L32 57 Z'],
    ['lg-ct', 'M26 12 L32 9 L38 12 L32 15 Z'],
    ['lg-cl', 'M26 12 L32 15 L32 41 L26 38 Z'],
    ['lg-cr', 'M32 15 L38 12 L38 38 L32 41 Z'],
  ];
  function svg(clase, titulo) {
    return '<svg class="logo-dz ' + (clase || '') + '" viewBox="0 0 64 64"' + (titulo ? ' role="img" aria-label="' + titulo + '"' : ' aria-hidden="true"') + '>' +
      '<g transform="translate(0 -1.5)">' + CARAS.map((c) => '<path class="' + c[0] + '" d="' + c[1] + '"/>').join('') + '</g></svg>';
  }
  global.Logo = { svg, CARAS };
})(window);

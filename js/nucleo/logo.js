/* Isotipo de RomiCalc (K · R de piezas): una barra, una bola y una pata forman la R sobre un bloque azul.
 * Los colores salen del CSS (--marca-*), así sirve en oscuro, claro y en el PDF de una tinta.
 * Fuente maestra: assets/logo/romicalc/romicalc-isotipo.svg (elegido en Claude Design, ver PROGRESO.md).
 */
(function (global) {
  'use strict';
  function svg(clase, titulo) {
    return '<svg class="logo-dz ' + (clase || '') + '" viewBox="0 0 256 256"' + (titulo ? ' role="img" aria-label="' + titulo + '"' : ' aria-hidden="true"') + '>' +
      '<rect class="lg-bloque" x="32" y="32" width="192" height="192" rx="44"/>' +
      '<rect class="lg-pieza lg-barra" x="76" y="72" width="32" height="112" rx="4"/>' +
      '<path class="lg-pieza lg-pata" d="M114 138 H150 L186 184 H150 Z"/>' +
      '<circle class="lg-pieza lg-bola" cx="144" cy="104" r="32"/></svg>';
  }
  global.Logo = { svg };
})(window);

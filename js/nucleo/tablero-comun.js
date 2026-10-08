/* Piezas del tablero que comparten todos los tipos de zapata (beta 1.2): anillos de utilización,
 * ficha del chequeo elegido y riel de datos. Solo arman HTML; cada tablero los pinta y conecta.
 */
(function (global) {
  'use strict';

  const f0 = (x) => Number(x).toFixed(0);

  // Color del anillo según la utilización: verde, ámbar desde 90 % y rojo si no cumple
  function claseUtil(u, ok) { return !ok || u > 1 ? 'mal' : u > 0.9 ? 'aviso' : 'ok'; }

  function anillos(chequeos, sel, corto) {
    return chequeos.map((c) => {
      const cls = claseUtil(c.util, c.ok), u = Math.min(1, c.util) * 100;
      return '<li><button type="button" role="tab" class="chequeo anillo ' + (c.ok ? 'ok' : 'mal') + ' u-' + cls + '" data-paso="' + c.id + '" aria-selected="' + (c.id === sel) + '">' +
        '<svg class="an-svg" viewBox="0 0 64 64" aria-hidden="true"><circle class="an-pista" cx="32" cy="32" r="26" pathLength="100"/>' +
        '<circle class="an-valor" cx="32" cy="32" r="26" pathLength="100" style="--u:' + u.toFixed(1) + '"/></svg>' +
        '<span class="an-pct num">' + f0(c.util * 100) + '%</span><span class="an-nom">' + ((corto && corto[c.id]) || c.titulo) + '</span>' +
        '<span class="sr-only">' + c.titulo + (c.ok ? ', cumple' : ', no cumple') + '</span></button></li>';
    }).join('');
  }

  function ficha(c) {
    const cls = claseUtil(c.util, c.ok);
    return '<div class="ficha-cab"><h3 class="ficha-tit">' + c.titulo + '</h3>' +
      '<span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></div>' +
      '<p class="ficha-det">' + c.det + '</p>' +
      '<div class="ficha-barra u-' + cls + '"><span class="ch-pista"><span class="ch-barra" style="width:' + Math.max(2, Math.min(1, c.util) * 100) + '%"></span></span>' +
      '<span class="num">' + f0(c.util * 100) + '% de la capacidad</span></div>' +
      '<a href="#" class="ficha-memoria" data-paso="' + c.id + '">Ver en la memoria ›</a>';
  }

  // Riel: pasos = [{ id, nombre }], completos = { id: true|false }, iconos = { id: '<path…>' }
  function riel(pasos, completos, iconos) {
    return '<span class="riel-tit">Datos</span>' + pasos.map((p) => {
      const ok = completos[p.id];
      return '<button type="button" class="cat" data-cat="' + p.id + '" title="' + p.nombre + '">' +
        '<span class="cat-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + iconos[p.id] + '</svg><span class="cat-punto ' + (ok ? 'ok' : 'falta') + '"></span></span>' +
        '<span class="cat-nom">' + p.nombre + '</span><span class="sr-only">' + (ok ? ', completo' : ', faltan datos') + '</span></button>';
    }).join('');
  }

  global.TableroComun = { claseUtil, anillos, ficha, riel };
})(window);

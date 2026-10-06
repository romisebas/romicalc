/* Renderizado de la memoria de cálculo (compartido por todos los tipos de zapata).
 * Convierte las secciones {titulo, ref, ok, items} en HTML con fórmulas KaTeX.
 */
(function (global) {
  'use strict';

  const cache = new Map();
  function tex(src) {
    if (cache.has(src)) return cache.get(src);
    let html;
    if (global.katex) {
      html = global.katex.renderToString(src, { displayMode: true, throwOnError: false, strict: 'ignore', output: 'html' });
    } else {
      html = '<code class="tex-crudo">' + src.replace(/</g, '&lt;') + '</code>';
    }
    if (cache.size > 4000) cache.clear();
    cache.set(src, html);
    return html;
  }

  // Fórmula en línea (tablas del informe)
  function texLinea(src) {
    const clave = 'L|' + src;
    if (cache.has(clave)) return cache.get(clave);
    const html = global.katex
      ? global.katex.renderToString(src, { displayMode: false, throwOnError: false, strict: 'ignore', output: 'html' })
      : '<code class="tex-crudo">' + src.replace(/</g, '&lt;') + '</code>';
    cache.set(clave, html);
    return html;
  }

  function item(it) {
    switch (it.t) {
      case 'p': return '<p class="explica">' + it.html + '</p>';
      case 'sub': return '<h4 class="paso-sub">' + it.txt + '</h4>';
      case 'nota': return '<div class="nota nota-' + it.tipo + '">' + it.html + '</div>';
      case 'ver':
        return '<div class="ec ver ' + (it.ok ? 'ok' : 'mal') + '">' +
          '<div class="ec-etq">' + it.etq + '</div>' +
          '<div class="ec-math">' + tex(it.tex) + '</div>' +
          '<span class="tag ' + (it.ok ? 'tag-ok' : 'tag-mal') + '">' + (it.ok ? 'Cumple' : 'No cumple') + '</span></div>';
      default:
        return '<div class="ec' + (it.etq ? '' : ' ec-cont') + '">' +
          '<div class="ec-etq">' + (it.etq || '') + (it.nota ? ' <span class="ec-nota">' + it.nota + '</span>' : '') + '</div>' +
          '<div class="ec-math">' + tex(it.tex) + '</div></div>';
    }
  }

  // Solo se dibujan las fórmulas de las secciones abiertas; las demás quedan pendientes
  // hasta que se abran (KaTeX es lo más costoso de cada recálculo).
  function cuerpo(sec) { return sec.items.map(item).join(''); }

  function aHtml(secciones, abiertas) {
    return secciones.map((sec, i) => {
      const abierta = !abiertas || abiertas.has(sec.id);
      return '<details class="paso" id="paso-' + sec.id + '"' + (abierta ? ' open' : '') + '>' +
      '<summary>' +
      '<span class="paso-n">' + (i + 1) + '</span>' +
      '<span class="paso-tit">' + sec.titulo + '</span>' +
      (sec.ref ? '<span class="paso-ref">' + sec.ref + '</span>' : '') +
      '<span class="tag ' + (sec.ok ? 'tag-ok' : 'tag-mal') + '">' + (sec.ok ? 'Cumple' : 'No cumple') + '</span>' +
      '</summary>' +
      '<div class="paso-cuerpo"><div class="paso-int"' + (abierta ? '' : ' data-pendiente="' + i + '"') + '>' + (abierta ? cuerpo(sec) : '') + '</div></div>' +
      '</details>';
    }).join('');
  }

  // Completa el cuerpo de una sección pendiente justo antes de abrirla.
  function completar(det, secciones) {
    const int = det.querySelector('.paso-int[data-pendiente]');
    if (!int) return;
    const sec = secciones[Number(int.dataset.pendiente)];
    if (sec) int.innerHTML = cuerpo(sec);
    int.removeAttribute('data-pendiente');
  }

  global.Memoria = { aHtml, completar, tex, texLinea };
})(window);

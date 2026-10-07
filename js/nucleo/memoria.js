/* Renderizado de los elementos de la memoria (compartido por todos los tipos de zapata).
 * Convierte cada elemento {t: p | sub | nota | eq | ver} en HTML con fórmulas KaTeX.
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
        return '<div class="ec' + (it.etq ? '' : ' ec-cont') + '"' + (it.liga ? ' data-liga="' + it.liga + '"' : '') + '>' +
          '<div class="ec-etq">' + (it.etq || '') + (it.nota ? ' <span class="ec-nota">' + it.nota + '</span>' : '') + '</div>' +
          '<div class="ec-math">' + tex(it.tex) + '</div></div>';
    }
  }

  global.Memoria = { item, tex, texLinea };
})(window);

/* Informe impreso: portada + memoria, paginado por la propia app en hojas carta exactas.
 * Cada hoja es un bloque de 215.9 × 279 mm con márgenes internos; el navegador imprime con
 * margen 0, así que no le queda espacio para su encabezado (título, URL, fecha, página).
 * Los bloques (ecuaciones, párrafos, tablas) nunca se parten: si no caben, pasan a la hoja siguiente.
 */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const MM = 96 / 25.4; // px por mm en CSS
  const HOJA = { alto: 279, margenSup: 20, margenInf: 20 }; // mm (carta: 279.4; se deja holgura)

  function fechaLarga(iso) {
    const d = iso ? new Date(iso + 'T12:00:00') : new Date();
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function listaResponsables(txt) {
    return String(txt || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }


  function itemHtml(it) {
    const tex = global.Memoria.tex;
    switch (it.t) {
      case 'p': return '<p class="inf-p">' + it.html + '</p>';
      case 'sub': return '<h4 class="inf-sub">' + it.txt + '</h4>';
      case 'nota': return '<div class="inf-nota inf-nota-' + it.tipo + '">' + it.html + '</div>';
      case 'ver':
        return '<div class="inf-ec inf-ver ' + (it.ok ? 'ok' : 'mal') + '"><div class="inf-etq">' + it.etq + '</div>' +
          '<div class="inf-math">' + tex(it.tex) + '</div><span class="inf-tag">' + (it.ok ? 'Cumple' : 'No cumple') + '</span></div>';
      default:
        return '<div class="inf-ec"><div class="inf-etq">' + (it.etq || '') + (it.nota ? '<span class="inf-ec-nota">' + it.nota + '</span>' : '') + '</div>' +
          '<div class="inf-math">' + tex(it.tex) + '</div></div>';
    }
  }

  function portada(d) {
    const i = d.info, resp = listaResponsables(i.responsables), ok = d.R.todoOk;
    return '<section class="inf-portada">' +
      '<div class="inf-portada-sup">' + global.Logo.svg('inf-logo') + '<p class="inf-tipo">Memoria de cálculo estructural</p></div>' +
      '<div class="inf-portada-centro">' +
        '<h1 class="inf-titulo">' + esc(i.titulo) + '</h1>' +
        '<dl class="inf-meta">' +
          (i.proyecto ? '<div><dt>Proyecto</dt><dd>' + esc(i.proyecto) + '</dd></div>' : '') +
          (i.elemento ? '<div><dt>Elemento</dt><dd>' + esc(i.elemento) + '</dd></div>' : '') +
          '<div><dt>Cimentación</dt><dd>Zapata ' + esc(d.tipoNombre.toLowerCase()) + '</dd></div>' +
          '<div><dt>Resultado</dt><dd>' + (ok ? 'El diseño cumple todos los chequeos' : 'El diseño no cumple todos los chequeos') + '</dd></div>' +
        '</dl>' +
      '</div>' +
      '<div class="inf-portada-inf">' +
        '<dl class="inf-firmas">' +
          (i.elaboro ? '<div><dt>Elaboró</dt><dd>' + esc(i.elaboro) + '</dd></div>' : '') +
          (resp.length ? '<div><dt>' + (resp.length > 1 ? 'Ingenieros responsables' : 'Ingeniero responsable') + '</dt><dd>' + resp.map(esc).join('<br>') + '</dd></div>' : '') +
          '<div><dt>Fecha</dt><dd>' + fechaLarga(i.fecha) + '</dd></div>' +
        '</dl>' +
        '<p class="inf-norma">Diseño según el Reglamento Colombiano de Construcción Sismo Resistente NSR-10, Título C. Unidades: tonf, m, kgf/cm².</p>' +
      '</div>' +
    '</section>';
  }

  // Lista ordenada de bloques indivisibles.
  // nueva: empieza hoja; conSiguiente: no puede quedar sola al final de una hoja (títulos).
  function bloques(d) {
    const B = [];
    const add = (html, op) => B.push(Object.assign({ html }, op || {}));
    const ok = d.R.todoOk;

    add('<h2 class="inf-h2">Resumen de resultados</h2>', { nueva: true, conSiguiente: true });
    add('<p class="inf-veredicto ' + (ok ? 'ok' : 'mal') + '">' + (ok ? 'El diseño cumple.' : 'El diseño no cumple.') + ' ' + esc(d.resumen) + '</p>');
    const L = global.Memoria.texLinea;
    add('<table class="inf-tabla inf-resumen"><thead><tr><th>Chequeo</th><th>Verificación</th><th>Utilización</th><th>Estado</th></tr></thead><tbody>' +
      d.chequeos.map((c) => '<tr><td>' + c.titulo + '</td><td class="inf-tex">' + (c.tex ? L(c.tex) : c.det) + '</td><td class="inf-mono">' + (c.util * 100).toFixed(0) + ' %</td><td class="' + (c.ok ? 'ok' : 'mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</td></tr>').join('') +
      '</tbody></table>');
    add('<h2 class="inf-h2 inf-h2-sig">Datos de entrada</h2>', { conSiguiente: true });
    // Una tabla por categoría: Parámetro, símbolo (LaTeX), valor, unidad
    d.datos.forEach((g, i) => {
      // Mismo ancho de columnas en todas las tablas para que queden alineadas entre grupos
      add('<table class="inf-tabla inf-datos"><colgroup><col style="width:44%"><col style="width:18%"><col style="width:20%"><col style="width:18%"></colgroup>' +
        (i === 0 ? '<thead><tr><th>Parámetro</th><th>Símbolo</th><th>Valor</th><th>Unidad</th></tr></thead>' : '') +
        '<tbody><tr class="inf-grupo"><th colspan="4">' + g.grupo + '</th></tr>' +
        g.filas.map((f) => f[1] || f[3]
          ? '<tr><td>' + f[0] + '</td><td class="inf-tex">' + (f[1] ? L(f[1]) : '') + '</td><td class="inf-mono">' + f[2] + '</td><td>' + (f[3] || '') + '</td></tr>'
          : '<tr><td>' + f[0] + '</td><td class="inf-mono" colspan="3">' + f[2] + '</td></tr>').join('') +
        '</tbody></table>');
    });

    add('<h2 class="inf-h2">Planos</h2>', { nueva: true, conSiguiente: true });
    const fig = (f) => '<figure>' + (f.html || '<img src="' + f.src + '" alt="' + esc(f.cap) + '">') + '<figcaption>' + f.cap + '</figcaption></figure>';
    add('<div class="inf-planos">' + d.figuras.slice(0, 2).map(fig).join('') + '</div>');
    add('<div class="inf-planos">' + d.figuras.slice(2, 4).map(fig).join('') + '</div>');
    if (d.figuras[4]) add('<div class="inf-planos inf-planos-3d">' + fig(d.figuras[4]) + '</div>');

    add('<h2 class="inf-h2">Memoria de cálculo</h2>', { nueva: true, conSiguiente: true });
    d.secciones.forEach((s, n) => {
      add('<h3 class="inf-h3"><span>' + (n + 1) + '.</span> ' + s.titulo + (s.ref ? '<small>' + s.ref + '</small>' : '') + '</h3>', { conSiguiente: true });
      s.items.forEach((it) => {
        if (it.t === 'p' && !d.conExplica) return;
        if (it.t === 'nota' && it.tipo === 'pdf') return; // las comparaciones con el documento del curso no van en el informe
        add(itemHtml(it), it.t === 'sub' ? { conSiguiente: true } : null);
      });
    });
    return B;
  }

  // Mide cada bloque en un contenedor con el ancho útil de la hoja y los reparte en hojas.
  function paginar(lista, medidor) {
    medidor.innerHTML = lista.map((b) => '<div class="inf-bloque-m">' + b.html + '</div>').join('') + '<div class="inf-bloque-m"></div>';
    const nodos = medidor.children;
    const alto = [];
    for (let k = 0; k < lista.length; k++) alto.push(nodos[k + 1].offsetTop - nodos[k].offsetTop);
    medidor.innerHTML = '';
    const util = (HOJA.alto - HOJA.margenSup - HOJA.margenInf) * MM;
    const hojas = [];
    let actual = [], usado = 0;
    const cerrar = () => { if (actual.length) hojas.push(actual); actual = []; usado = 0; };
    lista.forEach((b, k) => {
      if (b.nueva) cerrar();
      const sig = b.conSiguiente && k + 1 < lista.length ? alto[k + 1] : 0;
      if (actual.length && usado + alto[k] + sig > util) cerrar();
      actual.push(b.html);
      usado += alto[k];
    });
    cerrar();
    return hojas;
  }

  // Devuelve el HTML final: portada + hojas paginadas.
  function construir(d, medidor) {
    const hojas = paginar(bloques(d), medidor);
    return '<div class="hoja hoja-portada">' + portada(d) + '</div>' +
      hojas.map((h) => '<div class="hoja"><div class="hoja-cuerpo">' + h.map((x) => '<div class="inf-bloque-m">' + x + '</div>').join('') + '</div></div>').join('');
  }

  global.Informe = { construir, fechaLarga, esc };
})(window);

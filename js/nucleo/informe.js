/* Informe impreso (v3.3): memoria de cálculo con la estructura de una entrega profesional.
 * Portada, contenido con páginas, información general, normas y materiales, cargas y combinaciones,
 * suelo y geometría, planos, análisis y diseño (con una figura por capítulo), resultados y conclusiones, firmas.
 * Las hojas carta las pagina la propia app: el navegador imprime con margen 0 y no agrega nada.
 * Cada hoja lleva un encabezado y un pie dibujados por la app (proyecto y número de página).
 * Los bloques (ecuaciones, párrafos, tablas) nunca se parten: si no caben, pasan a la hoja siguiente.
 */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const MM = 96 / 25.4; // px por mm en CSS
  const HOJA = { alto: 279, margenSup: 22, margenInf: 20 }; // mm (carta: 279.4; se deja holgura)

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

  function figuraCapitulo(R, f, k) {
    if (!f) return '';
    const pre = 'infc' + k;
    if (f.tipo === 'planta') return global.Dibujo.planta(R, f.capa, pre);
    if (f.tipo === 'corte') return global.Dibujo.corte(R, f.dir, pre);
    return global.Figuras[f.tipo] ? global.Figuras[f.tipo](R, f.dir !== undefined ? f.dir : f.ult) : '';
  }

  function portada(d) {
    const i = d.info, resp = listaResponsables(i.responsables), ok = d.R.todoOk, U = global.Unidades.sis(d.R.inp.unid);
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
        '<p class="inf-norma">Diseño según ' + U.norma + '. Unidades: ' + U.detalle + '.</p>' +
      '</div>' +
    '</section>';
  }

  // Tabla de datos: Parámetro, símbolo (LaTeX), valor, unidad
  function tablaDatos(grupos, L) {
    return '<table class="inf-tabla inf-datos"><colgroup><col style="width:44%"><col style="width:18%"><col style="width:20%"><col style="width:18%"></colgroup>' +
      '<thead><tr><th>Parámetro</th><th>Símbolo</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>' +
      grupos.map((g) => (grupos.length > 1 ? '<tr class="inf-grupo"><th colspan="4">' + g.grupo + '</th></tr>' : '') +
        g.filas.map((f) => f[1] || f[3]
          ? '<tr><td>' + f[0] + '</td><td class="inf-tex">' + (f[1] ? L(f[1]) : '') + '</td><td class="inf-mono">' + f[2] + '</td><td>' + (f[3] || '') + '</td></tr>'
          : '<tr><td>' + f[0] + '</td><td class="inf-mono" colspan="3">' + f[2] + '</td></tr>').join('')).join('') +
      '</tbody></table>';
  }

  // Lista ordenada de bloques indivisibles.
  // nueva: empieza hoja; conSiguiente: no puede quedar sola al final de una hoja (títulos); sec: entrada del contenido.
  function bloques(d) {
    const B = [];
    const add = (html, op) => B.push(Object.assign({ html }, op || {}));
    const L = global.Memoria.texLinea, UN = global.Unidades, R = d.R, sis = R.inp.unid || 'curso', S = UN.sis(sis);
    const grupo = (nombre) => d.datos.filter((g) => g.grupo === nombre);
    let nSec = 0;
    const seccion = (titulo, nueva) => { nSec++; add('<h2 class="inf-h2"><span>' + nSec + '.</span> ' + titulo + '</h2>', { nueva: nueva !== false, conSiguiente: true, sec: nSec + '. ' + titulo }); };
    const ok = R.todoOk, i = d.info, resp = listaResponsables(i.responsables);

    seccion('Información general');
    add('<table class="inf-tabla inf-info"><tbody>' +
      (i.proyecto ? '<tr><th>Proyecto</th><td>' + esc(i.proyecto) + '</td></tr>' : '') +
      (i.elemento ? '<tr><th>Elemento</th><td>' + esc(i.elemento) + '</td></tr>' : '') +
      '<tr><th>Tipo de cimentación</th><td>Zapata ' + esc(d.tipoNombre.toLowerCase()) + ' de concreto reforzado</td></tr>' +
      (i.elaboro ? '<tr><th>Elaboró</th><td>' + esc(i.elaboro) + '</td></tr>' : '') +
      (resp.length ? '<tr><th>Responsables</th><td>' + resp.map(esc).join('<br>') + '</td></tr>' : '') +
      '<tr><th>Fecha</th><td>' + fechaLarga(i.fecha) + '</td></tr></tbody></table>');
    add('<p class="inf-p">Esta memoria presenta el diseño de una zapata aislada de concreto reforzado que recibe la carga axial y los momentos en dos direcciones de una columna. Se verifican los esfuerzos sobre el suelo, el cortante en una y dos direcciones, la flexión con su refuerzo, el aplastamiento y la longitud de desarrollo de las barras de la columna.</p>');

    seccion('Normas, materiales y unidades', false);
    add('<p class="inf-p">El diseño sigue ' + S.norma + '. Sistema de unidades: <b>' + S.nombre + '</b> (' + S.detalle + '). Las cargas mayoradas siguen las combinaciones de la NSR-10 B.2.4.</p>');
    add(tablaDatos(grupo('Materiales y factores'), L));
    add('<h4 class="inf-sub">Referencias</h4><ul class="inf-lista">' +
      '<li>Reglamento Colombiano de Construcción Sismo Resistente NSR-10, Título C, Concreto estructural.</li>' +
      (sis === 'ingles' ? '<li>ACI 318, Building Code Requirements for Structural Concrete (ecuaciones en psi).</li>' : '') +
      '<li>Diaco, Ficha técnica Malla Electrosoldada NTC 5806, versión 1.2026 (si se usa malla).</li>' +
      '<li>Método de diseño de zapatas aisladas con momento del curso Diseño de Concreto II.</li>' +
      '<li>ZapatAPP, Sebastian Romario Martinez Guerrero (software de cálculo).</li></ul>');

    seccion('Cargas y combinaciones', false);
    add(tablaDatos(grupo('Cargas de servicio'), L));
    add('<h4 class="inf-sub">Combinaciones de carga mayoradas</h4>' +
      '<table class="inf-tabla inf-comb"><thead><tr><th>Combinación</th><th>P<sub>u</sub> (' + UN.u('fuerza', sis) + ')</th><th>M<sub>xu</sub> (' + UN.u('momento', sis) + ')</th><th>M<sub>yu</sub> (' + UN.u('momento', sis) + ')</th><th>σ<sub>max</sub> (' + UN.u('presion', sis) + ')</th></tr></thead><tbody>' +
      R.ult.lista.map((c) => '<tr' + (c === R.ult.gob ? ' class="inf-gob"' : '') + '><td>' + c.id + (c === R.ult.gob ? ' (gobierna)' : '') + '</td><td class="inf-mono">' + UN.num(c.P, 'fuerza', sis) + '</td><td class="inf-mono">' + UN.num(c.Mx, 'momento', sis) + '</td><td class="inf-mono">' + UN.num(c.My, 'momento', sis) + '</td><td class="inf-mono">' + UN.num(c.su, 'presion', sis) + '</td></tr>').join('') +
      '</tbody></table>');

    seccion('Suelo y geometría', false);
    add(tablaDatos(grupo('Suelo').concat(grupo('Columna'), grupo('Zapata'), grupo('Refuerzo inferior')), L));

    seccion('Planos');
    const fig = (f) => '<figure>' + (f.html || '<img src="' + f.src + '" alt="' + esc(f.cap) + '">') + '<figcaption>' + f.cap + '</figcaption></figure>';
    add('<div class="inf-planos">' + d.figuras.slice(0, 2).map(fig).join('') + '</div>');
    add('<div class="inf-planos">' + d.figuras.slice(2, 4).map(fig).join('') + '</div>');
    if (d.figuras[4]) add('<div class="inf-planos inf-planos-3d">' + fig(d.figuras[4]) + '</div>');

    seccion('Análisis y diseño');
    d.secciones.forEach((s, k) => {
      add('<h3 class="inf-h3"><span>' + nSec + '.' + (k + 1) + '</span> ' + s.titulo + (s.ref ? '<small>' + s.ref + '</small>' : '') + '</h3>', { conSiguiente: true });
      // Una figura por capítulo: la de su última diapositiva (la de la verificación)
      const figs = (s.diapos || []).map((x) => x.fig).filter(Boolean);
      if (figs.length) add('<figure class="inf-fig-cap">' + figuraCapitulo(R, figs[figs.length - 1], k) + '</figure>');
      s.items.forEach((it) => {
        if (it.t === 'p' && !d.conExplica) return;
        if (it.t === 'nota' && it.tipo === 'pdf') return; // las comparaciones con el documento del curso no van en el informe
        add(itemHtml(it), it.t === 'sub' ? { conSiguiente: true } : null);
      });
      add('<p class="inf-cierre ' + (s.ok ? 'ok' : 'mal') + '">' + (s.ok ? 'Cumple.' : 'No cumple.') + '</p>');
    });

    seccion('Resultados y conclusiones');
    add('<p class="inf-veredicto ' + (ok ? 'ok' : 'mal') + '">' + (ok ? 'El diseño cumple.' : 'El diseño no cumple.') + ' ' + esc(d.resumen) + '</p>');
    add('<table class="inf-tabla inf-resumen"><thead><tr><th>Chequeo</th><th>Verificación</th><th>Utilización</th><th>Estado</th></tr></thead><tbody>' +
      d.chequeos.map((c) => '<tr><td>' + c.titulo + '</td><td class="inf-tex">' + (c.tex ? L(c.tex) : c.det) + '</td><td class="inf-mono">' + (c.util * 100).toFixed(0) + ' %</td><td class="' + (c.ok ? 'ok' : 'mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</td></tr>').join('') +
      '</tbody></table>');
    add('<h4 class="inf-sub">Elemento diseñado</h4><table class="inf-tabla inf-info"><tbody>' +
      '<tr><th>Dimensiones en planta</th><td>' + UN.num(R.Lx, 'longitud', sis) + ' × ' + UN.fmt(R.Ly, 'longitud', sis) + '</td></tr>' +
      '<tr><th>Altura total</th><td>' + UN.fmt(R.h, 'longitud', sis, 3) + ' (d = ' + UN.fmt(R.d, 'longitud', sis, 3) + ')</td></tr>' +
      '<tr><th>Refuerzo inferior</th><td>' + esc(global.Dibujo.refuerzoDibujo(R).etq) + '</td></tr>' +
      '<tr><th>Concreto y acero</th><td>f\'c = ' + UN.fmt(R.inp.materiales.fc, 'esfuerzo', sis) + ', fy = ' + UN.fmt(R.inp.materiales.fy, 'esfuerzo', sis) + '</td></tr></tbody></table>');
    add('<p class="inf-p">' + (ok
      ? 'Con las dimensiones y el refuerzo indicados, la zapata cumple todos los chequeos de la norma para las cargas consideradas. Los planos deben reflejar estas dimensiones, el refuerzo y los recubrimientos.'
      : 'La zapata no cumple todos los chequeos. Antes de construirla deben revisarse las dimensiones o el refuerzo hasta que todos los chequeos cumplan.') + '</p>');

    seccion('Firmas', false);
    add('<div class="inf-firmas-final">' +
      (resp.length ? resp : [i.elaboro || 'Ingeniero responsable']).map((r) => '<div class="inf-firma"><span class="inf-linea"></span><p>' + esc(r) + '</p></div>').join('') +
      '</div>');
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
    const hojas = [], secs = [];
    let actual = [], usado = 0;
    const cerrar = () => { if (actual.length) hojas.push(actual); actual = []; usado = 0; };
    lista.forEach((b, k) => {
      if (b.nueva) cerrar();
      const sig = b.conSiguiente && k + 1 < lista.length ? alto[k + 1] : 0;
      if (actual.length && usado + alto[k] + sig > util) cerrar();
      if (b.sec) secs.push({ titulo: b.sec, hoja: hojas.length });
      actual.push(b.html);
      usado += alto[k];
    });
    cerrar();
    return { hojas, secs };
  }

  // Devuelve el HTML final: portada + contenido + hojas paginadas con encabezado y pie.
  function construir(d, medidor) {
    const { hojas, secs } = paginar(bloques(d), medidor);
    const total = hojas.length + 2; // portada y contenido
    const proyecto = esc(d.info.proyecto || d.info.titulo);
    const marco = (n, cuerpo) => '<div class="hoja"><header class="hoja-enc">' + global.Logo.svg('inf-logo-mini') + '<span>' + proyecto + '</span><span>Memoria de cálculo</span></header>' +
      '<div class="hoja-cuerpo">' + cuerpo + '</div><footer class="hoja-pie"><span>ZapatAPP</span><span>Página ' + n + ' de ' + total + '</span></footer></div>';
    const contenido = '<h2 class="inf-h2">Contenido</h2><ol class="inf-toc">' +
      secs.map((s) => '<li><span>' + s.titulo + '</span><span class="inf-toc-pag">' + (s.hoja + 3) + '</span></li>').join('') + '</ol>';
    return '<div class="hoja hoja-portada">' + portada(d) + '</div>' +
      marco(2, contenido) +
      hojas.map((h, k) => marco(k + 3, h.map((x) => '<div class="inf-bloque-m">' + x + '</div>').join(''))).join('');
  }

  global.Informe = { construir, fechaLarga, esc };
})(window);

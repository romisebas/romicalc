/* Informe de salida: portada + memoria en HTML para imprimir, y exportación a Markdown con LaTeX.
 * Compartido por todos los tipos de zapata. No conoce el formulario: recibe datos ya calculados.
 */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function fechaLarga(iso) {
    const d = iso ? new Date(iso + 'T12:00:00') : new Date();
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function listaResponsables(txt) {
    return String(txt || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }

  const LOGO = '<svg class="inf-logo" viewBox="0 0 64 64" aria-hidden="true"><path class="logo-zap" d="M8 40 L32 52 L56 40 L32 28 Z M8 40 V46 L32 58 L56 46 V40 M32 52 V58"/><path class="logo-col" d="M26 31 L32 34 L38 31 V10 L32 7 L26 10 Z M32 34 V13"/></svg>';

  // ------------------------------------------------------------ HTML para imprimir
  function itemHtml(it, conExplica) {
    const tex = global.Memoria.tex;
    switch (it.t) {
      case 'p': return conExplica ? '<p class="inf-p">' + it.html + '</p>' : '';
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

  // d: { info, tipoNombre, R, secciones, datos: [[k, v]], chequeos, figuras: [{html|src, cap}], conExplica }
  function html(d) {
    const i = d.info;
    const resp = listaResponsables(i.responsables);
    const ok = d.R.todoOk;
    const portada =
      '<section class="inf-portada">' +
        '<div class="inf-portada-sup">' + LOGO + '<p class="inf-tipo">Memoria de cálculo estructural</p></div>' +
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

    const resumen =
      '<section class="inf-bloque">' +
        '<h2 class="inf-h2">Resumen de resultados</h2>' +
        '<p class="inf-veredicto ' + (ok ? 'ok' : 'mal') + '">' + (ok ? 'El diseño cumple.' : 'El diseño no cumple.') + ' ' + esc(d.resumen) + '</p>' +
        '<table class="inf-tabla"><thead><tr><th>Chequeo</th><th>Detalle</th><th>Utilización</th><th>Estado</th></tr></thead><tbody>' +
        d.chequeos.map((c) => '<tr><td>' + c.titulo + '</td><td class="inf-mono">' + c.det + '</td><td class="inf-mono">' + (c.util * 100).toFixed(0) + ' %</td><td class="' + (c.ok ? 'ok' : 'mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</td></tr>').join('') +
        '</tbody></table>' +
        '<h2 class="inf-h2">Datos de entrada</h2>' +
        '<table class="inf-tabla inf-datos"><tbody>' + d.datos.map((r) => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</tbody></table>' +
      '</section>';

    const planos =
      '<section class="inf-bloque inf-planos-sec">' +
        '<h2 class="inf-h2">Planos</h2>' +
        '<div class="inf-planos">' + d.figuras.map((f) => '<figure>' + (f.html || '<img src="' + f.src + '" alt="' + esc(f.cap) + '">') + '<figcaption>' + f.cap + '</figcaption></figure>').join('') + '</div>' +
      '</section>';

    const memoria =
      '<section class="inf-bloque">' +
        '<h2 class="inf-h2 inf-h2-memoria">Memoria de cálculo</h2>' +
        d.secciones.map((s, n) =>
          '<article class="inf-paso"><h3 class="inf-h3"><span>' + (n + 1) + '.</span> ' + s.titulo + (s.ref ? '<small>' + s.ref + '</small>' : '') + '</h3>' +
          s.items.map((it) => itemHtml(it, d.conExplica)).join('') + '</article>').join('') +
      '</section>';

    return portada + resumen + planos + memoria;
  }

  // ------------------------------------------------------------ Markdown + LaTeX
  function htmlAMd(s) {
    return String(s)
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<sub>(.*?)<\/sub>/g, '<sub>$1</sub>')
      .replace(/<(?!\/?sub>)[^>]+>/g, '');
  }

  function markdown(d) {
    const i = d.info;
    const resp = listaResponsables(i.responsables);
    const L = [];
    L.push('---');
    L.push('title: "' + String(i.titulo).replace(/"/g, '\'') + '"');
    if (i.elaboro) L.push('author: "' + String(i.elaboro).replace(/"/g, '\'') + '"');
    L.push('date: "' + fechaLarga(i.fecha) + '"');
    L.push('---', '');
    L.push('# ' + i.titulo, '');
    if (i.proyecto) L.push('**Proyecto:** ' + i.proyecto + '  ');
    if (i.elemento) L.push('**Elemento:** ' + i.elemento + '  ');
    L.push('**Cimentación:** Zapata ' + d.tipoNombre.toLowerCase() + '  ');
    if (i.elaboro) L.push('**Elaboró:** ' + i.elaboro + '  ');
    if (resp.length) L.push('**' + (resp.length > 1 ? 'Ingenieros responsables' : 'Ingeniero responsable') + ':** ' + resp.join('; ') + '  ');
    L.push('**Fecha:** ' + fechaLarga(i.fecha), '');
    L.push('Diseño según el Reglamento Colombiano de Construcción Sismo Resistente NSR-10, Título C. Unidades: tonf, m, kgf/cm².', '');

    L.push('## Resumen de resultados', '');
    L.push('**' + (d.R.todoOk ? 'El diseño cumple.' : 'El diseño no cumple.') + '** ' + d.resumen, '');
    L.push('| Chequeo | Detalle | Utilización | Estado |', '|---|---|---:|---|');
    d.chequeos.forEach((c) => L.push('| ' + c.titulo + ' | ' + c.det + ' | ' + (c.util * 100).toFixed(0) + ' % | ' + (c.ok ? 'Cumple' : 'No cumple') + ' |'));
    L.push('', '## Datos de entrada', '', '| Dato | Valor |', '|---|---|');
    d.datos.forEach((r) => L.push('| ' + r[0] + ' | ' + r[1] + ' |'));
    L.push('', '## Planos', '');
    d.figuras.forEach((f) => { if (f.archivo) L.push('![' + f.cap + '](' + f.archivo + ')', '', '*' + f.cap + '*', ''); });

    L.push('## Memoria de cálculo', '');
    d.secciones.forEach((s, n) => {
      L.push('### ' + (n + 1) + '. ' + s.titulo + (s.ref ? ' (' + s.ref + ')' : ''), '');
      s.items.forEach((it) => {
        if (it.t === 'p') { if (d.conExplica) L.push(htmlAMd(it.html), ''); }
        else if (it.t === 'sub') L.push('#### ' + it.txt, '');
        else if (it.t === 'nota') L.push('> ' + htmlAMd(it.html), '');
        else if (it.t === 'ver') L.push('**' + it.etq + '** (' + (it.ok ? 'cumple' : 'no cumple') + ')', '', '$$', it.tex, '$$', '');
        else {
          if (it.etq) L.push('**' + it.etq + '**' + (it.nota ? ' (' + it.nota + ')' : ''), '');
          L.push('$$', it.tex, '$$', '');
        }
      });
    });
    return L.join('\n');
  }

  // ------------------------------------------------------------ SVG con estilos en línea → PNG
  const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity',
    'opacity', 'font-family', 'font-size', 'font-weight', 'paint-order', 'stop-color', 'dominant-baseline'];

  // El SVG se monta en un contenedor del documento (con tema claro) para leer sus estilos calculados.
  function svgAPng(svgHtml, contenedor, escala) {
    contenedor.innerHTML = svgHtml;
    const svg = contenedor.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    const copia = svg.cloneNode(true);
    const orig = svg.querySelectorAll('*'), dest = copia.querySelectorAll('*');
    orig.forEach((el, k) => {
      const cs = getComputedStyle(el);
      const st = PROPS.map((p) => p + ':' + cs.getPropertyValue(p)).join(';');
      dest[k].setAttribute('style', st);
    });
    copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copia.setAttribute('width', vb.width);
    copia.setAttribute('height', vb.height);
    const fondo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fondo.setAttribute('width', '100%'); fondo.setAttribute('height', '100%'); fondo.setAttribute('fill', '#ffffff');
    copia.insertBefore(fondo, copia.firstChild);
    const texto = new XMLSerializer().serializeToString(copia);
    contenedor.innerHTML = '';
    return new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = vb.width * escala; c.height = vb.height * escala;
        const g = c.getContext('2d');
        g.scale(escala, escala);
        g.drawImage(img, 0, 0);
        c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo generar la imagen'))), 'image/png');
      };
      img.onerror = () => mal(new Error('No se pudo leer el dibujo'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texto);
    });
  }

  function dataUrlABlob(url) {
    const [cab, datos] = url.split(',');
    const bin = atob(datos);
    const u8 = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
    return new Blob([u8], { type: cab.slice(5).split(';')[0] });
  }

  // ------------------------------------------------------------ ZIP mínimo (sin compresión)
  let TABLA_CRC = null;
  function crc32(u8) {
    if (!TABLA_CRC) {
      TABLA_CRC = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABLA_CRC[n] = c >>> 0; }
    }
    let c = 0xFFFFFFFF;
    for (let k = 0; k < u8.length; k++) c = TABLA_CRC[(c ^ u8[k]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // archivos: [{ nombre, datos: Uint8Array }]
  function zip(archivos) {
    const enc = new TextEncoder();
    const partes = [], central = [];
    let offset = 0;
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
    archivos.forEach((a) => {
      const nombre = enc.encode(a.nombre);
      const crc = crc32(a.datos), tam = a.datos.length;
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true);
      loc.setUint16(10, hora, true); loc.setUint16(12, fecha, true); loc.setUint32(14, crc, true);
      loc.setUint32(18, tam, true); loc.setUint32(22, tam, true); loc.setUint16(26, nombre.length, true); loc.setUint16(28, 0, true);
      partes.push(new Uint8Array(loc.buffer), nombre, a.datos);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, hora, true); cen.setUint16(14, fecha, true); cen.setUint32(16, crc, true);
      cen.setUint32(20, tam, true); cen.setUint32(24, tam, true); cen.setUint16(28, nombre.length, true);
      cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), nombre);
      offset += 30 + nombre.length + tam;
    });
    const tamCentral = central.reduce((s, p) => s + p.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob(partes.concat(central, [new Uint8Array(fin.buffer)]), { type: 'application/zip' });
  }

  function slug(s) {
    return String(s || 'memoria').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '')
      .trim().replace(/\s+/g, '_').slice(0, 80) || 'memoria';
  }

  function descargar(blob, nombre) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  global.Informe = { html, markdown, svgAPng, dataUrlABlob, zip, slug, descargar, fechaLarga, esc };
})(window);

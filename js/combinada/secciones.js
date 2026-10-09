/* Pestañas Refuerzo y Memoria del tablero de la combinada (beta 1.2).
 * Refuerzo por viñetas (como la aislada): Superior, Inferior, Franja exterior, Franja interior,
 * Entre franjas, Dovelas y Despiece. Cada grupo muestra el área requerida, la tabla de barras
 * posibles y la tarjeta "Elemento elegido" (3D y dibujo acotado).
 */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const f2 = (x) => Number(x).toFixed(2);
  let grupo = 'sup', elemento = null, visor = null, capPendiente = null;

  const VINETAS = [['sup', 'Superior'], ['inf', 'Inferior'], ['tr0', 'Franja exterior'], ['tr1', 'Franja interior'], ['entre', 'Entre franjas'], ['dovelas', 'Dovelas'], ['despiece', 'Despiece']];

  // Forma de la barra con su largo recto y los ganchos de 12 db
  function forma(m) {
    const W = 120, H = 34, y = 24, g = 14;
    const d = m.forma === 'U' ? 'M10 ' + (y - g) + 'V' + y + 'H' + (W - 10) + 'V' + (y - g)
      : m.forma === 'L' ? 'M10 ' + (y - g) + 'V' + y + 'H' + (W - 10) : 'M10 ' + y + 'H' + (W - 10);
    return '<svg class="mesa-forma" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Forma ' + m.forma + '"><path d="' + d + '"/></svg>';
  }

  function datosGrupo(R, id) {
    return {
      sup: { tit: 'Longitudinal superior', ruta: 'acero.barSup', As: R.fl.sup.As, sel: R.fl.sup.sel, b: R.B, dir: 'a lo largo (arriba)', nota: 'Momento negativo entre columnas. Las barras pasan cada punto de inflexión una longitud e = máx(d, 12 d<sub>b</sub>, l<sub>n</sub>/16, l<sub>s</sub>) (NSR-10 C.12.12.3); desde ahí traslapan con la mínima.' },
      inf: { tit: 'Longitudinal inferior', ruta: 'acero.barInf', As: R.fl.inf.As, sel: R.fl.inf.sel, b: R.B, dir: 'a lo largo (abajo)', nota: 'Momento positivo bajo las columnas; suele gobernar el acero mínimo.' },
      tr0: { tit: 'Franja exterior', ruta: 'acero.barTrans', As: R.tr[0].fl.As, sel: R.tr[0].sel, b: R.tr[0].b, dir: 'a lo ancho', nota: 'Voladizo transversal bajo la columna exterior. Las tres franjas comparten la barra.' },
      tr1: { tit: 'Franja interior', ruta: 'acero.barTrans', As: R.tr[1].fl.As, sel: R.tr[1].sel, b: R.tr[1].b, dir: 'a lo ancho', nota: 'Voladizo transversal bajo la columna interior. Las tres franjas comparten la barra.' },
      entre: { tit: 'Entre franjas', ruta: 'acero.barTrans', As: R.entre.As, sel: R.entre.sel, b: R.entre.b, dir: 'a lo ancho', nota: 'Acero mínimo de retracción, 0.0018·b·h, fuera de las franjas.' },
    }[id];
  }

  // Tabla de barras posibles, igual a la de la aislada
  function tabla(g) {
    const U = global.Unidades;
    if (!g.sel || !g.sel.ops.length) return '<p class="ayuda txt-mal">Ninguna barra cumple: la sección no alcanza a flexión. Aumente d.</p>';
    const filas = g.sel.ops.map((o) =>
      '<tr class="est-' + o.estado + (o.barra === g.sel.barra ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="c-barra" data-ruta="' + g.ruta + '" value="' + o.barra + '"' + (o.barra === g.sel.barra ? ' checked' : '') + '> #' + o.barra + '</label></td>' +
      '<td class="num">' + o.n + '</td><td class="num">' + U.num(o.s, 'longitud') + '</td><td class="num">' + U.num(o.AsProv, 'acero') + '</td>' +
      '<td class="num">' + Math.round(o.ratio * 100) + '%</td>' +
      '<td><span class="punto est-' + o.estado + '" aria-hidden="true"></span><span class="motivo">' + o.motivo + (o.gobiernaSmax && o.estado !== 'mal' ? ', por smax' : '') + '</span></td></tr>').join('');
    return '<h3>' + g.tit + '<small>A<sub>s</sub> requerido ' + U.fmt(g.As, 'acero') + ', repartido en ' + U.fmt(g.b, 'longitud') + '</small></h3>' +
      '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Barra</th><th>n</th><th>s (' + U.u('longitud') + ')</th><th>As prov. (' + U.u('acero') + ')</th><th>Prov./req.</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function despiece(R) {
    const D = R.despiece;
    return '<div class="mesa-tabla-marco"><table class="mesa-tabla" id="mesa-despiece"><thead><tr><th>Marca</th><th>Descripción</th><th>Barra</th><th class="num">Cant.</th><th>Forma</th><th class="num">Largo (m)</th><th class="num">Peso (kg)</th></tr></thead><tbody>' +
      D.marcas.map((m) => '<tr><td><b>' + m.marca + '</b></td><td>' + m.desc + '</td><td>#' + m.barra + '</td><td class="num">' + m.n + '</td><td>' + forma(m) + '</td><td class="num">' + f2(m.largo) + '</td><td class="num">' + m.kg.toFixed(1) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="6">Total</td><td class="num">' + D.total.toFixed(1) + ' kg</td></tr></tfoot></table></div>' +
      '<p class="ayuda">Ganchos de 12 d<sub>b</sub>. L1 pasa los puntos de inflexión una longitud e y la mínima superior llega hasta ellos (traslapo clase B, C.12.15.1); las dovelas incluyen el empalme a compresión con la columna.</p>' +
      '<div class="fila-btn"><button type="button" class="btn btn-quieto" id="mesa-copiar">Copiar tabla</button></div>';
  }

  function dovelas(R) {
    const U = global.Unidades;
    return '<div class="aceros">' + R.inp.columnas.map((c, i) => {
      const l = R.ld.dovelas[i];
      return '<div class="acero-dir"><h3>Columna ' + (i ? 'interior' : 'exterior') + '<small>' + c.nBarras + ' barras #' + c.barra + '</small></h3>' +
        '<ul class="wz-chequeos"><li class="' + (l.ok ? 'ok' : 'mal') + '"><span>Desarrollo a compresión l<sub>dc</sub> = ' + l.ldc.toFixed(0) + ' mm ≤ d = ' + (R.d * 1000).toFixed(0) + ' mm</span>' +
        '<span class="tag ' + (l.ok ? 'tag-ok' : 'tag-mal') + '">' + (l.ok ? 'Cumple' : 'No cumple') + '</span></li>' +
        '<li class="' + (R.ap[i].ok ? 'ok' : 'mal') + '"><span>Aplastamiento: P<sub>u</sub> = ' + U.fmt(R.cols[i].Pu, 'fuerza') + ' ≤ φP<sub>nb</sub> = ' + U.fmt(Math.max(R.ap[i].phiPnb1, R.ap[i].phiPnb2), 'fuerza') + '</span>' +
        '<span class="tag ' + (R.ap[i].ok ? 'tag-ok' : 'tag-mal') + '">' + (R.ap[i].ok ? 'Cumple' : 'No cumple') + '</span></li></ul></div>';
    }).join('') + '</div><div class="fila-btn"><button type="button" class="btn btn-quieto" data-editar-columnas>Cambiar las barras de las columnas</button></div>';
  }

  function refuerzo(R) {
    const cont = $('#c-refuerzo');
    if (!cont.dataset.listo) {
      cont.dataset.listo = '1';
      cont.innerHTML = '<div class="ref-cab"><h2 class="ref-tit">Refuerzo</h2><p class="ref-sub">Elige la barra de cada grupo en su tabla. El despiece reúne todas las barras.</p>' +
        '<div class="seg seg-grande seg-vinetas" role="tablist" aria-label="Grupo de refuerzo" id="c-grupos">' +
        VINETAS.map(([v, t]) => '<button type="button" role="tab" data-grupo="' + v + '" aria-selected="' + String(v === grupo) + '">' + t + '</button>').join('') + '</div></div>' +
        '<section class="elegido" id="c-elegido" aria-labelledby="c-elegido-tit"><div class="elegido-cab"><div><p class="elegido-eti">Elemento elegido</p><h3 class="elegido-tit" id="c-elegido-tit"></h3></div></div>' +
        '<div class="elegido-vistas"><div class="elegido-3d" id="c-elegido-3d" role="img" aria-label="Vista 3D de la barra elegida"></div><figure class="elegido-2d" id="c-elegido-2d"></figure></div></section>' +
        '<p class="ayuda" id="c-grupo-nota"></p><div id="c-grupo"></div>';
      if (global.THREE) elemento = global.Elemento.crear($('#c-elegido-3d'));
      cont.querySelector('#c-grupos').addEventListener('click', (e) => {
        const b = e.target.closest('[data-grupo]');
        if (!b) return;
        grupo = b.dataset.grupo;
        refuerzo(global.Mesa.resultado());
      });
      global.Mesa._moverGrupos = global.Mov.segmentado(cont.querySelector('#c-grupos'));
      cont.addEventListener('change', (e) => { if (e.target.name === 'c-barra') global.Mesa.ajustar(e.target.dataset.ruta, Number(e.target.value)); });
    }
    cont.querySelectorAll('#c-grupos [data-grupo]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.grupo === grupo)));
    if (global.Mesa._moverGrupos) global.Mesa._moverGrupos();
    const conElemento = !['despiece'].includes(grupo);
    $('#c-elegido').hidden = !conElemento;
    if (grupo === 'despiece') { $('#c-grupo-nota').textContent = ''; $('#c-grupo').innerHTML = despiece(R); return; }
    if (grupo === 'dovelas') {
      $('#c-grupo-nota').textContent = 'Las dovelas transmiten la carga de la columna a la zapata y se anclan con un gancho sobre la parrilla inferior.';
      $('#c-grupo').innerHTML = dovelas(R);
      mostrarElemento({ barra: R.inp.columnas[1].barra, n: R.inp.columnas[1].nBarras, sTxt: '—', dir: 'la columna interior' }, 'Dovelas #' + R.inp.columnas[1].barra);
      return;
    }
    const g = datosGrupo(R, grupo);
    $('#c-grupo-nota').innerHTML = g.nota;
    $('#c-grupo').innerHTML = '<div class="acero-dir">' + tabla(g) + '</div>';
    if (g.sel && g.sel.ops.length) mostrarElemento({ barra: g.sel.barra, n: g.sel.n, sTxt: global.Unidades.fmt(g.sel.s, 'longitud'), dir: g.dir }, g.tit + ': ' + g.sel.resumen);
    else { $('#c-elegido-tit').textContent = g.tit + ': sin solución'; $('#c-elegido-2d').innerHTML = ''; }
  }

  function mostrarElemento(o, titulo) {
    const b = global.Refuerzo.BARS[o.barra];
    const e = { tipo: 'barra', barra: o.barra, db: b.db, A: b.A, n: o.n, sTxt: o.sTxt, dir: o.dir };
    $('#c-elegido-tit').textContent = titulo;
    $('#c-elegido-2d').innerHTML = global.Elemento.svg2d(e);
    if (elemento) elemento.mostrar(e);
  }

  // Memoria: su propio visor de diapositivas, con las correcciones al documento arriba
  function memoria(R) {
    if (!visor) visor = global.Diapositivas.crear($('#mesa-memoria'), { prefijo: 'mdiapo', ligas: global.MemoriaCombinada.LIGAS });
    const notas = global.MemoriaCombinada.correcciones(R);
    $('#mesa-correcciones').innerHTML = notas.length
      ? '<details><summary>Correcciones respecto al documento (' + notas.length + ')</summary><ul>' + notas.map((x) => '<li>' + x + '</li>').join('') + '</ul></details>' : '';
    visor.datos(global.MemoriaCombinada.generar(R), R);
    if (capPendiente) { visor.ir(capPendiente); capPendiente = null; }
  }

  function pintar(p, R) {
    if (!R) return;
    if (p === 'refuerzo') refuerzo(R);
    if (p === 'memoria') memoria(R);
  }

  function texto(R) {
    return ['Marca\tDescripción\tBarra\tCantidad\tForma\tLargo (m)\tPeso (kg)']
      .concat(R.despiece.marcas.map((m) => [m.marca, m.desc, '#' + m.barra, m.n, m.forma, f2(m.largo), m.kg.toFixed(1)].join('\t')))
      .concat(['Total\t\t\t\t\t\t' + R.despiece.total.toFixed(1)]).join('\n');
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#mesa [data-editar-columnas]')) { const a = global.Mesa.asistente(); a.abrir(a.indice('columnas'), 'editar', e.target); return; }
    if (e.target.closest('#mesa-copiar')) {
      const R = global.Mesa.resultado();
      const ok = () => global.App.avisar('Tabla de despiece copiada.');
      try { navigator.clipboard.writeText(texto(R)).then(ok, () => global.App.avisar('No se pudo copiar la tabla.')); } catch (ex) { global.App.avisar('No se pudo copiar la tabla.'); }
    }
  });

  global.MesaSecciones = { pintar, irCapitulo: (cap) => { capPendiente = cap; }, VINETAS };
})(window);

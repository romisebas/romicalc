/* Pestañas Refuerzo y Despiece de la mesa de la combinada (beta 1.2).
 * Refuerzo: una tarjeta por grupo de acero con el área requerida y las barras posibles.
 * Despiece: lista de barras por marca con forma, largo, cantidad y peso, más el total.
 */
(function (global) {
  'use strict';

  const f2 = (x) => Number(x).toFixed(2);

  // Forma de la barra con su largo recto y los ganchos de 12 db
  function forma(m) {
    const W = 120, H = 34, y = 24, g = 14;
    const d = m.forma === 'U' ? 'M10 ' + (y - g) + 'V' + y + 'H' + (W - 10) + 'V' + (y - g)
      : m.forma === 'L' ? 'M10 ' + (y - g) + 'V' + y + 'H' + (W - 10) : 'M10 ' + y + 'H' + (W - 10);
    return '<svg class="mesa-forma" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Forma ' + m.forma + '"><path d="' + d + '"/></svg>';
  }

  function grupos(R) {
    return [
      { id: 'sup', tit: 'Longitudinal superior', ruta: 'acero.barSup', As: R.fl.sup.As, sel: R.fl.sup.sel, nota: 'Momento negativo entre columnas.' },
      { id: 'inf', tit: 'Longitudinal inferior', ruta: 'acero.barInf', As: R.fl.inf.As, sel: R.fl.inf.sel, nota: 'Momento positivo bajo las columnas.' },
      { id: 'tr0', tit: 'Franja exterior', ruta: 'acero.barTrans', As: R.tr[0].fl.As, sel: R.tr[0].sel, nota: 'Voladizo transversal bajo la columna exterior.' },
      { id: 'tr1', tit: 'Franja interior', ruta: 'acero.barTrans', As: R.tr[1].fl.As, sel: R.tr[1].sel, nota: 'Voladizo transversal bajo la columna interior.' },
      { id: 'entre', tit: 'Entre franjas', ruta: 'acero.barTrans', As: R.entre.As, sel: R.entre.sel, nota: 'Acero mínimo de retracción (0.0018·b·h).' },
    ];
  }

  function refuerzo(R, cont) {
    const U = global.Unidades;
    cont.innerHTML = '<p class="mesa-ayuda">Las tres franjas transversales comparten el diámetro elegido.</p>' +
      '<div class="mesa-aceros">' + grupos(R).filter((g) => g.sel).map((g) =>
        '<article class="mesa-grupo-acero" data-grupo="' + g.id + '"><h3>' + g.tit + '</h3><p class="mesa-ayuda">' + g.nota + '</p>' +
        '<p class="mesa-req">A<sub>s</sub> requerido <b class="num">' + U.fmt(g.As, 'acero') + '</b></p>' +
        '<p class="mesa-sel num">' + g.sel.resumen + '</p>' +
        '<div class="mesa-ops" role="group" aria-label="Barra para ' + g.tit.toLowerCase() + '">' + g.sel.ops.map((o) =>
          '<button type="button" class="mesa-op est-' + o.estado + '" data-ruta="' + g.ruta + '" data-barra="' + o.barra + '" aria-pressed="' + String(o.barra === g.sel.barra) + '" title="' + o.n + ' #' + o.barra + ' @ ' + f2(o.s) + ' m · ' + o.motivo + '">#' + o.barra + '</button>').join('') +
        '</div></article>').join('') + '</div>';
  }

  function despiece(R, cont) {
    const D = R.despiece;
    cont.innerHTML = '<div class="mesa-tabla-marco"><table class="mesa-tabla" id="mesa-despiece"><thead><tr><th>Marca</th><th>Descripción</th><th>Barra</th><th class="num">Cant.</th><th>Forma</th><th class="num">Largo (m)</th><th class="num">Peso (kg)</th></tr></thead><tbody>' +
      D.marcas.map((m) => '<tr><td><b>' + m.marca + '</b></td><td>' + m.desc + '</td><td>#' + m.barra + '</td><td class="num">' + m.n + '</td><td>' + forma(m) + '</td><td class="num">' + f2(m.largo) + '</td><td class="num">' + m.kg.toFixed(1) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="6">Total</td><td class="num">' + D.total.toFixed(1) + ' kg</td></tr></tfoot></table></div>' +
      '<p class="mesa-ayuda">Ganchos de 12 d<sub>b</sub>. Las barras superiores se cortan a l<sub>d</sub> de los puntos de inflexión; las dovelas incluyen el empalme a compresión con la columna.</p>' +
      '<button type="button" class="btn btn-quieto" id="mesa-copiar">Copiar tabla</button>';
  }

  function texto(R) {
    return ['Marca\tDescripción\tBarra\tCantidad\tForma\tLargo (m)\tPeso (kg)']
      .concat(R.despiece.marcas.map((m) => [m.marca, m.desc, '#' + m.barra, m.n, m.forma, f2(m.largo), m.kg.toFixed(1)].join('\t')))
      .concat(['Total\t\t\t\t\t\t' + R.despiece.total.toFixed(1)]).join('\n');
  }

  function pintarExtra(p, R, cont) {
    if (!cont || !['refuerzo', 'despiece'].includes(p)) return;
    if (!R) { cont.innerHTML = '<p class="mesa-ayuda">Completa los datos para ver esta sección.</p>'; return; }
    (p === 'refuerzo' ? refuerzo : despiece)(R, cont);
  }

  document.addEventListener('click', (e) => {
    const op = e.target.closest('#mesa .mesa-op');
    if (op) { global.Mesa.ajustar(op.dataset.ruta, Number(op.dataset.barra)); return; }
    if (e.target.closest('#mesa-copiar')) {
      const R = global.Mesa.resultado();
      const ok = () => global.App.avisar('Tabla de despiece copiada.');
      try { navigator.clipboard.writeText(texto(R)).then(ok, () => global.App.avisar('No se pudo copiar la tabla.')); } catch (ex) { global.App.avisar('No se pudo copiar la tabla.'); }
    }
  });

  global.Mesa.pintarExtra = pintarExtra;
})(window);

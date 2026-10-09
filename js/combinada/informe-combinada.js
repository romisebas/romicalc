/* Datos del informe PDF de la zapata combinada (beta 1.2) para Informe.construir.
 * La app usa el mismo diálogo y la misma paginación que la aislada; aquí se arman las partes propias:
 * descripción, datos de entrada, combinaciones, planos, capítulos de la memoria y elemento diseñado.
 */
(function (global) {
  'use strict';

  function hoyIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function info(e) {
    const i = e.informe || {};
    return { titulo: i.titulo || 'Memoria de cálculo de cimentación' + (e.proyecto.elemento ? ' ' + e.proyecto.elemento : ''),
      proyecto: e.proyecto.nombre || '', elemento: e.proyecto.elemento || '', elaboro: i.elaboro || '', responsables: i.responsables || '', fecha: i.fecha || hoyIso() };
  }

  function datosEntrada(R) {
    const U = global.Unidades, I = R.inp, m = (x, mag) => U.num(x == null ? 0 : x, mag), u = (mag) => U.u(mag), v = (x) => String(x == null ? 0 : x);
    const col = (c, i) => [
      ['Columna ' + (i ? 'interior' : 'exterior') + ': carga muerta', 'D_' + (i + 1), m(c.D, 'fuerza'), u('fuerza')],
      ['Columna ' + (i ? 'interior' : 'exterior') + ': carga viva', 'L_' + (i + 1), m(c.L, 'fuerza'), u('fuerza')],
      ['Columna ' + (i ? 'interior' : 'exterior') + ': sismo vertical', 'E_' + (i + 1), m(c.E, 'fuerza'), u('fuerza')]];
    return [
      { grupo: 'Cargas de servicio', filas: col(I.columnas[0], 0).concat(col(I.columnas[1], 1),
        [['Coeficiente de disipación', 'R', R.R.toFixed(2), ''], ['Aumento del admisible con sismo', '', v(I.suelo.factorSismo), '']]) },
      { grupo: 'Suelo', filas: [['Esfuerzo admisible', '\\sigma_{adm}', m(I.suelo.qadm, 'presion'), u('presion')]] },
      { grupo: 'Columna', filas: I.columnas.map((c, i) => ['Columna ' + (i ? 'interior' : 'exterior'), 'c_1 \\times c_2', m(c.c1, 'longitud') + ' × ' + m(c.c2, 'longitud'), u('longitud')])
        .concat([['Voladizo exterior', 'a', m(I.geometria.a, 'longitud'), u('longitud')], ['Separación entre centros', 's', m(I.geometria.s, 'longitud'), u('longitud')]]) },
      { grupo: 'Materiales y factores', filas: [['Resistencia del concreto', "f'_c", m(I.materiales.fc, 'esfuerzo'), u('esfuerzo')], ['Fluencia del acero', 'f_y', m(I.materiales.fy, 'esfuerzo'), u('esfuerzo')],
        ['Factor de concreto liviano', '\\lambda', v(I.materiales.lambda), ''], ['Reducción a cortante', '\\phi_v', v(I.materiales.phiV), ''],
        ['Reducción a flexión', '\\phi_f', v(I.materiales.phiF), ''], ['Reducción a aplastamiento', '\\phi_b', v(I.materiales.phiB), '']] },
      { grupo: 'Zapata', filas: [['Largo', 'L', m(R.L, 'longitud'), u('longitud')], ['Ancho', 'B', m(R.B, 'longitud'), u('longitud')],
        ['Altura efectiva', 'd', U.num(R.d, 'longitud', null, 3), u('longitud')], ['Altura total', 'h', U.num(R.h, 'longitud', null, 3), u('longitud')]] },
    ];
  }

  function tablaCombos(R) {
    const U = global.Unidades;
    return '<table class="inf-tabla inf-comb"><thead><tr><th>Combinación</th><th>P<sub>u1</sub> (' + U.u('fuerza') + ')</th><th>P<sub>u2</sub> (' + U.u('fuerza') + ')</th><th>ΣP<sub>u</sub> (' + U.u('fuerza') + ')</th></tr></thead><tbody>' +
      R.ult.lista.map((c) => '<tr' + (c.id === R.ult.combo ? ' class="inf-gob"' : '') + '><td>' + c.id + (c.id === R.ult.combo ? ' (gobierna)' : '') + '</td><td class="inf-mono">' + U.num(c.P[0], 'fuerza') +
        '</td><td class="inf-mono">' + U.num(c.P[1], 'fuerza') + '</td><td class="inf-mono">' + U.num(c.suma, 'fuerza') + '</td></tr>').join('') + '</tbody></table>';
  }

  function datos(estado, R, conExplica) {
    const U = global.Unidades, D = global.DibujoCombinada;
    return {
      info: info(estado), tipoNombre: 'Combinada', R, conExplica,
      secciones: global.MemoriaCombinada.generar(R), datos: datosEntrada(R), chequeos: R.chequeos,
      resumen: R.resumen + ' Gobierna ' + R.ult.combo + '.',
      descripcion: 'Esta memoria presenta el diseño de una zapata combinada de concreto reforzado que recibe la carga axial de dos columnas, la exterior junto al lindero. Se dimensiona en planta para que la presión del suelo sea uniforme y se analiza como una viga invertida en el sentido largo y por franjas bajo cada columna en el sentido corto. Se verifican la presión del suelo, el punzonamiento, el cortante, la flexión, el aplastamiento y la longitud de desarrollo, y se incluye el despiece.' +
        (R.inp.metodo === 'documento' ? ' Se usa el método del documento del curso (presión uniforme).' : ''),
      metodoRef: 'Método de diseño de zapatas combinadas del curso Diseño de Concreto II (Ing. Gustavo A. Chang Nieto).',
      tablaCombos: tablaCombos(R),
      figuras: [
        { html: D.planta(R, 'infp'), cap: 'Planta con franjas y presión de servicio' },
        { html: D.corteLongitudinal(R), cap: 'Corte longitudinal' },
        { html: D.corteTransversal(R, 0), cap: 'Corte bajo la columna exterior' },
        { html: D.corteTransversal(R, 1), cap: 'Corte bajo la columna interior' },
      ],
      elemento: [
        ['Dimensiones en planta', U.num(R.L, 'longitud') + ' × ' + U.fmt(R.B, 'longitud')],
        ['Altura total', U.fmt(R.h, 'longitud', null, 3) + ' (d = ' + U.fmt(R.d, 'longitud', null, 3) + ')'],
        ['Acero longitudinal', 'Superior ' + R.fl.sup.sel.resumen + '; inferior ' + R.fl.inf.sel.resumen],
        ['Acero transversal', 'Franjas ' + R.tr[0].sel.resumen + ' y ' + R.tr[1].sel.resumen + (R.entre.sel ? '; entre franjas ' + R.entre.sel.resumen : '')],
        ['Acero superior mínimo', (R.supMin.tramos.length ? R.supMin.tramos.map((t) => t.marca).join(' y ') + ' ' + R.supMin.sel.resumen + '; ' : '') + 'repartición ' + R.supMin.trans.sel.resumen],
        ['Peso del acero', R.despiece.total.toFixed(1) + ' kg'],
      ],
    };
  }

  // Fuente para el diálogo del informe de la app
  function fuente(estado, resultado, guardar) {
    return { info: () => info(estado), guardar, datos: (conExplica) => datos(estado, resultado(), conExplica) };
  }

  global.InformeCombinada = { fuente, datos };
})(window);

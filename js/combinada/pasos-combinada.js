/* Pasos del asistente de la zapata combinada (beta 1.2) y nombres de sus campos.
 * PasosCombinada.crear(ctx) → lista de pasos para Asistente.crear.
 * ctx: { estado(), resultado(), planta(), error(), alMover(), proponerD() }
 */
(function (global) {
  'use strict';

  const campo = (o) => global.Asistente.campo(o);
  const COL = ['exterior', 'interior'];

  // Nombre legible de cada ruta (para "Faltan: …")
  function nombre(k) {
    const m = k.match(/^columnas\.(\d)\.(\w+)$/);
    const N = { c1: 'c₁', c2: 'c₂', D: 'D', L: 'L', E: 'E', barra: 'barra', nBarras: 'n.º de barras' };
    if (m) return N[m[2]] + ' de la columna ' + COL[m[1]];
    return ({ 'geometria.s': 'separación s', 'geometria.a': 'voladizo a', 'geometria.L': 'L', 'geometria.B': 'B', 'sismo.R0': 'R₀', 'sismo.phiA': 'φa',
      'sismo.phiP': 'φp', 'sismo.phiR': 'φr', 'suelo.qadm': 'σadm', 'suelo.factorSismo': 'aumento con sismo', 'materiales.fc': "f'c", 'materiales.fy': 'fy',
      'materiales.lambda': 'λ', 'materiales.phiV': 'φ cortante', 'materiales.phiF': 'φ flexión', 'materiales.phiB': 'φ aplastamiento', 'zapata.d': 'd', 'zapata.r': 'r' })[k] || k;
  }

  // Íconos del riel (trazos de 24 × 24)
  const ICONOS = {
    proyecto: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>',
    columnas: '<path d="M5 4h4v16H5zM15 4h4v16h-4z"/><path d="M3 20h18"/>',
    cargas: '<path d="M7 3v12M4 12l3 3 3-3M17 3v12M14 12l3 3 3-3"/><path d="M3 20h18"/>',
    sismo: '<path d="M2 12h3l2-6 3 12 3-9 2 6 2-3h5"/>',
    suelo: '<path d="M3 9h18"/><path d="M5 13h2M10 13h2M15 13h2M7 17h2M12 17h2M17 17h2"/>',
    materiales: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>',
    ubicacion: '<path d="M3 17h18"/><path d="M6 17V9h3v8M15 17V9h3v8"/><path d="M12 5v4M10 7h4"/>',
    altura: '<path d="M4 15h16v4H4z"/><path d="M12 3v9M9 6l3-3 3 3M9 9l3 3 3-3"/>',
  };

  const tablaColumnas = (filas) => '<table class="tabla-cargas"><thead><tr><th></th>' + filas.map((f) => '<th>' + f.etq + (f.mag ? ' <small data-u="' + f.mag + '">' + global.Unidades.u(f.mag) + '</small>' : '') + '</th>').join('') + '</tr></thead><tbody>' +
    [0, 1].map((i) => '<tr><th>' + (i ? 'Interior' : 'Exterior') + '</th>' + filas.map((f) => '<td>' + soloControl(Object.assign({}, f, { k: 'columnas.' + i + '.' + f.c })) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  // El control sin su etiqueta (para las tablas)
  function soloControl(o) {
    const html = campo(Object.assign({}, o, { etq: '' }));
    return html.replace(/^<label[^>]*>(?: <small[^>]*>[^<]*<\/small>)?/, '').replace(/<\/label>$/, '');
  }

  const seg = (k, opciones, actual) => '<div class="seg seg-sm" role="group">' + opciones.map(([v, t]) => '<button type="button" data-modo="' + k + '" data-v="' + v + '" aria-pressed="' + String(actual === v) + '">' + t + '</button>').join('') + '</div>';

  const QUE_CAMBIA = '<details class="que-cambia"><summary>¿Qué cambia?</summary><table class="tabla-acero"><thead><tr><th></th><th>Documento</th><th>Corregido</th></tr></thead><tbody>' +
    '<tr><th>Presión última</th><td>Uniforme: q = ΣP<sub>u</sub>/(L·B)</td><td>Lineal, con la resultante mayorada en su sitio (equilibrio exacto)</td></tr>' +
    '<tr><th>Acero mínimo</th><td>0.0018·b·d</td><td>0.0018·b·h (NSR-10 C.7.12)</td></tr>' +
    '<tr><th>Cortante longitudinal</th><td>V<sub>u</sub> del centro escalado: V<sub>u</sub>(X − d)/X</td><td>Cortante exacto a d de la cara de cada columna</td></tr>' +
    '<tr><th>Chequeos</th><td>Los del documento</td><td>Agrega punzonamiento, aplastamiento y desarrollo</td></tr></tbody></table>' +
    '<p class="ayuda">Con el ejemplo del curso: A<sub>s</sub>⁺ 41.62 → 45.90 cm², V<sub>ud</sub> 106.46 → 96.94 tonf.</p></details>';

  function crear(ctx) {
    const nsr = (rutas) => '<div class="fila-btn"><button type="button" class="btn" data-nsr="' + rutas.join(',') + '">Usar valores de la NSR-10</button></div>';
    const barras = Object.keys(global.Refuerzo.BARS).map((n) => [n, '#' + n]);

    return [
      { id: 'proyecto', nombre: 'Proyecto', titulo: 'Datos del proyecto',
        html: () => '<p class="ayuda">Estos datos identifican el proyecto y salen en la portada del PDF. Ninguno es obligatorio.</p><div class="campos dos">' +
          campo({ k: 'proyecto.nombre', etq: 'Nombre del proyecto', tipo: 'texto', placeholder: 'Edificio Las Acacias' }) +
          campo({ k: 'proyecto.elemento', etq: 'Elemento', tipo: 'texto', placeholder: 'Nudos 186 y 187' }) +
          campo({ k: 'informe.elaboro', etq: 'Elaboró', tipo: 'texto', ancho: true }) +
          campo({ k: 'informe.responsables', etq: 'Ingenieros responsables <small>uno por línea</small>', tipo: 'textarea', ancho: true }) + '</div>' },
      { id: 'columnas', nombre: 'Columnas', titulo: 'Columnas',
        html: () => '<p class="ayuda">c₁ va a lo largo de la zapata y c₂ a lo ancho. La barra y el número de barras de cada columna sirven para las dovelas.</p>' +
          tablaColumnas([{ c: 'c1', etq: 'c₁', mag: 'longitud', paso: 0.05 }, { c: 'c2', etq: 'c₂', mag: 'longitud', paso: 0.05 },
            { c: 'barra', etq: 'Barra', tipo: 'select', opciones: barras }, { c: 'nBarras', etq: 'n.º', tipo: 'int', paso: 1 }]) },
      { id: 'cargas', nombre: 'Cargas', titulo: 'Cargas de servicio',
        html: () => '<p class="ayuda">Reacciones en la base de cada columna: carga muerta D (PP+CM), viva L (CV) y la fuerza sísmica vertical E de la tabla de reacciones (se divide por R).</p>' +
          tablaColumnas([{ c: 'D', etq: 'D', mag: 'fuerza' }, { c: 'L', etq: 'L', mag: 'fuerza' }, { c: 'E', etq: 'E', mag: 'fuerza' }]) },
      { id: 'sismo', nombre: 'Sismo', titulo: 'Coeficiente de disipación',
        html: () => '<p class="ayuda">R = R₀·φa·φp·φr reduce la fuerza sísmica (E = F<sub>s</sub>/R). Pórtico DMO: R₀ = 5.</p><div class="campos dos">' +
          campo({ k: 'sismo.R0', etq: 'R₀', paso: 0.5 }) + campo({ k: 'sismo.phiA', etq: 'φa', paso: 0.05 }) + campo({ k: 'sismo.phiP', etq: 'φp', paso: 0.05 }) + campo({ k: 'sismo.phiR', etq: 'φr', paso: 0.05 }) +
          '</div><p class="msg" data-vivo="R"></p>' + nsr(['sismo.phiA', 'sismo.phiP', 'sismo.phiR']),
        vivo: (sec) => { const s = ctx.estado().sismo, R = s.R0 * s.phiA * s.phiP * s.phiR; sec.querySelector('[data-vivo="R"]').textContent = isFinite(R) && R > 0 ? 'R = ' + R.toFixed(2) : ''; } },
      { id: 'suelo', nombre: 'Suelo', titulo: 'Suelo de cimentación',
        html: () => '<p class="ayuda">Esfuerzo admisible del estudio de suelos. Con sismo se permite aumentarlo (el documento usa 1.33).</p><div class="campos dos">' +
          campo({ k: 'suelo.qadm', etq: 'σadm', mag: 'presion', paso: 0.5 }) + campo({ k: 'suelo.factorSismo', etq: 'Aumento con sismo', paso: 0.01 }) + '</div>' + nsr(['suelo.factorSismo']) },
      { id: 'materiales', nombre: 'Materiales', titulo: 'Materiales y método',
        html: () => '<div class="campos dos">' + campo({ k: 'materiales.fc', etq: "f'c", mag: 'esfuerzo', paso: 10 }) + campo({ k: 'materiales.fy', etq: 'fy', mag: 'esfuerzo', paso: 100 }) +
          campo({ k: 'materiales.lambda', etq: 'λ', paso: 0.05 }) + campo({ k: 'materiales.phiV', etq: 'φ cortante', paso: 0.05 }) +
          campo({ k: 'materiales.phiF', etq: 'φ flexión', paso: 0.05 }) + campo({ k: 'materiales.phiB', etq: 'φ aplastamiento', paso: 0.05 }) + '</div>' +
          nsr(['materiales.lambda', 'materiales.phiV', 'materiales.phiF', 'materiales.phiB']) +
          '<h3 class="wz-sub">Método de cálculo</h3>' + seg('metodo', [['corregido', 'Corregido'], ['documento', 'Documento']], ctx.estado().metodo) + QUE_CAMBIA },
      { id: 'ubicacion', nombre: 'Ubicación', titulo: 'Ubicación de las columnas', ancho: true,
        html: () => {
          const g = ctx.estado().geometria;
          return '<div class="wz-dos"><div><p class="ayuda">Arrastra las columnas en el dibujo o escribe a y s. El largo L sale de 2x̄ para que la presión sea uniforme.</p><div class="campos dos">' +
            campo({ k: 'geometria.a', etq: 'Voladizo exterior a', mag: 'longitud', paso: 0.05 }) + campo({ k: 'geometria.s', etq: 'Separación s', mag: 'longitud', paso: 0.05 }) + '</div>' +
            '<h3 class="wz-sub">Largo</h3>' + seg('geometria.modoL', [['uniforme', 'L = 2x̄'], ['fijo', 'L fijo']], g.modoL) +
            (g.modoL === 'fijo' ? '<div class="campos">' + campo({ k: 'geometria.L', etq: 'L', mag: 'longitud', paso: 0.05 }) + '</div>' : '') +
            '<h3 class="wz-sub">Ancho</h3>' + seg('geometria.modoB', [['auto', 'B por σadm'], ['fijo', 'B fijo']], g.modoB) +
            (g.modoB === 'fijo' ? '<div class="campos">' + campo({ k: 'geometria.B', etq: 'B', mag: 'longitud', paso: 0.05 }) + '</div>' : '') +
            '<div class="wz-veredicto" data-vivo="planta" aria-live="polite"></div></div><div class="lienzo wz-lienzo" data-vivo="lienzo"></div></div>';
        },
        alMostrar: (sec) => {
          sec._lienzo = global.Lienzo.crear(sec.querySelector('[data-vivo="lienzo"]'), { estado: ctx.estado, resultado: ctx.planta, alMover: ctx.alMover, diagramas: false });
        },
        vivo: (sec) => {
          const R = ctx.planta(), v = sec.querySelector('[data-vivo="planta"]'), U = global.Unidades;
          if (sec._lienzo) sec._lienzo.pintar();
          if (!R) { v.className = 'wz-veredicto mal'; v.innerHTML = '<b>Faltan datos de los pasos anteriores (columnas, cargas, sismo o suelo).</b>'; return; }
          const ok = R.serv.ok;
          v.className = 'wz-veredicto ' + (ok ? 'ok' : 'mal');
          v.innerHTML = '<b>' + (ok ? 'La planta cumple' : 'La planta no cumple') + '</b><span>x̄ = ' + U.fmt(R.xbar, 'longitud') + ' · L × B = ' + U.num(R.L, 'longitud') + ' × ' + U.fmt(R.B, 'longitud') +
            ' · σmax ' + U.num(R.serv.smax, 'presion') + ' de ' + U.fmt(R.inp.suelo.qadm, 'presion') + '</span>' + (R.avisos.length ? '<span>' + R.avisos.join(' ') + '</span>' : '');
        },
        validar: () => {
          const R = ctx.planta();
          if (!R) return 'Revise los datos de los pasos anteriores.';
          return R.serv.ok ? null : 'La planta no cumple con el suelo. ' + R.avisos.join(' ');
        } },
      { id: 'altura', nombre: 'Altura', titulo: 'Altura de la zapata',
        html: () => '<p class="ayuda">Altura efectiva d y recubrimiento r. La altura total es h = d + r.</p><div class="campos dos">' +
          campo({ k: 'zapata.d', etq: 'd', mag: 'longitud', paso: 0.025 }) + campo({ k: 'zapata.r', etq: 'Recubrimiento r', mag: 'longitud', paso: 0.005 }) + '</div>' +
          '<div class="fila-btn"><button type="button" class="btn" data-proponer-d>Proponer d</button></div><p class="msg" data-vivo="msg" role="status"></p><ul class="wz-chequeos" data-vivo="chequeos" aria-live="polite"></ul>',
        vivo: (sec) => {
          const R = ctx.resultado(), ul = sec.querySelector('[data-vivo="chequeos"]');
          if (!R) { ul.innerHTML = '<li class="wz-vacio">' + (ctx.error() || 'Faltan datos en los pasos anteriores.') + '</li>'; return; }
          ul.innerHTML = R.chequeos.filter((c) => c.id !== 'suelo').map((c) => '<li class="' + (c.ok ? 'ok' : 'mal') + '"><span>' + c.titulo + '</span><span class="num">' + Math.round(c.util * 100) + ' %</span>' +
            '<span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></li>').join('');
        },
        validar: () => {
          const R = ctx.resultado();
          if (!R) return ctx.error() || 'Revise los datos.';
          const malos = R.chequeos.filter((c) => c.id !== 'suelo' && !c.ok).map((c) => c.titulo.toLowerCase());
          return malos.length ? 'No cumple: ' + malos.join(', ') + '. Aumente d o use "Proponer d".' : null;
        } },
    ];
  }

  global.PasosCombinada = { crear, nombre, ICONOS };
})(window);

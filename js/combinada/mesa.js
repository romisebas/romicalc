/* Mesa de la zapata combinada (beta 1.2): una sola pantalla, sin asistente.
 * Las columnas se arrastran sobre una regla; el centroide, el largo, la presión y los diagramas
 * de cortante y momento cambian en vivo. Guarda el proyecto en los recientes.
 */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const T = () => global.Tipos.combinada;
  let el = null, estado = null, id = null, R = null, falt = [], tGuardar = null;
  let esc = null, arrastre = null, cuadro = 0, editando = null;
  const PASO = 0.05;
  const NOMBRES = { c1: 'c₁', c2: 'c₂', D: 'D', L: 'L', E: 'E (sismo)', barra: 'barra', nBarras: 'n.º de barras' };
  // Magnitud de cada campo editable (para mostrarlo en el sistema de unidades activo)
  const MAG = { c1: 'longitud', c2: 'longitud', D: 'fuerza', L: 'fuerza', E: 'fuerza' };

  const FLECHA_IZQ = '<span class="bv-volver-circ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>';

  // Mezcla los datos guardados sobre la forma vacía (las columnas se mezclan una por una)
  function normalizar(d) {
    const base = T().clone(T().VACIO);
    (function mezclar(b, o) {
      Object.keys(b).forEach((k) => {
        if (o == null || !(k in o)) return;
        if (Array.isArray(b[k])) b[k].forEach((x, i) => mezclar(x, o[k] && o[k][i]));
        else if (b[k] && typeof b[k] === 'object') mezclar(b[k], o[k]);
        else b[k] = o[k];
      });
    })(base, d);
    return base;
  }

  function montar() {
    if (el) return;
    el = $('#mesa');
    el.innerHTML =
      '<header class="mesa-barra">' +
        '<button type="button" class="bv-volver-ico" id="mesa-inicio">' + FLECHA_IZQ + 'Inicio</button>' +
        '<div class="mesa-titulo"><p class="bv-eti">Zapata combinada</p><h1 class="mesa-h1" id="mesa-nombre">Nueva zapata</h1></div>' +
        '<p class="mesa-dim">L = <b class="num" id="mesa-L">—</b> · B = <b class="num" id="mesa-B">—</b></p>' +
        '<button type="button" class="btn btn-quieto" id="mesa-ejemplo">Cargar ejemplo del documento</button>' +
        '<button type="button" class="bv-ajustes-ico" data-abrir-ajustes aria-label="Ajustes" title="Ajustes"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg></button>' +
      '</header>' +
      '<div class="mesa-veredicto" id="mesa-veredicto" aria-live="polite"></div>' +
      '<div class="mesa-cuerpo">' +
        '<div class="mesa-centro">' +
          '<section class="mesa-guia" id="mesa-guia" hidden></section>' +
          '<p class="mesa-faltan" id="mesa-faltan" hidden></p>' +
          '<section class="mesa-lienzo" id="mesa-lienzo" aria-label="Alzado de la zapata">' +
            '<div class="mesa-lienzo-ancho"><div class="mesa-cargas" id="mesa-cargas"></div><div id="mesa-dibujo"></div></div>' +
            '<p class="mesa-lectura num" id="mesa-lectura" aria-live="polite">Pasa el cursor por los diagramas para leer V y M.</p>' +
          '</section>' +
          '<section class="mesa-resumen" id="mesa-resumen" aria-label="Resultados principales"></section>' +
        '</div>' +
        '<aside class="mesa-panel" id="mesa-panel" aria-label="Datos de la zapata">' +
          '<button type="button" class="mesa-panel-tog" id="mesa-panel-tog" aria-expanded="true" aria-controls="mesa-panel-cuerpo">Datos</button>' +
          '<div class="mesa-panel-cuerpo" id="mesa-panel-cuerpo"></div>' +
        '</aside>' +
      '</div>' +
      '<div class="mesa-editor popover" id="mesa-editor" role="dialog" aria-labelledby="mesa-editor-tit" hidden></div>';
    $('#mesa-inicio').addEventListener('click', cerrar);
    $('#mesa-ejemplo').addEventListener('click', () => { estado = T().clone(T().EJEMPLO); esc = null; pintarPanel(); cambio(); });
    const lz = $('#mesa-lienzo');
    lz.addEventListener('pointerdown', alPresionar);
    lz.addEventListener('pointermove', alMover);
    lz.addEventListener('pointerup', alSoltar);
    lz.addEventListener('pointercancel', alSoltar);
    lz.addEventListener('pointerleave', () => { if (!arrastre) ocultarLector(); });
    lz.addEventListener('keydown', alTeclear);
    $('#mesa-cargas').addEventListener('click', (e) => { const b = e.target.closest('.mesa-carga'); if (b) abrirEditor(Number(b.dataset.i), b); });
    $('#mesa-panel-cuerpo').addEventListener('input', alPanel);
    $('#mesa-panel-cuerpo').addEventListener('change', alPanel);
    $('#mesa-panel-cuerpo').addEventListener('click', alClicPanel);
    $('#mesa-panel-tog').addEventListener('click', () => {
      const b = $('#mesa-panel-tog'), abierto = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(abierto));
      $('#mesa-panel').classList.toggle('plegado', !abierto);
    });
    $('#mesa-guia').addEventListener('click', (e) => { if (e.target.closest('[data-ejemplo]')) $('#mesa-ejemplo').click(); });
    $('#mesa-veredicto').addEventListener('click', (e) => { const p = e.target.closest('.mesa-pildora'); if (p && global.Mesa.irA) global.Mesa.irA(p.dataset.id); });
    document.addEventListener('zapatapp:unidades', () => { if (el && !el.hidden) { pintarPanel(); pintar(); } });
    $('#mesa-editor').addEventListener('input', alEditar);
    $('#mesa-editor').addEventListener('change', alEditar);
    $('#mesa-editor').addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]')) cerrarEditor(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && editando !== null) cerrarEditor(); });
    document.addEventListener('pointerdown', (e) => {
      if (editando !== null && !e.target.closest('#mesa-editor') && !e.target.closest('.mesa-carga')) cerrarEditor();
    });
  }

  // ---------------------------------------------------------------- lienzo
  const D = () => global.DibujoCombinada;

  function pintarLienzo() {
    if (!esc || !arrastre) esc = D().escalaLienzo(estado, R);
    const foco = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.mesa-col') : null;
    const iFoco = foco ? foco.dataset.i : null;
    $('#mesa-dibujo').innerHTML = D().lienzo(estado, R, esc);
    if (iFoco !== null) { const c = $('.mesa-col[data-i="' + iFoco + '"]'); if (c) c.focus({ preventScroll: true }); }
    pintarCargas();
  }

  function pintarCargas() {
    const U = global.Unidades, G = D().geometria(estado, R), LZ = D().LZ, k = (LZ.W - LZ.ML - LZ.MR) / esc.Xmax;
    $('#mesa-cargas').innerHTML = estado.columnas.map((c, i) => {
      const P = (Number(c.D) || 0) + (Number(c.L) || 0), x = (LZ.ML + G.cols[i].x * k) / LZ.W * 100;
      const txt = c.D > 0 ? 'P<sub>s</sub> = ' + U.fmt(P, 'fuerza') : 'Escribe las cargas';
      return '<button type="button" class="mesa-carga' + (c.D > 0 ? '' : ' vacia') + '" data-i="' + i + '" style="left:' + x.toFixed(3) + '%" aria-haspopup="dialog">' +
        '<span class="mesa-carga-col">' + (i ? 'Interior' : 'Exterior') + '</span><span>' + txt + '</span></button>';
    }).join('');
  }

  // px de pantalla → metros sobre el eje x del lienzo
  function aMetros(clientX) {
    const s = $('#mesa-svg'), r = s.getBoundingClientRect(), LZ = D().LZ;
    return ((clientX - r.left) * LZ.W / r.width - LZ.ML) / Number(s.dataset.k);
  }

  function separacionMin() {
    const c = estado.columnas, a = Number(c[0].c1) || 0.4, b = Number(c[1].c1) || 0.4;
    return Math.round(((a + b) / 2 + PASO) / PASO) * PASO;
  }

  // Mueve una columna: la exterior cambia el voladizo a, la interior la separación s (pasos de 0.05 m)
  function moverColumna(i, valor) {
    const v = +(Math.round(valor / PASO) * PASO).toFixed(2);
    if (i === 0) estado.geometria.a = Math.max(0, v);
    else estado.geometria.s = Math.max(separacionMin(), v);
  }

  function alPresionar(e) {
    const col = e.target.closest('.mesa-col');
    if (!col || e.button !== 0) return;
    e.preventDefault();
    const i = Number(col.dataset.i), G = D().geometria(estado, R);
    arrastre = { i, id: e.pointerId, desfase: aMetros(e.clientX) - G.cols[i].x };
    $('#mesa-lienzo').setPointerCapture(e.pointerId);
    $('#mesa-lienzo').classList.add('arrastrando');
    col.focus({ preventScroll: true });
  }

  function alMover(e) {
    if (arrastre && e.pointerId === arrastre.id) {
      const G = D().geometria(estado, R), x = aMetros(e.clientX) - arrastre.desfase;
      moverColumna(arrastre.i, arrastre.i === 0 ? x - G.c1e / 2 : x - G.x1);
      if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; cambio(); });
      return;
    }
    leer(e);
  }

  function alSoltar(e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const G = D().geometria(estado, R), x = aMetros(e.clientX) - arrastre.desfase, i = arrastre.i;
    moverColumna(i, i === 0 ? x - G.c1e / 2 : x - G.x1);
    arrastre = null;
    $('#mesa-lienzo').classList.remove('arrastrando');
    if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
    cambio();
  }

  function alTeclear(e) {
    const col = e.target.closest('.mesa-col');
    if (!col || !['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();
    const i = Number(col.dataset.i), paso = (e.shiftKey ? 5 : 1) * PASO * (e.key === 'ArrowLeft' ? -1 : 1);
    const G = D().geometria(estado, R);
    if (e.key === 'Home') moverColumna(i, 0);
    else moverColumna(i, (i === 0 ? G.a : G.s) + paso);
    cambio();
  }

  // Lector: línea vertical con V(x), M(x) y q(x) bajo el cursor
  function leer(e) {
    const zona = e.target.closest ? e.target.closest('.mesa-diag') : null;
    if (!R || !zona) { ocultarLector(); return; }
    const U = global.Unidades, x = Math.min(R.L, Math.max(0, aMetros(e.clientX)));
    const v = T().esfuerzos(R, x), lin = $('#mesa-lector'), X = D().LZ.ML + x * Number($('#mesa-svg').dataset.k);
    lin.setAttribute('x1', X.toFixed(2)); lin.setAttribute('x2', X.toFixed(2)); lin.setAttribute('visibility', 'visible');
    $('#mesa-lectura').textContent = 'x = ' + U.fmt(x, 'longitud') + ' · V = ' + U.fmt(v.V, 'fuerza') + ' · M = ' + U.fmt(v.M, 'momento') + ' · q = ' + U.fmt(v.q, 'presion');
  }
  function ocultarLector() { const l = $('#mesa-lector'); if (l) l.setAttribute('visibility', 'hidden'); }

  // ---------------------------------------------------------------- editor de cargas de una columna
  function abrirEditor(i, boton) {
    const U = global.Unidades, ed = $('#mesa-editor'), c = estado.columnas[i];
    editando = i;
    const campo = (k, paso) => {
      const v = c[k], mag = MAG[k], val = v === null || v === undefined ? '' : (mag ? Number(U.a(v, mag).toPrecision(6)) : v);
      return '<label class="mesa-campo"><span>' + NOMBRES[k] + (mag ? ' <i>' + U.u(mag) + '</i>' : '') + '</span>' +
        '<input type="number" inputmode="decimal" step="' + paso + '" data-k="columnas.' + i + '.' + k + '" value="' + val + '"></label>';
    };
    const barras = Object.keys(global.Refuerzo.BARS).map((n) => '<option value="' + n + '"' + (Number(c.barra) === Number(n) ? ' selected' : '') + '>#' + n + '</option>').join('');
    ed.innerHTML = '<h2 class="mesa-editor-tit" id="mesa-editor-tit">Columna ' + (i ? 'interior' : 'exterior') + '</h2>' +
      '<div class="mesa-editor-grid">' + campo('D', 'any') + campo('L', 'any') + campo('E', 'any') + campo('c1', 0.05) + campo('c2', 0.05) +
      '<label class="mesa-campo"><span>Barra de la columna</span><select data-k="columnas.' + i + '.barra"><option value="">—</option>' + barras + '</select></label>' +
      campo('nBarras', 1) + '</div>' +
      '<p class="mesa-editor-nota">E es la fuerza sísmica vertical de la tabla de reacciones (se divide por R).</p>' +
      '<button type="button" class="btn btn-quieto" data-cerrar>Listo</button>';
    const r = boton.getBoundingClientRect(), m = el.getBoundingClientRect();
    ed.style.left = Math.max(8, Math.min(r.left - m.left - 40, m.width - 348)) + 'px';
    ed.style.top = (r.bottom - m.top + 8) + 'px';
    ed.hidden = false;
    const primero = ed.querySelector('input');
    if (primero) primero.focus();
  }

  function cerrarEditor() {
    const i = editando;
    editando = null;
    $('#mesa-editor').hidden = true;
    const b = $('.mesa-carga[data-i="' + i + '"]');
    if (b) b.focus();
  }

  function alEditar(e) {
    const k = e.target.dataset.k;
    if (!k) return;
    const partes = k.split('.'), i = Number(partes[1]), campo = partes[2], txt = e.target.value;
    let v = txt === '' ? null : Number(txt);
    if (v !== null && !isFinite(v)) return;
    if (v !== null && MAG[campo]) v = Number(global.Unidades.de(v, MAG[campo]).toPrecision(12));
    estado.columnas[i][campo] = v;
    cambio();
  }

  function pintarFaltan() {
    const p = $('#mesa-faltan');
    if (!falt.length) { p.hidden = true; return; }
    const nombre = (k) => {
      const m = k.match(/^columnas\.(\d)\.(\w+)$/);
      if (m) return NOMBRES[m[2]] + ' de la columna ' + (m[1] === '0' ? 'exterior' : 'interior');
      return k.split('.').pop();
    };
    p.textContent = 'Faltan datos: ' + falt.slice(0, 6).map(nombre).join(', ') + (falt.length > 6 ? ' y ' + (falt.length - 6) + ' más.' : '.');
    p.hidden = false;
  }

  function recalcular() {
    const listo = T().preparar(estado);
    falt = T().faltantes(listo);
    R = null;
    if (!falt.length) { try { R = T().calcular(listo); } catch (ex) { R = null; } }
  }

  function pintar() {
    const U = global.Unidades;
    $('#mesa-nombre').textContent = estado.proyecto.nombre || 'Nueva zapata';
    $('#mesa-L').textContent = R ? U.fmt(R.L, 'longitud') : '—';
    $('#mesa-B').textContent = R ? U.fmt(R.B, 'longitud') : '—';
    pintarFaltan();
    pintarGuia();
    pintarLienzo();
    pintarVeredicto();
    pintarResumen();
    $$('#mesa-metodo [data-metodo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.metodo === estado.metodo)));
  }

  // ---------------------------------------------------------------- panel de datos
  // [ruta, etiqueta, magnitud, paso]; sin magnitud = adimensional
  const PANEL = [
    ['Proyecto', [['proyecto.nombre', 'Nombre', 'texto'], ['proyecto.elemento', 'Elemento', 'texto']]],
    ['Suelo', [['suelo.qadm', 'σadm', 'presion', 0.5], ['suelo.factorSismo', 'Aumento con sismo', null, 0.01]]],
    ['Sismo', [['sismo.R0', 'R₀', null, 0.5], ['sismo.phiA', 'φa', null, 0.05], ['sismo.phiP', 'φp', null, 0.05], ['sismo.phiR', 'φr', null, 0.05]]],
    ['Materiales', [['materiales.fc', "f'c", 'esfuerzo', 10], ['materiales.fy', 'fy', 'esfuerzo', 100], ['materiales.lambda', 'λ', null, 0.05],
      ['materiales.phiV', 'φ cortante', null, 0.05], ['materiales.phiF', 'φ flexión', null, 0.05], ['materiales.phiB', 'φ aplastamiento', null, 0.05]]],
    ['Zapata', [['zapata.d', 'd', 'longitud', 0.01], ['zapata.r', 'Recubrimiento r', 'longitud', 0.005]]],
  ];
  const get = (o, k) => k.split('.').reduce((a, x) => (a == null ? a : a[x]), o);
  function set(o, k, v) { const p = k.split('.'), u = p.pop(); p.reduce((a, x) => a[x], o)[u] = v; }
  const $$ = (s) => Array.from(el.querySelectorAll(s));

  function valorCampo(k, mag) {
    const v = get(estado, k);
    if (v === null || v === undefined || v === '') return '';
    if (mag === 'texto') return global.Informe ? global.Informe.esc(v) : v;
    return mag ? String(Number(global.Unidades.a(v, mag).toPrecision(6))) : String(v);
  }

  function pintarPanel() {
    const U = global.Unidades, g = estado.geometria;
    const campo = ([k, etq, mag, paso]) => '<label class="mesa-campo"><span>' + etq + (mag && mag !== 'texto' ? ' <i>' + U.u(mag) + '</i>' : '') + '</span>' +
      '<input ' + (mag === 'texto' ? 'type="text"' : 'type="number" inputmode="decimal" step="' + (mag && U.actual() !== 'curso' ? 'any' : paso) + '"') +
      ' data-k="' + k + '"' + (mag ? ' data-mag="' + mag + '"' : '') + ' value="' + valorCampo(k, mag) + '"></label>';
    const modo = (k, val, etq) => '<button type="button" data-modo="' + k + '" data-v="' + val + '" aria-pressed="' + String(get(estado, k) === val) + '">' + etq + '</button>';
    $('#mesa-panel-cuerpo').innerHTML =
      '<div class="mesa-grupo"><h3>Método</h3><div class="mesa-seg" id="mesa-metodo" role="group" aria-label="Método de cálculo">' +
        '<button type="button" data-metodo="corregido" aria-pressed="' + String(estado.metodo !== 'documento') + '">Corregido</button>' +
        '<button type="button" data-metodo="documento" aria-pressed="' + String(estado.metodo === 'documento') + '">Documento</button></div>' +
        '<p class="mesa-ayuda">Documento reproduce el PDF: presión uniforme, ρmin·b·d y Vud proporcional.</p></div>' +
      '<div class="mesa-grupo"><h3>Planta</h3>' +
        '<div class="mesa-seg" role="group" aria-label="Largo">' + modo('geometria.modoL', 'uniforme', 'L = 2x̄') + modo('geometria.modoL', 'fijo', 'L fijo') + '</div>' +
        (g.modoL === 'fijo' ? campo(['geometria.L', 'L', 'longitud', 0.05]) : '') +
        '<div class="mesa-seg" role="group" aria-label="Ancho">' + modo('geometria.modoB', 'auto', 'B por σadm') + modo('geometria.modoB', 'fijo', 'B fijo') + '</div>' +
        (g.modoB === 'fijo' ? campo(['geometria.B', 'B', 'longitud', 0.05]) : '') + '</div>' +
      PANEL.map(([tit, campos]) => '<div class="mesa-grupo"><h3>' + tit + '</h3><div class="mesa-grid2">' + campos.map(campo).join('') + '</div></div>').join('') +
      '<button type="button" class="btn btn-quieto mesa-nsr" id="mesa-nsr">Usar valores de la NSR-10</button>';
  }

  function alPanel(e) {
    const k = e.target.dataset.k;
    if (!k) return;
    const mag = e.target.dataset.mag, txt = e.target.value;
    let v;
    if (mag === 'texto') v = txt;
    else {
      v = txt === '' ? null : Number(txt);
      if (v !== null && !isFinite(v)) return;
      if (v !== null && mag) v = Number(global.Unidades.de(v, mag).toPrecision(12));
    }
    set(estado, k, v);
    cambio();
  }

  function alClicPanel(e) {
    const met = e.target.closest('[data-metodo]'), modo = e.target.closest('[data-modo]');
    if (met) { estado.metodo = met.dataset.metodo; cambio(); return; }
    if (modo) {
      set(estado, modo.dataset.modo, modo.dataset.v);
      // Al fijar L o B se parte del valor calculado
      if (modo.dataset.v === 'fijo' && R) { const k = modo.dataset.modo === 'geometria.modoL' ? 'L' : 'B'; if (!(estado.geometria[k] > 0)) estado.geometria[k] = R[k]; }
      pintarPanel(); cambio(); return;
    }
    if (e.target.closest('#mesa-nsr')) {
      Object.entries(T().NSR).forEach(([k, v]) => { if (get(estado, k) === null || get(estado, k) === undefined) set(estado, k, v); });
      pintarPanel(); cambio();
    }
  }

  // ---------------------------------------------------------------- veredicto, resumen y guía
  const CORTO = { suelo: 'Suelo', 'pz-ext': 'Punz. ext.', 'pz-int': 'Punz. int.', cl: 'Cortante long.', ct: 'Cortante transv.', fl: 'Flexión', ap: 'Aplastamiento', ld: 'Desarrollo' };
  function pintarVeredicto() {
    const v = $('#mesa-veredicto');
    if (!R) { v.innerHTML = '<span class="mesa-estado incompleto">Incompleto</span>'; return; }
    v.innerHTML = '<span class="mesa-estado ' + (R.todoOk ? 'ok' : 'mal') + '">' + (R.todoOk ? 'Cumple' : 'No cumple') + '</span>' +
      R.chequeos.map((c) => '<button type="button" class="mesa-pildora ' + (c.ok ? 'ok' : 'mal') + '" data-id="' + c.id + '" title="' + c.titulo + ': ' + c.det + '">' +
        '<span>' + CORTO[c.id] + '</span><b class="num">' + Math.round(c.util * 100) + ' %</b></button>').join('');
  }

  function pintarResumen() {
    const s = $('#mesa-resumen'), U = global.Unidades;
    if (!R) { s.innerHTML = ''; return; }
    const fila = (t, v) => '<div><dt>' + t + '</dt><dd class="num">' + v + '</dd></div>';
    s.innerHTML = '<dl class="mesa-cifras">' +
      fila('σmax servicio', U.fmt(R.serv.smax, 'presion')) +
      fila('M<sub>u</sub>⁻ / M<sub>u</sub>⁺', U.num(R.lon.Mneg.M, 'momento') + ' / ' + U.fmt(Math.max(R.lon.Mpos[0].M, R.lon.Mpos[1].M), 'momento')) +
      fila('A<sub>s</sub> superior', U.fmt(R.fl.sup.As, 'acero') + ' · ' + R.fl.sup.sel.resumen) +
      fila('A<sub>s</sub> inferior', U.fmt(R.fl.inf.As, 'acero') + ' · ' + R.fl.inf.sel.resumen) +
      fila('V<sub>ud</sub> / φV<sub>c</sub>', U.num(R.cl.Vud, 'fuerza') + ' / ' + U.fmt(R.cl.phiVc, 'fuerza')) +
      fila('Franjas b', U.num(R.tr[0].b, 'longitud') + ' / ' + U.fmt(R.tr[1].b, 'longitud')) +
      '</dl>' + (R.avisos.length ? '<p class="mesa-aviso">' + R.avisos.join(' ') + '</p>' : '');
  }

  function pintarGuia() {
    const g = $('#mesa-guia'), c = estado.columnas;
    if (!falt.length) { g.hidden = true; return; }
    const pasos = [
      ['Coloca la columna exterior', 'Arrástrala desde el lindero o escribe su tamaño en su etiqueta.', c[0].c1 > 0 && c[0].c2 > 0],
      ['Ubica la interior', 'Arrástrala para fijar la separación s entre centros.', estado.geometria.s > 0 && c[1].c1 > 0 && c[1].c2 > 0],
      ['Escribe las cargas', 'Toca la etiqueta de cada columna y llena D, L y E.', c[0].D > 0 && c[1].D > 0],
    ];
    g.innerHTML = '<ol class="mesa-pasos">' + pasos.map(([t, d, ok], i) => '<li class="' + (ok ? 'hecho' : '') + '"><span class="mesa-paso-n">' + (ok ? '✓' : i + 1) + '</span><div><b>' + t + '</b><p>' + d + '</p></div></li>').join('') +
      '</ol><p class="mesa-guia-pie">Completa también el panel de datos, o <button type="button" class="mesa-enlace" data-ejemplo>carga el ejemplo del documento</button>.</p>';
    g.hidden = false;
  }

  function guardar() {
    clearTimeout(tGuardar);
    if (id) global.Proyectos.guardar(id, estado, R ? (R.todoOk ? 'cumple' : 'no-cumple') : 'incompleto');
  }

  function cambio() {
    recalcular();
    pintar();
    clearTimeout(tGuardar);
    tGuardar = setTimeout(guardar, 400);
  }

  function abrir(datos, pid, conCarga) {
    montar();
    estado = normalizar(datos);
    id = pid || global.Proyectos.nuevoId();
    esc = null;
    pintarPanel();
    document.body.classList.remove('en-bienvenida', 'en-portada');
    $('#bienvenida').hidden = true;
    $('#app').hidden = true;
    el.hidden = false;
    window.scrollTo(0, 0);
    recalcular();
    pintar();
    guardar();
    if (R && conCarga) global.Cargando.mostrar('Abriendo proyecto', R);
  }

  function cerrar() {
    guardar();
    el.hidden = true;
    global.App.volverAOpciones();
  }

  global.Mesa = { abrir, cerrar, estado: () => estado, resultado: () => R };
})(window);

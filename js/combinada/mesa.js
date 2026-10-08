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
      '</header>' +
      '<p class="mesa-faltan" id="mesa-faltan" hidden></p>' +
      '<section class="mesa-lienzo" id="mesa-lienzo" aria-label="Alzado de la zapata">' +
        '<div class="mesa-cargas" id="mesa-cargas"></div><div id="mesa-dibujo"></div>' +
        '<p class="mesa-lectura num" id="mesa-lectura" aria-live="polite">Pasa el cursor por los diagramas para leer V y M.</p>' +
      '</section>' +
      '<div class="mesa-editor popover" id="mesa-editor" role="dialog" aria-labelledby="mesa-editor-tit" hidden></div>';
    $('#mesa-inicio').addEventListener('click', cerrar);
    $('#mesa-ejemplo').addEventListener('click', () => { estado = T().clone(T().EJEMPLO); esc = null; cambio(); });
    const lz = $('#mesa-lienzo');
    lz.addEventListener('pointerdown', alPresionar);
    lz.addEventListener('pointermove', alMover);
    lz.addEventListener('pointerup', alSoltar);
    lz.addEventListener('pointercancel', alSoltar);
    lz.addEventListener('pointerleave', () => { if (!arrastre) ocultarLector(); });
    lz.addEventListener('keydown', alTeclear);
    $('#mesa-cargas').addEventListener('click', (e) => { const b = e.target.closest('.mesa-carga'); if (b) abrirEditor(Number(b.dataset.i), b); });
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
    pintarLienzo();
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

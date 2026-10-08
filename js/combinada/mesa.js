/* Tablero de la zapata combinada (beta 1.2): misma estructura que la aislada.
 * Asistente de 8 pasos en ventanas emergentes, riel flotante de datos a la izquierda y pestañas
 * Veredicto (anillos y ficha), Planos (alzado y diagramas, planta, cortes, 3D), Refuerzo por viñetas
 * y Memoria. Guarda el proyecto en los recientes. Se expone como window.Mesa.
 */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const T = () => global.Tipos.combinada;
  let el = null, estado = null, id = null, R = null, falt = [], tGuardar = null, errorCalc = '';
  let pestana = 'veredicto', vista = 'alzado', fichaSel = null, okPrevio = null, asis = null, lienzo = null, pasos = null, salida = null;
  const movers = {};
  const PESTANAS = [['veredicto', 'Veredicto'], ['planos', 'Planos'], ['refuerzo', 'Refuerzo'], ['memoria', 'Memoria']];
  const VISTAS = [['alzado', 'Alzado y diagramas'], ['planta', 'Planta'], ['corte-l', 'Corte longitudinal'], ['cortes-t', 'Cortes transversales'], ['3d', '3D']];
  const CORTO = { suelo: 'Suelo', 'pz-ext': 'Punz. exterior', 'pz-int': 'Punz. interior', cl: 'Cortante long.', ct: 'Cortante transv.', fl: 'Flexión', ap: 'Aplastamiento', ld: 'Desarrollo' };
  // Capítulo de la memoria de cada chequeo (para "Ver en la memoria")
  const CAPITULO = { suelo: 'planta', 'pz-ext': 'pz', 'pz-int': 'pz', cl: 'cl', ct: 'tr', fl: 'fl', ap: 'ap', ld: 'ap' };
  // Paso del asistente al que pertenece cada ruta
  function pasoDe(k) {
    if (k.startsWith('proyecto') || k.startsWith('informe')) return 'proyecto';
    const m = k.match(/^columnas\.\d\.(\w+)$/);
    if (m) return ['D', 'L', 'E'].includes(m[1]) ? 'cargas' : 'columnas';
    if (k.startsWith('sismo')) return 'sismo';
    if (k.startsWith('suelo')) return 'suelo';
    if (k.startsWith('materiales') || k === 'metodo') return 'materiales';
    if (k.startsWith('geometria')) return 'ubicacion';
    return 'altura';
  }

  const get = (o, k) => k.split('.').reduce((a, x) => (a == null ? a : a[x]), o);
  function set(o, k, v) { const p = k.split('.'), u = p.pop(); p.reduce((a, x) => a[x], o)[u] = v; }

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

  // ---------------------------------------------------------------- estructura (igual a la de la aislada)
  function montar() {
    if (el) return;
    el = $('#mesa');
    const U = global.Unidades;
    el.innerHTML =
      '<header class="barra-sup" id="c-barra">' +
        '<div class="barra-fila">' +
          '<button type="button" class="marca" id="c-inicio" aria-label="Volver al inicio"><span id="c-logo"></span><span class="marca-nombre">ZapatAPP</span></button>' +
          '<span class="tipo-actual">Combinada</span>' +
          '<nav class="acciones" aria-label="Acciones">' +
            '<button type="button" class="btn btn-quieto" id="c-exportar">Exportar</button>' +
            '<label class="btn btn-quieto" for="archivo-importar">Importar</label>' +
            '<button type="button" class="btn btn-acento" id="c-imprimir" aria-haspopup="dialog">Imprimir</button>' +
            '<button type="button" class="btn-icono" data-abrir-ajustes aria-label="Ajustes" title="Ajustes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg></button>' +
            '<button type="button" class="btn-icono" data-alternar-tema aria-label="Cambiar entre tema claro y oscuro" title="Tema claro u oscuro"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="relleno" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/></svg></button>' +
          '</nav>' +
        '</div>' +
        '<div class="barra-fila2"><div class="pestanas" role="tablist" aria-label="Secciones del diseño" id="c-pestanas">' +
          PESTANAS.map(([p, t], i) => '<button type="button" role="tab" id="c-tab-' + p + '" data-tab="' + p + '" aria-controls="c-panel-' + p + '" aria-selected="' + (i ? 'false' : 'true') + '"' + (i ? ' tabindex="-1"' : '') + '>' + t + '</button>').join('') +
        '</div></div>' +
      '</header>' +
      '<nav class="riel" id="c-categorias" aria-label="Editar datos por categoría"></nav>' +
      '<button type="button" class="btn btn-acento btn-datos" id="c-btn-datos" aria-controls="c-categorias" aria-expanded="false">Datos</button>' +
      '<main class="principal" id="c-principal" tabindex="-1">' +
        '<section class="estado-vacio" id="c-vacio" hidden><h1 class="v-tit"></h1><p class="v-det"></p><div class="faltan" id="c-faltan"></div>' +
          '<div class="fila-btn"><button type="button" class="btn btn-acento" id="c-abrir-asistente">Ingresar los datos</button><button type="button" class="btn btn-quieto" id="c-ejemplo">Cargar ejemplo del documento</button></div></section>' +
        '<div id="c-contenido">' +
          // Veredicto
          '<section class="panel" id="c-panel-veredicto" role="tabpanel" aria-labelledby="c-tab-veredicto">' +
            '<div class="resumen" id="c-resumen" aria-live="polite">' +
              '<div class="veredicto" id="c-veredicto"><svg class="v-icono" viewBox="0 0 96 96" aria-hidden="true"><circle class="vi-aro" cx="48" cy="48" r="42" pathLength="1"/>' +
                '<path class="vi-check" d="M30 49 L43 62 L67 36" pathLength="1"/><path class="vi-x1" d="M34 34 L62 62" pathLength="1"/><path class="vi-x2" d="M62 34 L34 62" pathLength="1"/></svg>' +
                '<h1 class="v-tit" id="c-v-tit">El diseño cumple</h1><ul class="v-fallas" id="c-v-fallas" aria-label="Chequeos que no cumplen"></ul></div>' +
              '<dl class="cifras" id="c-cifras">' +
                '<div><dt>Planta</dt><dd><span class="num" data-ccifra="L">0.00</span> × <span class="num" data-ccifra="B">0.00</span> <small data-cu="longitud">m</small></dd></div>' +
                '<div><dt>Altura</dt><dd><span class="num" data-ccifra="h">0.00</span> <small data-cu="longitud">m</small></dd></div>' +
                '<div><dt>Utilización máxima</dt><dd><span class="num" data-ccifra="util">0</span><small>%</small></dd></div></dl>' +
              '<section class="detalle" aria-labelledby="c-detalle-tit"><h2 class="detalle-tit" id="c-detalle-tit">Detalle de los chequeos</h2>' +
                '<ul class="v-contexto" id="c-contexto" aria-label="Condición que gobierna"></ul>' +
                '<ol class="chequeos anillos" id="c-chequeos" role="tablist" aria-label="Utilización de cada chequeo"></ol>' +
                '<div class="ficha" id="c-ficha" role="tabpanel" aria-live="polite"></div></section>' +
            '</div></section>' +
          // Planos
          '<section class="panel" id="c-panel-planos" role="tabpanel" aria-labelledby="c-tab-planos" hidden>' +
            '<section class="dims" aria-label="Ajuste rápido de dimensiones"><span class="dims-tit">Ajuste rápido</span>' +
              [['geometria.s', 's', 0.05], ['geometria.a', 'a', 0.05], ['zapata.d', 'd', 0.025]].map(([k, n, p]) =>
                '<div class="paso-num"><span class="pn-lbl">' + n + '</span><button type="button" class="pn-btn" data-cpaso="' + k + '" data-delta="-' + p + '" aria-label="Reducir ' + n + '">−</button>' +
                '<input type="number" step="' + p + '" data-ck="' + k + '" aria-label="' + n + '"><button type="button" class="pn-btn" data-cpaso="' + k + '" data-delta="' + p + '" aria-label="Aumentar ' + n + '">+</button><small data-cu="longitud">m</small></div>').join('') +
            '</section>' +
            '<figure class="vista vista-ancha"><div class="vista-cab"><h2 id="c-vista-tit">Alzado y diagramas</h2>' +
              '<div class="seg" role="tablist" aria-label="Vista" id="c-vistas">' + VISTAS.map(([v, t], i) => '<button type="button" role="tab" data-vista="' + v + '" aria-selected="' + (i ? 'false' : 'true') + '">' + t + '</button>').join('') + '</div></div>' +
              '<div class="c-vista" data-v="alzado"><div id="c-alzado"></div></div>' +
              '<div class="c-vista" data-v="planta" hidden><div class="lienzo"><div class="mesa-plano" id="c-planta"></div></div></div>' +
              '<div class="c-vista" data-v="corte-l" hidden><div class="lienzo"><div class="mesa-plano" id="c-corte-l"></div></div></div>' +
              '<div class="c-vista mesa-cortes-t" data-v="cortes-t" hidden><div><h3 class="mesa-pan-tit">Bajo la columna exterior</h3><div class="lienzo"><div class="mesa-plano" id="c-corte-0"></div></div></div>' +
                '<div><h3 class="mesa-pan-tit">Bajo la columna interior</h3><div class="lienzo"><div class="mesa-plano" id="c-corte-1"></div></div></div></div>' +
              '<div class="c-vista" data-v="3d" hidden><div class="vista3d-barra" id="c-3d-barra"></div><div class="lienzo lienzo-3d mesa-3d" id="c-3d"><p class="pista">Arrastre para girar, rueda para acercar</p></div></div>' +
            '</figure></section>' +
          // Refuerzo
          '<section class="panel bloque" id="c-panel-refuerzo" role="tabpanel" aria-labelledby="c-tab-refuerzo" hidden><div id="c-refuerzo"></div></section>' +
          // Memoria
          '<section class="panel bloque" id="c-panel-memoria" role="tabpanel" aria-labelledby="c-tab-memoria" hidden>' +
            '<div class="bloque-cab"><h2>Memoria de cálculo</h2><span class="dp-ayuda">Use las flechas del teclado o deslice para avanzar</span></div>' +
            '<div class="mesa-correcciones" id="mesa-correcciones"></div><div id="mesa-memoria" class="memoria dp"></div></section>' +
        '</div>' +
      '</main>';
    $('#c-logo').innerHTML = global.Logo.svg('logo');
    conectar();
    pasos = global.PasosCombinada.crear({ estado: () => estado, resultado: () => R, planta: () => T().vistaPlanta(estado), error: () => errorCalc, alMover: () => { cambio(); if (asis) asis.refrescar(); }, proponerD });
    asis = global.Asistente.crear({
      pre: 'cw', pasos,
      leer: (k) => (k === 'metodo' ? estado.metodo : get(estado, k)),
      escribir: (k, v) => set(estado, k, v),
      faltantes: () => falt, nombre: global.PasosCombinada.nombre,
      alCambiar: cambio,
      alCerrar: (modo) => {
        if (modo === 'nuevo' && R) { mostrarPestana('veredicto'); global.Cargando.mostrar('Calculando', R).then(animarVeredicto); }
      },
    });
    lienzo = global.Lienzo.crear($('#c-alzado'), { estado: () => estado, resultado: () => R, alMover: cambio, diagramas: true,
      alCarga: (i, b) => asis.abrir(asis.indice('cargas'), 'editar', b) });
    ['#c-planta', '#c-corte-l', '#c-corte-0', '#c-corte-1'].forEach((s) => global.PlantaInteractiva.montar($(s)));
    movers.pestanas = global.Mov.segmentado($('#c-pestanas'));
    movers.vistas = global.Mov.segmentado($('#c-vistas'));
  }

  function conectar() {
    $('#c-inicio').addEventListener('click', cerrar);
    $('#c-exportar').addEventListener('click', exportar);
    $('#c-imprimir').addEventListener('click', () => {
      const f = fuente();
      if (!f) { global.App.avisar('Complete los datos del proyecto para generar la memoria.'); return; }
      global.App.abrirInforme(f);
    });
    $('#c-pestanas').addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) mostrarPestana(b.dataset.tab); });
    $('#c-pestanas').addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const ids = PESTANAS.map((x) => x[0]), j = (ids.indexOf(pestana) + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
      mostrarPestana(ids[j]); $('#c-tab-' + ids[j]).focus();
    });
    // Riel: cada categoría reabre su ventana del asistente, creciendo desde el botón
    $('#c-categorias').addEventListener('click', (e) => {
      const b = e.target.closest('.cat');
      if (!b) return;
      ondaRiel(b, e);
      asis.abrir(asis.indice(b.dataset.cat), 'editar', b);
      cerrarRielMovil();
    });
    $('#c-btn-datos').addEventListener('click', () => {
      const r = $('#c-categorias'), abierto = !r.classList.contains('abierto');
      r.classList.toggle('abierto', abierto);
      $('#c-btn-datos').setAttribute('aria-expanded', String(abierto));
    });
    $('#c-faltan').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) asis.abrir(asis.indice(b.dataset.cat), 'editar', b); });
    $('#c-abrir-asistente').addEventListener('click', (e) => asis.abrir(primerPasoIncompleto(), 'nuevo', e.currentTarget));
    $('#c-ejemplo').addEventListener('click', () => { estado = T().clone(T().EJEMPLO); okPrevio = null; cambio(); global.Cargando.mostrar('Calculando', R).then(animarVeredicto); });
    $('#c-chequeos').addEventListener('click', (e) => { const b = e.target.closest('.anillo'); if (b) { fichaSel = b.dataset.paso; pintarFicha(); } });
    $('#c-ficha').addEventListener('click', (e) => {
      const a = e.target.closest('.ficha-memoria');
      if (!a) return;
      e.preventDefault();
      if (global.MesaSecciones) global.MesaSecciones.irCapitulo(CAPITULO[a.dataset.paso]);
      mostrarPestana('memoria');
    });
    $('#c-vistas').addEventListener('click', (e) => { const b = e.target.closest('[data-vista]'); if (b) mostrarVista(b.dataset.vista); });
    // Ajuste rápido
    el.querySelector('.dims').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cpaso]');
      if (!b) return;
      const k = b.dataset.cpaso, v = (Number(get(estado, k)) || 0) + Number(b.dataset.delta);
      set(estado, k, Math.max(0, +v.toFixed(3)));
      cambio(); pintarDims();
    });
    el.querySelector('.dims').addEventListener('input', (e) => {
      const k = e.target.dataset.ck;
      if (!k || e.target.value === '') return;
      const v = Number(e.target.value);
      if (!isFinite(v)) return;
      set(estado, k, Number(global.Unidades.de(v, 'longitud').toPrecision(12)));
      cambio();
    });
    // Botones dentro del asistente: valores de la NSR-10, modos y "Proponer d"
    document.addEventListener('click', (e) => {
      const dlg = asis && asis.elemento();
      if (!dlg || !dlg.contains(e.target)) return;
      const nsr = e.target.closest('[data-nsr]'), modo = e.target.closest('[data-modo]'), prop = e.target.closest('[data-proponer-d]');
      if (nsr) { nsr.dataset.nsr.split(',').forEach((k) => set(estado, k, T().NSR[k])); cambio(); asis.refrescar(); }
      if (modo) {
        const k = modo.dataset.modo, v = modo.dataset.v;
        if (k === 'metodo') estado.metodo = v; else set(estado, k, v);
        if (v === 'fijo' && R) { const c = k === 'geometria.modoL' ? 'L' : 'B'; if (!(estado.geometria[c] > 0)) estado.geometria[c] = R[c]; }
        cambio(); asis.rehacer();
      }
      if (prop) proponerD(prop.closest('.wz-paso').querySelector('[data-vivo="msg"]'));
    });
    document.addEventListener('zapatapp:unidades', () => { if (el && !el.hidden) { recalcular(); pintar(); if (asis) asis.rehacer(); } });
    window.addEventListener('scroll', () => { if (el && !el.hidden) $('#c-barra').classList.toggle('con-borde', window.scrollY > 4); }, { passive: true });
  }

  function ondaRiel(b, e) {
    if (global.Mov && global.Mov.reducido()) return;
    const r = b.getBoundingClientRect(), o = document.createElement('span');
    o.className = 'cat-onda';
    o.style.left = ((e.clientX || r.left + r.width / 2) - r.left) + 'px'; o.style.top = ((e.clientY || r.top + r.height / 2) - r.top) + 'px';
    b.appendChild(o);
    setTimeout(() => o.remove(), 700);
    b.classList.remove('pulsado'); void b.offsetWidth; b.classList.add('pulsado');
  }
  function cerrarRielMovil() { $('#c-categorias').classList.remove('abierto'); $('#c-btn-datos').setAttribute('aria-expanded', 'false'); }

  function primerPasoIncompleto() {
    const p = falt.length ? pasoDe(falt[0]) : 'proyecto';
    return Math.max(0, asis.indice(p));
  }

  // "Proponer d": la menor altura (cada 2.5 cm) con la que cumplen todos los chequeos de resistencia
  function proponerD(msg) {
    const base = T().preparar(estado);
    if (T().faltantes(base).filter((k) => k !== 'zapata.d').length) { if (msg) msg.textContent = 'Complete primero los demás datos.'; return; }
    for (let d = 0.2; d <= 2.5 + 1e-9; d += 0.025) {
      const e = T().clone(base); e.zapata.d = +d.toFixed(3);
      let r = null;
      try { r = T().calcular(e); } catch (ex) { r = null; }
      if (r && r.valido !== false && r.chequeos.every((c) => c.id === 'suelo' || c.ok)) {
        estado.zapata.d = e.zapata.d; cambio(); asis.refrescar();
        if (msg) msg.textContent = 'd = ' + global.Unidades.fmt(e.zapata.d, 'longitud', null, 3) + ' cumple todos los chequeos.';
        return;
      }
    }
    if (msg) msg.textContent = 'Ninguna altura hasta 2.50 m cumple. Revise la planta o los materiales.';
  }

  // ---------------------------------------------------------------- cálculo y guardado
  function recalcular() {
    const listo = T().preparar(estado);
    falt = T().faltantes(listo);
    R = null; errorCalc = '';
    if (!falt.length) { try { R = T().calcular(listo); } catch (ex) { R = null; errorCalc = 'No se pudo calcular: ' + ex.message; } }
    // Geometría imposible (L no cubre la columna interior, B menor que una columna): sin diseño
    if (R && R.valido === false) { errorCalc = R.avisos.join(' '); R = null; }
  }

  function guardar() {
    clearTimeout(tGuardar);
    if (id) global.Proyectos.guardar(id, estado, R ? (R.todoOk ? 'cumple' : 'no-cumple') : 'incompleto');
  }

  function cambio() {
    // Las columnas no pueden encimarse aunque crezca su tamaño
    if (estado.geometria.s > 0 && estado.geometria.s < global.Lienzo.separacionMin(estado)) estado.geometria.s = global.Lienzo.separacionMin(estado);
    recalcular();
    clearTimeout(tGuardar);
    tGuardar = setTimeout(guardar, 400); // antes de pintar: un error de dibujo no impide guardar
    pintar();
  }

  // ---------------------------------------------------------------- pintar
  function pintar() {
    const completos = {};
    pasos.forEach((p) => { completos[p.id] = true; });
    falt.forEach((k) => { completos[pasoDe(k)] = false; });
    if (errorCalc && !falt.length) completos.ubicacion = false;
    $('#c-categorias').innerHTML = global.TableroComun.riel(pasos, completos, global.PasosCombinada.ICONOS);
    $$('#mesa [data-cu]').forEach((s) => { s.textContent = global.Unidades.u(s.dataset.cu); });
    const vacio = !R;
    $('#c-vacio').hidden = !vacio;
    $('#c-contenido').hidden = vacio;
    if (vacio) { pintarVacio(); return; }
    pintarVeredicto(false);
    pintarDims();
    pintarPestana();
  }

  function pintarVacio() {
    const cats = pasos.filter((p) => falt.some((k) => pasoDe(k) === p.id));
    $('#c-vacio .v-tit').textContent = errorCalc ? 'Revise los datos' : 'Faltan datos para calcular';
    $('#c-vacio .v-det').textContent = errorCalc || 'Completa estas categorías para ver el veredicto, los planos y la memoria.';
    $('#c-faltan').innerHTML = (errorCalc ? pasos.filter((p) => p.id === 'ubicacion') : cats).map((p) =>
      '<button type="button" class="falta-item" data-cat="' + p.id + '"><span class="fi-tit">' + p.nombre + '</span><span class="fi-det">' +
      (errorCalc ? 'Revisar' : 'Falta: ' + falt.filter((k) => pasoDe(k) === p.id).map(global.PasosCombinada.nombre).join(', ')) + '</span></button>').join('');
    okPrevio = null;
  }

  function pintarVeredicto(animar) {
    const v = $('#c-veredicto'), ok = R.todoOk, U = global.Unidades;
    v.className = 'veredicto ' + (ok ? 'ok' : 'mal') + (v.classList.contains('anima') ? ' anima' : '');
    $('#c-v-tit').textContent = ok ? 'El diseño cumple' : 'El diseño no cumple';
    const cambio = okPrevio !== null && okPrevio !== ok;
    okPrevio = ok;
    if (cambio && pestana === 'veredicto') { animarVeredicto(); return; } // animarVeredicto vuelve a pintar con conteo
    $('#c-contexto').innerHTML = '<li>Gobierna ' + R.ult.combo + '</li><li>Método ' + (R.inp.metodo === 'documento' ? 'del documento' : 'corregido') + '</li>' +
      '<li>q<sub>u</sub> ' + U.num(Math.min(R.q.q1, R.q.q2), 'presion') + '–' + U.fmt(Math.max(R.q.q1, R.q.q2), 'presion') + '</li>';
    const utilMax = Math.max.apply(null, R.chequeos.map((c) => c.util));
    const cifras = { L: [U.a(R.L, 'longitud'), 2], B: [U.a(R.B, 'longitud'), 2], h: [U.a(R.h, 'longitud'), 2], util: [utilMax * 100, 0] };
    Object.keys(cifras).forEach((k) => global.Mov.contar($('[data-ccifra="' + k + '"]'), cifras[k][0], cifras[k][1], animar));
    $('[data-ccifra="util"]').classList.toggle('es-mal', utilMax > 1);
    $('#c-v-fallas').innerHTML = R.chequeos.filter((c) => !c.ok).map((c) => '<li>' + c.titulo + '</li>').join('');
    if (!fichaSel || !R.chequeos.some((c) => c.id === fichaSel)) fichaSel = R.chequeos.reduce((a, b) => (b.util > a.util ? b : a)).id;
    $('#c-chequeos').innerHTML = global.TableroComun.anillos(R.chequeos, fichaSel, CORTO);
    pintarFicha();
  }

  function pintarFicha() {
    const c = R && R.chequeos.find((x) => x.id === fichaSel);
    if (!c) return;
    $$('#c-chequeos .anillo').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.paso === fichaSel)));
    const f = $('#c-ficha');
    f.innerHTML = global.TableroComun.ficha(c);
    f.classList.remove('entra'); void f.offsetWidth; f.classList.add('entra');
  }

  function animarVeredicto() {
    const v = $('#c-veredicto'), r = $('#c-resumen');
    v.classList.remove('anima'); r.classList.remove('anima');
    void v.offsetWidth;
    v.classList.add('anima'); r.classList.add('anima');
    if (R) pintarVeredicto(true);
  }

  function pintarDims() {
    $$('#mesa .dims [data-ck]').forEach((i) => {
      if (i === document.activeElement) return;
      const v = get(estado, i.dataset.ck);
      i.value = v == null ? '' : String(Number(global.Unidades.a(v, 'longitud').toPrecision(6)));
    });
  }

  function mostrarPestana(p) {
    const cambia = p !== pestana, anterior = $('#c-panel-' + pestana);
    pestana = p;
    PESTANAS.forEach(([q]) => {
      const t = $('#c-tab-' + q), activo = q === p;
      t.setAttribute('aria-selected', String(activo));
      t.tabIndex = activo ? 0 : -1;
    });
    if (movers.pestanas) movers.pestanas();
    if (salida) { salida.cancel(); salida = null; }
    const abrirNuevo = () => {
      PESTANAS.forEach(([q]) => {
        const pan = $('#c-panel-' + q), activo = q === p;
        pan.hidden = !activo;
        if (activo && cambia) { pan.classList.remove('entra'); void pan.offsetWidth; pan.classList.add('entra'); }
      });
      if (movers.vistas) movers.vistas(true);
      if (cambia) window.scrollTo({ top: 0, behavior: 'auto' });
      pintarPestana();
    };
    // La pestaña que se cierra sale hacia arriba y se desvanece; luego entra la nueva (como en la aislada)
    if (cambia && anterior && !anterior.hidden && !global.Mov.reducido() && anterior.animate) {
      anterior.classList.remove('entra');
      salida = anterior.animate([{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(-12px) scale(0.985)', filter: 'blur(2px)' }],
        { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
      salida.onfinish = () => { salida = null; abrirNuevo(); };
    } else abrirNuevo();
  }

  function mostrarVista(v) {
    vista = v;
    $$('#c-vistas [data-vista]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.vista === v)));
    $$('#mesa .c-vista').forEach((d) => { d.hidden = d.dataset.v !== v; });
    $('#c-vista-tit').textContent = VISTAS.find((x) => x[0] === v)[1];
    if (movers.vistas) movers.vistas();
    pintarPestana();
  }

  // Solo se dibuja lo visible
  function pintarPestana() {
    if (!R) return;
    const D = global.DibujoCombinada, PI = global.PlantaInteractiva;
    if (pestana === 'planos') {
      if (vista === 'alzado') lienzo.pintar();
      if (vista === 'planta') { $('#c-planta').innerHTML = D.planta(R, 'cp'); PI.aplicar($('#c-planta')); }
      if (vista === 'corte-l') { $('#c-corte-l').innerHTML = D.corteLongitudinal(R); PI.aplicar($('#c-corte-l')); }
      if (vista === 'cortes-t') { [0, 1].forEach((i) => { $('#c-corte-' + i).innerHTML = D.corteTransversal(R, i); PI.aplicar($('#c-corte-' + i)); }); }
      if (vista === '3d' && global.Vista3DCombinada.montar($('#c-3d'), $('#c-3d-barra'))) global.Vista3DCombinada.mostrar(R);
    }
    if (global.MesaSecciones) global.MesaSecciones.pintar(pestana, R);
  }

  // ---------------------------------------------------------------- abrir, cerrar, exportar, informe
  function abrir(datos, pid, conCarga) {
    montar();
    estado = normalizar(datos);
    id = pid || global.Proyectos.nuevoId();
    okPrevio = null; fichaSel = null;
    document.body.classList.remove('en-bienvenida', 'en-portada');
    $('#bienvenida').hidden = true;
    $('#app').hidden = true;
    el.hidden = false;
    window.scrollTo(0, 0);
    recalcular();
    mostrarVista('alzado');
    mostrarPestana('veredicto');
    pintar();
    guardar();
    if (R) {
      if (conCarga) global.Cargando.mostrar('Abriendo proyecto', R).then(animarVeredicto);
      else animarVeredicto();
    }
  }

  // Zapata nueva: abre el asistente desde el primer paso
  function nueva(boton) {
    abrir(T().clone(T().VACIO));
    asis.abrir(0, 'nuevo', boton);
  }

  function cerrar() {
    guardar();
    if (asis) asis.cerrar();
    el.hidden = true;
    global.App.volverAOpciones();
  }

  function fuente() {
    if (!R) return null;
    return global.InformeCombinada.fuente(estado, () => R, (i) => {
      estado.proyecto.nombre = i.proyecto; estado.proyecto.elemento = i.elemento;
      estado.informe = { titulo: i.titulo, elaboro: i.elaboro, responsables: i.responsables, fecha: i.fecha };
      cambio();
    });
  }

  function exportar() {
    const nombre = (estado.proyecto.elemento || estado.proyecto.nombre || 'zapata-combinada').replace(/[^\w\-áéíóúñ ]+/gi, '').trim().replace(/\s+/g, '_') || 'zapata-combinada';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' }));
    a.download = nombre + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    global.App.avisar('Archivo ' + nombre + '.json exportado.');
  }

  // Cambia un dato desde otra sección (por ejemplo, la barra elegida en Refuerzo)
  function ajustar(ruta, valor) { set(estado, ruta, valor); cambio(); }

  function irA(idChequeo) { mostrarPestana('veredicto'); fichaSel = idChequeo; pintarFicha(); }

  global.Mesa = {
    abrir, nueva, cerrar, irA, mostrarPestana, mostrarVista, ajustar, fuente,
    asistente: () => asis, visible: () => !!el && !el.hidden, estado: () => estado, resultado: () => R,
  };
})(window);

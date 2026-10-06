/* Diseño de Zapatas v3: bienvenida con intro 3D, asistente paso a paso, dashboard por categorías,
 * proyectos recientes, informe PDF. El cálculo vive en el módulo del tipo de zapata (js/tipos/).
 */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const f = (x, d = 2) => Number(x).toFixed(d);
  const CLAVE_AJUSTES = 'dz-ajustes';
  const CLAVE_TEMA = 'diseno-zapatas-v2-tema';

  const T = window.Tipos['aislada-momento'];
  let estado = T.clone(T.VACIO);
  let proyectoId = null;
  let R = null;            // resultados cuando el proyecto está completo
  let enApp = false;
  let capa = 'presion', vista2 = '3d', hay3d = false, okPrevio = null;
  const movers = {};
  const abiertos = new Set(['serv']);

  // Pasos del asistente = categorías de edición del dashboard
  const PASOS = [
    { id: 'proyecto', nombre: 'Proyecto', titulo: 'Datos del proyecto' },
    { id: 'cargas', nombre: 'Cargas', titulo: 'Cargas de servicio' },
    { id: 'suelo', nombre: 'Suelo', titulo: 'Suelo de cimentación' },
    { id: 'columna', nombre: 'Columna', titulo: 'Columna' },
    { id: 'materiales', nombre: 'Materiales', titulo: 'Materiales y factores' },
    { id: 'planta', nombre: 'Planta', titulo: 'Planta de la zapata' },
    { id: 'altura', nombre: 'Altura', titulo: 'Altura de la zapata' },
  ];
  const NOMBRE_CAMPO = {
    'cargas.D.P': 'P de PP+CM', 'cargas.L.P': 'P de CV', 'suelo.qadm': 'σadm', 'suelo.Df': 'Df', 'suelo.gs': 'γ suelo', 'suelo.gc': 'γ concreto',
    'columna.Cx': 'Cx', 'columna.Cy': 'Cy', 'columna.barra': 'barra de la columna', 'columna.nBarras': 'número de barras', 'columna.alpha': 'ubicación (αs)',
    'materiales.fc': "f'c", 'materiales.fy': 'fy', 'materiales.lambda': 'λ', 'materiales.phiV': 'φ cortante', 'materiales.phiF': 'φ flexión', 'materiales.phiB': 'φ aplastamiento',
    'zapata.Lx': 'Lx', 'zapata.Ly': 'Ly', 'zapata.d': 'd', 'zapata.r': 'recubrimiento',
  };

  // ============================================================ utilidades de estado
  function leer(path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), estado); }
  function escribir(path, val) {
    const ks = path.split('.');
    let o = estado;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  // Completa campos faltantes con la plantilla vacía (archivos de versiones previas o incompletos).
  function normalizar(obj) {
    const base = T.clone(T.VACIO);
    (function mezclar(b, o) {
      Object.keys(b).forEach((k) => {
        if (o == null || !(k in o)) return;
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) mezclar(b[k], o[k]);
        else b[k] = o[k];
      });
    })(base, obj);
    return base;
  }
  function ajustes() {
    try { return Object.assign({ anim: 'activadas', sinIntro: false }, JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) || {}); }
    catch (e) { return { anim: 'activadas', sinIntro: false }; }
  }
  function guardarAjustes(a) { try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a)); } catch (e) { /* sin almacenamiento */ } }

  let tGuardar = 0;
  function guardarProyecto() {
    if (!proyectoId) return;
    clearTimeout(tGuardar);
    tGuardar = setTimeout(() => {
      const est = R ? (R.todoOk ? 'cumple' : 'no-cumple') : 'incompleto';
      Proyectos.guardar(proyectoId, estado, est);
    }, 300);
  }

  // ============================================================ formulario (asistente y ajuste rápido)
  function llenarSelectBarras() {
    $('#sel-barra-col').innerHTML = '<option value="">Seleccione…</option>' + Object.keys(Refuerzo.BARS).map((n) =>
      '<option value="' + n + '">#' + n + ' (' + Refuerzo.BARS[n].db + ' mm)</option>').join('');
  }

  function aFormulario() {
    $$('[data-k]').forEach((el) => {
      const v = leer(el.dataset.k);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
      el.classList.remove('invalido');
    });
    $('#campos-peso').classList.toggle('apagado', !estado.suelo.pesoPropio);
    $('#fy-malla').value = String(estado.acero.fyMalla || 4200);
  }

  function alCambiar(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.k) return;
    const tipo = el.dataset.tipo;
    let val;
    if (tipo === 'texto') val = el.value;
    else if (tipo === 'bool') val = el.checked;
    else if (el.value === '') val = null; // campo vacío
    else {
      val = tipo === 'int' ? parseInt(el.value, 10) : parseFloat(el.value);
      if (!isFinite(val)) { el.classList.add('invalido'); el.setAttribute('aria-invalid', 'true'); return; }
    }
    el.classList.remove('invalido');
    el.removeAttribute('aria-invalid');
    escribir(el.dataset.k, val);
    if (el.dataset.k === 'suelo.pesoPropio') $('#campos-peso').classList.toggle('apagado', !val);
    // sincroniza el mismo campo si aparece en otro lugar (asistente y ajuste rápido)
    $$('[data-k="' + el.dataset.k + '"]').forEach((o) => { if (o !== el && o.type !== 'checkbox') o.value = val == null ? '' : val; });
    recalcular('usuario');
  }

  // ============================================================ cálculo y dashboard
  let tMemoria = 0;
  function recalcular(origen) {
    const falt = T.faltantes(estado);
    pintarCategorias(falt);
    let error = null;
    R = null;
    if (!Object.keys(falt).length) {
      const listo = T.preparar(estado);
      error = T.validarEntrada(listo);
      if (!error) {
        try { R = T.calcular(listo); } catch (ex) { error = 'No se pudo calcular: ' + ex.message; }
      }
    }
    guardarProyecto();
    if (asistenteAbierto()) pintarPasoVivo();
    if (!enApp) return;
    $('#estado-vacio').hidden = !!R;
    $('#contenido').hidden = !R;
    if (!R) { pintarVacio(falt, error); return; }
    const animar = origen === 'programa';
    pintarResumen(animar);
    pintarPlanta();
    pintarVista2();
    pintarRefuerzo();
    clearTimeout(tMemoria);
    if (origen === 'inicio') pintarMemoria();
    else tMemoria = setTimeout(pintarMemoria, origen === 'usuario' ? 120 : 60);
  }

  function pintarCategorias(falt) {
    $('#categorias').innerHTML = PASOS.map((p) => {
      const ok = !falt[p.id];
      return '<button type="button" class="cat" data-cat="' + p.id + '"><span class="cat-punto ' + (ok ? 'ok' : 'falta') + '" aria-hidden="true"></span>' +
        p.nombre + '<span class="sr-only">' + (ok ? ', completo' : ', faltan datos') + '</span></button>';
    }).join('');
  }

  function pintarVacio(falt, error) {
    const cats = PASOS.filter((p) => falt[p.id]);
    $('#estado-vacio .v-tit').textContent = error ? 'Revise los datos' : 'Faltan datos para calcular';
    $('#estado-vacio .v-det').textContent = error || 'Completa estas categorías para ver la planta, los chequeos y la memoria.';
    $('#faltan').innerHTML = (error ? PASOS.filter((p) => p.id === 'planta' || p.id === 'altura') : cats).map((p) =>
      '<button type="button" class="falta-item" data-cat="' + p.id + '"><span class="fi-tit">' + p.nombre + '</span>' +
      '<span class="fi-det">' + (falt[p.id] ? 'Falta: ' + falt[p.id].map((k) => NOMBRE_CAMPO[k] || k).join(', ') : 'Revisar') + '</span></button>').join('');
    okPrevio = null;
  }

  function claseUtil(u, ok) { return !ok || u > 1 ? 'mal' : u > 0.9 ? 'aviso' : 'ok'; }

  function pintarResumen(animar) {
    const v = $('#veredicto');
    const ok = R.todoOk;
    v.className = 'veredicto ' + (ok ? 'ok' : 'mal');
    $('#v-tit').textContent = ok ? 'El diseño cumple' : 'El diseño no cumple';
    if (okPrevio !== null && okPrevio !== ok) { v.classList.remove('pulso'); void v.offsetWidth; v.classList.add('pulso'); }
    okPrevio = ok;
    const fallas = R.chequeos.filter((c) => !c.ok).map((c) => c.titulo.toLowerCase());
    $('#v-det').textContent = ok
      ? 'Gobierna ' + R.ult.gob.id + ' con σu = ' + f(R.ult.su) + ' tonf/m². Toda la base trabaja a compresión (caso ' + R.serv.caso + ').'
      : 'Falla en ' + fallas.join(', ') + '. Revise las dimensiones o el refuerzo.';
    const cifras = { Lx: [R.Lx, 2], Ly: [R.Ly, 2], h: [R.h, 2], smax: [R.serv.smax, 2], util: [R.utilMax * 100, 0] };
    Object.keys(cifras).forEach((k) => Mov.contar($('[data-cifra="' + k + '"]'), cifras[k][0], cifras[k][1], animar));
    $('[data-cifra-txt="qadm"]').textContent = f(estado.suelo.qadm);
    $('[data-cifra="smax"]').classList.toggle('es-mal', !R.serv.okMax);
    $('[data-cifra="util"]').classList.toggle('es-mal', R.utilMax > 1);
    $('#chequeos').innerHTML = R.chequeos.map((c) => {
      const cls = claseUtil(c.util, c.ok);
      const ancho = Math.max(2, Math.min(1, c.util) * 100);
      return '<li><a href="#paso-' + c.id + '" class="chequeo ' + (c.ok ? 'ok' : 'mal') + '" data-paso="' + c.id + '">' +
        '<span class="ch-tit">' + c.titulo + '</span><span class="ch-det">' + c.det + '</span>' +
        '<span class="ch-util ' + cls + '" title="Demanda / capacidad"><span class="ch-barra" style="width:' + ancho + '%"></span><span class="num">' + f(c.util * 100, 0) + '%</span></span>' +
        '<span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></a></li>';
    }).join('');
  }

  function pintarPlanta() { $('#planta').innerHTML = Dibujo.planta(R, capa); }

  function pintarVista2() {
    $('#vista3d').hidden = vista2 !== '3d';
    $('#corte').hidden = vista2 === '3d';
    $('#titulo-vista2').textContent = vista2 === '3d' ? 'Vista 3D' : 'Corte ' + vista2;
    if (vista2 !== '3d') $('#corte').innerHTML = Dibujo.corte(R, vista2);
    if (hay3d && vista2 === '3d') Vista3D.update(R);
  }

  // ---------------------------------------------------------------- refuerzo
  function tablaBarras(dir, ops, sel, req, b) {
    const filas = ops.map((o) =>
      '<tr class="est-' + o.estado + (o.barra === sel ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="bar' + dir + '" value="' + o.barra + '"' + (o.barra === sel ? ' checked' : '') + '> #' + o.barra + '</label></td>' +
      '<td class="num">' + o.n + '</td><td class="num">' + f(o.s) + '</td><td class="num">' + f(o.AsProv) + '</td>' +
      '<td class="num">' + f(o.ratio * 100, 0) + '%</td>' +
      '<td><span class="punto est-' + o.estado + '" aria-hidden="true"></span><span class="motivo">' + o.motivo + (o.gobiernaSmax && o.estado !== 'mal' ? ', por smax' : '') + '</span></td></tr>').join('');
    return '<h3>Paralelas a ' + dir + '<small>As requerido ' + f(req) + ' cm², repartido en ' + f(b) + ' m</small></h3>' +
      '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Barra</th><th>n</th><th>s (m)</th><th>As prov. (cm²)</th><th>Prov./req.</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function tablaMallas(rf) {
    const filas = rf.ops.map((o) =>
      '<tr class="est-' + o.estado + (o.ref === rf.ref ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="malla" value="' + o.ref + '"' + (o.ref === rf.ref ? ' checked' : '') + '> ' + o.ref + '</label><span class="alt">' + o.alt + '</span></td>' +
      '<td class="num">' + o.dL + ' / ' + o.dT + '</td><td class="num">' + o.sL + ' / ' + o.sT + '</td>' +
      '<td class="num">' + f(o.provX) + '</td><td class="num">' + f(o.provY) + '</td><td class="num">' + o.capas + '</td>' +
      '<td><span class="punto est-' + o.estado + '" aria-hidden="true"></span><span class="motivo">' + o.motivo + '</span></td></tr>').join('');
    return '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Referencia</th><th>Alambre L / T (mm)</th><th>Separación L / T (mm)</th><th>As en X (cm²/m)</th><th>As en Y (cm²/m)</th><th>Capas</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function pintarRefuerzo() {
    const rf = R.ref;
    const esMalla = rf.tipo === 'malla';
    $('#panel-barras').hidden = esMalla;
    $('#panel-malla').hidden = !esMalla;
    $$('#tipo-refuerzo button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ref === rf.tipo)));
    if (movers.ref) movers.ref();
    if (!esMalla) {
      $('#acero-x').innerHTML = tablaBarras('X', rf.opsX, rf.barX, R.fx.As, R.Ly);
      $('#acero-y').innerHTML = tablaBarras('Y', rf.opsY, rf.barY, R.fy.As, R.Lx);
      return;
    }
    $$('#capas-malla button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.capas === String(estado.acero.capas))));
    if (movers.capas) movers.capas();
    const ninguna = rf.ops.every((o) => o.estado === 'mal');
    $('#malla-req').innerHTML = 'Acero requerido por metro: <b class="num">' + f(rf.reqX) + '</b> cm²/m en X y <b class="num">' + f(rf.reqY) + '</b> cm²/m en Y, con fy = ' + estado.acero.fyMalla + ' kgf/cm².' +
      (ninguna ? ' <span class="txt-mal">Ninguna malla del catálogo alcanza, ni con 2 capas. Use barras corrugadas o reduzca la demanda.</span>' : '') +
      (rf.sel.traslapo ? ' <span class="txt-aviso">La zapata excede el panel de 6.00 × 2.35 m y requiere traslapos.</span>' : '');
    $('#tabla-mallas').innerHTML = tablaMallas(rf);
  }

  // ---------------------------------------------------------------- memoria y validación
  let secciones = [];
  function pintarMemoria() {
    if (!R) return;
    secciones = MemoriaAisladaMomento.generar(R);
    $('#memoria').innerHTML = Memoria.aHtml(secciones, abiertos);
  }
  function abrirPaso(d) { Memoria.completar(d, secciones); d.open = true; abiertos.add(d.id.replace('paso-', '')); }

  function pintarValidacion() {
    const res = T.validarContraPdf();
    const okTodos = res.every((r) => r.ok);
    const tag = $('#tag-validacion');
    tag.className = 'tag ' + (okTodos ? 'tag-ok' : 'tag-mal');
    tag.textContent = res.filter((r) => r.ok).length + ' de ' + res.length;
    $('#tabla-validacion').innerHTML = res.map((r) =>
      '<tr><td>' + r.lbl + '</td><td class="num">' + r.v + ' <span class="u">' + r.u + '</span></td><td class="num">' + f(r.calc, 3) + '</td>' +
      '<td class="num">' + f(r.err * 100, 2) + ' %</td><td><span class="tag ' + (r.ok ? 'tag-ok' : 'tag-mal') + '">' + (r.ok ? 'Coincide' : 'Revisar') + '</span></td></tr>').join('');
  }

  // ============================================================ asistente
  const wz = { i: 0, modo: 'nuevo' };
  const asistenteAbierto = () => $('#asistente').open;

  function mostrarPaso(i, direccion) {
    wz.i = i;
    const p = PASOS[i];
    $$('.wz-paso').forEach((s) => {
      const activo = s.dataset.paso === p.id;
      s.hidden = !activo;
      s.classList.remove('entra-der', 'entra-izq');
      if (activo && direccion) { void s.offsetWidth; s.classList.add(direccion > 0 ? 'entra-der' : 'entra-izq'); }
    });
    $('#wz-titulo').textContent = p.titulo;
    const editar = wz.modo === 'editar';
    $('#wz-contador').textContent = editar ? 'Editar datos' : 'Paso ' + (i + 1) + ' de ' + PASOS.length;
    $('#wz-progreso').hidden = editar;
    $('#wz-progreso').innerHTML = PASOS.map((q, k) => '<li class="' + (k < i ? 'hecho' : k === i ? 'actual' : '') + '"></li>').join('');
    $('#wz-atras').hidden = editar || i === 0;
    $('#wz-saltar').hidden = editar;
    $('#wz-siguiente').textContent = editar ? 'Listo' : i === PASOS.length - 1 ? 'Ver resultados' : 'Siguiente';
    $('#asistente').classList.toggle('wz-ancho', p.id === 'planta');
    ocultarError();
    pintarPasoVivo();
    const primero = $('.wz-paso[data-paso="' + p.id + '"] input, .wz-paso[data-paso="' + p.id + '"] select');
    if (primero) setTimeout(() => primero.focus({ preventScroll: true }), 30);
  }

  function abrirAsistente(i, modo) {
    wz.modo = modo || 'nuevo';
    aFormulario();
    const dlg = $('#asistente');
    if (!dlg.open) { dlg.showModal(); requestAnimationFrame(() => dlg.classList.add('abierto')); }
    mostrarPaso(i, 0);
  }
  function cerrarAsistente() {
    const dlg = $('#asistente');
    dlg.classList.remove('abierto');
    setTimeout(() => { if (dlg.open) dlg.close(); }, Mov.reducido() ? 0 : 170);
    recalcular('programa');
  }

  function ocultarError() { $('#wz-error').hidden = true; }
  function mostrarError(txt) { $('#wz-error-txt').textContent = txt; $('#wz-error').hidden = false; }

  // Revisa el paso actual: campos vacíos y, en Planta y Altura, si la zapata cumple.
  function revisarPaso() {
    const p = PASOS[wz.i];
    const falt = (T.faltantes(estado)[p.id] || []);
    $$('.wz-paso[data-paso="' + p.id + '"] [data-k]').forEach((el) => el.classList.toggle('invalido', falt.includes(el.dataset.k)));
    if (falt.length) return 'Faltan: ' + falt.map((k) => NOMBRE_CAMPO[k] || k).join(', ') + '.';
    if (p.id === 'planta') {
      const vp = vistaPlantaSegura();
      if (vp && !(vp.serv.okMax && vp.serv.okMin)) return 'La planta no cumple con el suelo. Aumente Lx o Ly, o use "Proponer".';
    }
    if (p.id === 'altura' && R) {
      const malos = R.chequeos.filter((c) => c.id !== 'serv' && c.id !== 'fl' && !c.ok).map((c) => c.titulo.toLowerCase());
      if (malos.length) return 'No cumple: ' + malos.join(', ') + '. Aumente d o use "Proponer d".';
    }
    return null;
  }

  function avanzar(forzar) {
    const msg = forzar ? null : revisarPaso();
    if (msg) { mostrarError(msg); return; }
    if (wz.modo === 'editar' || wz.i === PASOS.length - 1) { cerrarAsistente(); return; }
    mostrarPaso(wz.i + 1, 1);
  }

  function vistaPlantaSegura() {
    const f2 = T.faltantes(estado);
    if (f2.cargas || f2.suelo || f2.columna || f2.planta) return null;
    try { return T.vistaPlanta(estado); } catch (e) { return null; }
  }

  // Vista previa del paso actual (Planta y Altura) que se actualiza mientras se escribe
  function pintarPasoVivo() {
    const id = PASOS[wz.i].id;
    if (id === 'planta') {
      const f2 = T.faltantes(estado);
      const previas = ['cargas', 'suelo', 'columna'].filter((c) => f2[c]);
      const vp = vistaPlantaSegura();
      const v = $('#wz-planta-v');
      if (!vp) {
        $('#wz-planta').innerHTML = '<p class="wz-vacio">' + (previas.length ? 'Primero complete: ' + previas.map((c) => PASOS.find((p) => p.id === c).nombre.toLowerCase()).join(', ') + '.' : 'Ingrese Lx y Ly para ver las presiones en cada esquina.') + '</p>';
        v.className = 'wz-veredicto'; v.textContent = '';
        return;
      }
      $('#wz-planta').innerHTML = Dibujo.planta(vp, 'presion', 'wz');
      const ok = vp.serv.okMax && vp.serv.okMin;
      v.className = 'wz-veredicto ' + (ok ? 'ok' : 'mal');
      v.innerHTML = '<b>' + (ok ? 'Las dimensiones cumplen' : 'Las dimensiones no cumplen') + '</b><span>σmax ' + f(vp.serv.smax) + ' de ' + f(estado.suelo.qadm) + ' tonf/m², σmin ' + f(vp.serv.smin) + (vp.serv.smin > 0 ? ', sin tensión' : ', hay tensión') + '</span>';
    }
    if (id === 'altura') {
      const ul = $('#wz-altura');
      if (!R) {
        const falt = T.faltantes(estado);
        const cats = PASOS.filter((p) => falt[p.id]).map((p) => p.nombre.toLowerCase());
        ul.innerHTML = '<li class="wz-vacio">' + (cats.length ? 'Faltan datos en: ' + cats.join(', ') + '.' : 'Revise los datos.') + '</li>';
        return;
      }
      ul.innerHTML = R.chequeos.filter((c) => ['pz', 'cu', 'ap', 'ld'].includes(c.id)).map((c) =>
        '<li class="' + (c.ok ? 'ok' : 'mal') + '"><span>' + c.titulo + '</span><span class="num">' + f(c.util * 100, 0) + ' %</span><span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></li>').join('');
    }
  }

  // ============================================================ bienvenida
  function mostrarPantalla(nombre) {
    ['portada', 'opciones', 'tipos'].forEach((n) => {
      const el = $('#bv-' + n);
      const activo = n === nombre;
      el.hidden = !activo;
      if (activo) { el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); }
    });
    if (nombre === 'opciones') pintarRecientes();
  }

  function pintarRecientes() {
    const lista = Proyectos.listar();
    $('#recientes').hidden = !lista.length;
    const etq = { cumple: 'Cumple', 'no-cumple': 'No cumple', incompleto: 'Incompleto' };
    $('#lista-recientes').innerHTML = lista.map((p) =>
      '<li><button type="button" class="reciente" data-id="' + p.id + '">' +
      '<span class="rc-nombre">' + Informe.esc(p.nombre || 'Proyecto sin nombre') + '</span>' +
      '<span class="rc-meta">' + Informe.esc(p.elemento || 'Sin elemento') + ', ' + new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>' +
      '<span class="rc-estado ' + p.estado + '">' + etq[p.estado] + '</span></button>' +
      '<button type="button" class="btn-icono rc-borrar" data-borrar="' + p.id + '" aria-label="Borrar ' + Informe.esc(p.nombre || 'proyecto') + '" title="Borrar">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"/></svg></button></li>').join('');
  }

  function pintarTipos() {
    $('#tipos').innerHTML = CatalogoZapatas.map((t) =>
      '<button type="button" class="tipo-tarjeta' + (t.disponible ? '' : ' pronto') + '" data-tipo="' + t.id + '"' + (t.disponible ? '' : ' aria-disabled="true"') + '>' +
      '<span class="tt-nombre">' + t.nombre + '</span><span class="tt-desc">' + t.desc + '</span>' +
      (t.disponible ? '' : '<span class="mi-tag pronto">Próximamente</span>') + '</button>').join('');
  }

  async function reproducirIntro() {
    const intro = $('#intro');
    const a = ajustes();
    $('#bv-portada').hidden = true;
    intro.hidden = false;
    intro.classList.remove('sale');
    // Con "Según el sistema" y el sistema pidiendo menos movimiento: versión suave (sin vuelos de cámara)
    await Intro3D.reproducir(intro, { suave: a.anim === 'sistema' && Mov.reducido() });
    intro.classList.add('sale');
    mostrarPantalla('portada');
    $('#bv-portada').classList.add('desde-intro');
    setTimeout(() => { intro.hidden = true; intro.classList.remove('sale'); }, 600);
  }

  function abrirApp() {
    document.body.classList.remove('en-bienvenida');
    $('#bienvenida').hidden = true;
    $('#app').hidden = false;
    enApp = true;
    if (!hay3d) hay3d = Vista3D.init($('#vista3d'));
    Object.values(movers).forEach((m) => m && m(true));
    aFormulario();
    recalcular('inicio');
    if (R && hay3d) Vista3D.encuadrar(R, false);
    Mov.revelar($$('.vistas .vista, #bloque-refuerzo, #bloque-memoria, .pie'));
    window.scrollTo(0, 0);
  }

  function volverAlInicio() {
    clearTimeout(tGuardar);
    if (proyectoId) Proyectos.guardar(proyectoId, estado, R ? (R.todoOk ? 'cumple' : 'no-cumple') : 'incompleto');
    enApp = false;
    $('#app').hidden = true;
    $('#bienvenida').hidden = false;
    document.body.classList.add('en-bienvenida');
    mostrarPantalla('opciones');
  }

  function cargarProyecto(datos, id) {
    estado = normalizar(datos);
    proyectoId = id || Proyectos.nuevoId();
    okPrevio = null;
    abiertos.clear(); abiertos.add('serv');
    abrirApp();
  }

  // ============================================================ informe PDF
  function hoyIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function tituloPorDefecto() { return 'Memoria de cálculo de cimentación' + (estado.proyecto.elemento ? ' ' + estado.proyecto.elemento : ''); }
  function infoInforme() {
    const i = estado.informe || {};
    return { titulo: i.titulo || tituloPorDefecto(), proyecto: estado.proyecto.nombre || '', elemento: estado.proyecto.elemento || '',
      elaboro: i.elaboro || '', responsables: i.responsables || '', fecha: i.fecha || hoyIso() };
  }

  // Datos de entrada agrupados, con símbolo en LaTeX, valor y unidad
  function datosEntrada() {
    const e = estado, rd = Dibujo.refuerzoDibujo(R);
    const v = (x) => (x == null ? '0' : String(x));
    return [
      { grupo: 'Cargas de servicio', filas: [
        ['Carga axial muerta (PP+CM)', 'P_D', v(e.cargas.D.P), 'tonf'], ['Momento muerto en X', 'M_{x,D}', v(e.cargas.D.Mx), 'tonf·m'], ['Momento muerto en Y', 'M_{y,D}', v(e.cargas.D.My), 'tonf·m'],
        ['Carga axial viva (CV)', 'P_L', v(e.cargas.L.P), 'tonf'], ['Momento vivo en X', 'M_{x,L}', v(e.cargas.L.Mx), 'tonf·m'], ['Momento vivo en Y', 'M_{y,L}', v(e.cargas.L.My), 'tonf·m']] },
      { grupo: 'Suelo', filas: [['Esfuerzo admisible', '\\sigma_{adm}', v(e.suelo.qadm), 'tonf/m²'], ['Profundidad de desplante', 'D_f', v(e.suelo.Df), 'm']]
        .concat(e.suelo.pesoPropio ? [['Peso unitario del suelo', '\\gamma_s', v(e.suelo.gs), 'tonf/m³'], ['Peso unitario del concreto', '\\gamma_c', v(e.suelo.gc), 'tonf/m³']] : []) },
      { grupo: 'Columna', filas: [['Dimensión en X', 'C_x', v(e.columna.Cx), 'm'], ['Dimensión en Y', 'C_y', v(e.columna.Cy), 'm'],
        ['Barras longitudinales', 'n\\,\\#', e.columna.nBarras + ' #' + e.columna.barra, ''], ['Ubicación', '\\alpha_s', v(e.columna.alpha), '']] },
      { grupo: 'Materiales y factores', filas: [['Resistencia del concreto', "f'_c", v(e.materiales.fc), 'kgf/cm²'], ['Fluencia del acero', 'f_y', v(e.materiales.fy), 'kgf/cm²'],
        ['Factor de concreto liviano', '\\lambda', v(e.materiales.lambda), ''], ['Reducción a cortante', '\\phi_v', v(e.materiales.phiV), ''],
        ['Reducción a flexión', '\\phi_f', v(e.materiales.phiF), ''], ['Reducción a aplastamiento', '\\phi_b', v(e.materiales.phiB), '']] },
      { grupo: 'Zapata', filas: [['Dimensión en X', 'L_x', f(R.Lx), 'm'], ['Dimensión en Y', 'L_y', f(R.Ly), 'm'], ['Altura efectiva', 'd', f(R.d, 3), 'm'],
        ['Recubrimiento', 'r', f(R.r, 3), 'm'], ['Altura total', 'h', f(R.h, 3), 'm']] },
      { grupo: 'Refuerzo inferior', filas: [['Refuerzo', '', rd.etq, '']] },
    ];
  }

  function resumenTexto() {
    return 'Zapata de ' + f(R.Lx) + ' × ' + f(R.Ly) + ' m y ' + f(R.h) + ' m de altura. Gobierna ' + R.ult.gob.id + ' con σu = ' + f(R.ult.su) + ' tonf/m²; utilización máxima ' + f(R.utilMax * 100, 0) + ' %.';
  }

  let tituloOriginal = document.title;
  let imprimiendoInforme = false;
  function construirInforme(conExplica) {
    clearTimeout(tMemoria);
    secciones = MemoriaAisladaMomento.generar(R);
    const d = { info: infoInforme(), tipoNombre: T.nombre, R, secciones, datos: datosEntrada(), chequeos: R.chequeos, resumen: resumenTexto(), conExplica };
    let img = null;
    if (hay3d) { Vista3D.update(R); img = Vista3D.snapshot(); }
    d.figuras = [
      { html: Dibujo.planta(R, 'presion', 'inf'), cap: 'Planta: presiones de servicio' },
      { html: Dibujo.planta(R, 'acero', 'inf'), cap: 'Planta: refuerzo' },
      { html: Dibujo.corte(R, 'X', 'inf'), cap: 'Corte X' },
      { html: Dibujo.corte(R, 'Y', 'inf'), cap: 'Corte Y' },
    ];
    if (img) d.figuras.push({ src: img, cap: 'Vista 3D' });
    $('#informe').innerHTML = Informe.construir(d, $('#medidor-informe'));
    tituloOriginal = document.title;
    document.title = d.info.titulo; // nombre sugerido del archivo PDF
    document.body.classList.add('con-informe');
  }
  function limpiarInforme() {
    document.body.classList.remove('con-informe');
    $('#informe').innerHTML = '';
    document.title = tituloOriginal;
  }

  function abrirDialogoInforme() {
    if (!R) { avisar('Complete los datos del proyecto para generar la memoria.'); return; }
    const i = infoInforme();
    $('#inf-titulo').value = i.titulo; $('#inf-proyecto').value = i.proyecto; $('#inf-elemento').value = i.elemento;
    $('#inf-elaboro').value = i.elaboro; $('#inf-responsables').value = i.responsables; $('#inf-fecha').value = i.fecha;
    $('#inf-explica').checked = $('#chk-explica').checked;
    $('#inf-error').textContent = '';
    abrirDialogo($('#dlg-informe'));
    $('#inf-titulo').select();
  }
  function guardarDialogoInforme() {
    const titulo = $('#inf-titulo').value.trim();
    if (!titulo) { $('#inf-error').textContent = 'Escriba el título del documento.'; $('#inf-titulo').focus(); return false; }
    estado.proyecto.nombre = $('#inf-proyecto').value.trim();
    estado.proyecto.elemento = $('#inf-elemento').value.trim();
    estado.informe = { titulo: titulo === tituloPorDefecto() ? '' : titulo, elaboro: $('#inf-elaboro').value.trim(),
      responsables: $('#inf-responsables').value.trim(), fecha: $('#inf-fecha').value === hoyIso() ? '' : $('#inf-fecha').value };
    aFormulario();
    guardarProyecto();
    return true;
  }
  function imprimirInforme(conExplica) {
    construirInforme(conExplica);
    imprimiendoInforme = true;
    window.print();
  }

  // ============================================================ diálogos, avisos
  function abrirDialogo(dlg) { dlg.showModal(); requestAnimationFrame(() => dlg.classList.add('abierto')); }
  function cerrarDialogo(dlg) {
    dlg.classList.remove('abierto');
    setTimeout(() => { if (dlg.open) dlg.close(); }, Mov.reducido() ? 0 : 160);
  }
  let tAviso = 0;
  function avisar(txt) {
    const a = $('#aviso');
    a.textContent = txt;
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), 2800);
  }

  // ============================================================ tabla pegada de SAP2000 / ETABS
  function interpretarSap(texto) {
    const res = {};
    texto.split(/\r?\n/).forEach((linea) => {
      if (!linea.trim()) return;
      const partes = linea.split(/[\s;]+/).map((s) => s.trim()).filter(Boolean);
      const esNum = (p) => /^-?\d+([.,]\d+)?(e-?\d+)?$/i.test(p);
      const nombre = partes.filter((p) => !esNum(p)).join(' ').toUpperCase();
      const nums = partes.filter(esNum).map((p) => parseFloat(p.replace(',', '.')));
      if (nums.length < 6) return;
      const [, , Fz, Mx, My] = nums.slice(-6);
      let tipo = null;
      if (/\b1[.,]\d/.test(nombre)) tipo = null; // combinación mayorada: se ignora
      else if (/PP\s*\+\s*CM|\bDEAD\b|\bCM\b|\bD\b/.test(nombre)) tipo = 'D';
      else if (/\bCV\b|\bLIVE\b|\bL\b/.test(nombre)) tipo = 'L';
      if (tipo && !res[tipo]) res[tipo] = { P: Math.abs(Fz), Mx: Math.abs(Mx), My: Math.abs(My) };
    });
    return res;
  }

  // ============================================================ eventos
  function seleccionarEn(contSel, attr, valor) {
    $$(contSel + ' button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset[attr] === valor)));
  }

  function enlazar() {
    document.addEventListener('input', alCambiar);
    document.addEventListener('change', alCambiar);

    // --- bienvenida
    $('#btn-saltar').addEventListener('click', () => Intro3D.saltar());
    $('#btn-disenar').addEventListener('click', () => mostrarPantalla('opciones'));
    $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrarPantalla(b.dataset.ir)));
    $('#op-nueva').addEventListener('click', () => mostrarPantalla('tipos'));
    $('#op-ejemplo').addEventListener('click', () => {
      cargarProyecto(T.clone(T.EJEMPLO));
      avisar('Ejemplo del documento cargado: 2.50 × 2.00 m con d = 0.475 m.');
    });
    $('#tipos').addEventListener('click', (e) => {
      const t = e.target.closest('.tipo-tarjeta');
      if (!t) return;
      if (t.classList.contains('pronto')) { avisar(t.querySelector('.tt-nombre').textContent + ' estará disponible en una próxima versión.'); return; }
      cargarProyecto(T.clone(T.VACIO));
      abrirAsistente(0, 'nuevo');
    });
    $('#lista-recientes').addEventListener('click', (e) => {
      const borrar = e.target.closest('[data-borrar]');
      if (borrar) {
        Proyectos.borrar(borrar.dataset.borrar);
        pintarRecientes();
        avisar('Proyecto borrado de la lista.');
        return;
      }
      const r = e.target.closest('.reciente');
      if (!r) return;
      const p = Proyectos.obtener(r.dataset.id);
      if (p) cargarProyecto(p.datos, p.id);
    });

    // --- dashboard
    $('#btn-inicio').addEventListener('click', volverAlInicio);
    $('#categorias').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) abrirAsistente(PASOS.findIndex((p) => p.id === b.dataset.cat), 'editar');
    });
    $('#faltan').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) abrirAsistente(PASOS.findIndex((p) => p.id === b.dataset.cat), 'editar');
    });
    $$('.pn-btn').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.pasoK, delta = parseFloat(b.dataset.delta);
      const actual = leer(k) == null ? 0 : leer(k);
      escribir(k, Math.max(0.05, +(actual + delta).toFixed(3)));
      aFormulario();
      recalcular('usuario');
    }));

    movers.capas_planta = Mov.segmentado($('#capas'));
    movers.vistas = Mov.segmentado($('#vistas2'));
    movers.ref = Mov.segmentado($('#tipo-refuerzo'));
    movers.capas = Mov.segmentado($('#capas-malla'));

    $('#capas').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-capa]');
      if (!b || b.dataset.capa === capa) return;
      capa = b.dataset.capa;
      seleccionarEn('#capas', 'capa', capa);
      movers.capas_planta();
      const el = $('#planta');
      el.classList.remove('cambio'); void el.offsetWidth; el.classList.add('cambio');
      pintarPlanta();
    });
    $('#vistas2').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vista]');
      if (!b || b.dataset.vista === vista2) return;
      vista2 = b.dataset.vista;
      seleccionarEn('#vistas2', 'vista', vista2);
      movers.vistas();
      pintarVista2();
    });
    $('#btn-encuadrar').addEventListener('click', () => Vista3D.encuadrar(R, true));

    $('#tipo-refuerzo').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ref]');
      if (!b || b.dataset.ref === estado.acero.tipo) return;
      estado.acero.tipo = b.dataset.ref;
      recalcular('programa');
    });
    $('#capas-malla').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-capas]');
      if (!b) return;
      estado.acero.capas = b.dataset.capas === 'auto' ? 'auto' : parseInt(b.dataset.capas, 10);
      estado.acero.malla = null;
      recalcular('programa');
    });
    $('#fy-malla').addEventListener('change', (e) => { estado.acero.fyMalla = parseInt(e.target.value, 10); recalcular('programa'); });
    $('#bloque-refuerzo').addEventListener('change', (e) => {
      if (e.target.name === 'barX') estado.acero.barX = parseInt(e.target.value, 10);
      else if (e.target.name === 'barY') estado.acero.barY = parseInt(e.target.value, 10);
      else if (e.target.name === 'malla') estado.acero.malla = e.target.value;
      else return;
      recalcular('programa');
    });

    $('#chequeos').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-paso]');
      if (!a) return;
      e.preventDefault();
      clearTimeout(tMemoria);
      pintarMemoria();
      const d = document.getElementById('paso-' + a.dataset.paso);
      if (d) { abrirPaso(d); Mov.desplazarA(d); }
    });
    $('#memoria').addEventListener('toggle', (e) => {
      const d = e.target;
      if (!d.id || !d.id.startsWith('paso-')) return;
      const id = d.id.replace('paso-', '');
      if (d.open) Memoria.completar(d, secciones);
      if (d.open && d.dataset.cerrando !== '1') abiertos.add(id); else if (!d.open) abiertos.delete(id);
    }, true);
    Mov.detallesSuaves($('#memoria'), (d) => Memoria.completar(d, secciones));
    Mov.detallesSuaves($('#validacion').parentElement);
    $('#chk-explica').addEventListener('change', (e) => document.body.classList.toggle('sin-explica', !e.target.checked));
    $('#btn-abrir').addEventListener('click', () => $$('#memoria details.paso').forEach(abrirPaso));
    $('#btn-cerrar').addEventListener('click', () => { $$('#memoria details.paso').forEach((d) => { d.open = false; }); abiertos.clear(); });

    // --- asistente
    $('#wz-form').addEventListener('submit', (e) => { e.preventDefault(); avanzar(false); });
    $('#wz-continuar').addEventListener('click', () => avanzar(true));
    $('#wz-atras').addEventListener('click', () => { if (wz.i > 0) mostrarPaso(wz.i - 1, -1); });
    $('#wz-saltar').addEventListener('click', cerrarAsistente);
    $('#asistente').addEventListener('cancel', (e) => { e.preventDefault(); cerrarAsistente(); });
    $('#btn-nsr').addEventListener('click', () => {
      Object.keys(T.NSR).forEach((k) => escribir(k, T.NSR[k]));
      aFormulario();
      recalcular('usuario');
      avisar('Se llenaron λ, los factores φ, r = 7.5 cm y αs = 40 con los valores de la NSR-10.');
    });
    $('#btn-opt-planta').addEventListener('click', () => {
      const f2 = T.faltantes(estado);
      const previas = ['cargas', 'suelo', 'columna'].filter((c) => f2[c]);
      if (previas.length) { $('#msg-opt-planta').textContent = 'Primero complete: ' + previas.join(', ') + '.'; return; }
      const prueba = T.preparar(estado);
      if (prueba.zapata.d == null) prueba.zapata.d = 0.5;
      if (prueba.zapata.r == null) prueba.zapata.r = 0.075;
      const r = T.optimizarPlanta(prueba);
      if (!r) { $('#msg-opt-planta').textContent = 'Ninguna planta de hasta 10 × 10 m cumple. Revise las cargas o σadm.'; return; }
      estado.zapata.Lx = r.Lx; estado.zapata.Ly = r.Ly;
      aFormulario(); recalcular('programa');
      $('#msg-opt-planta').textContent = 'Planta mínima sin tensión y con σmax ≤ σadm: ' + f(r.Lx) + ' × ' + f(r.Ly) + ' m (' + f(r.A) + ' m²).';
    });
    $('#btn-opt-d').addEventListener('click', () => {
      const falt = T.faltantes(estado);
      const otras = Object.keys(falt).filter((c) => c !== 'altura' || falt.altura.some((k) => k !== 'zapata.d'));
      if (otras.length) { $('#msg-opt-d').textContent = 'Primero complete: ' + otras.join(', ') + '.'; return; }
      const prueba = T.preparar(estado);
      if (prueba.zapata.r == null) { prueba.zapata.r = 0.075; estado.zapata.r = 0.075; }
      const d = T.optimizarPeralte(prueba);
      if (d == null) { $('#msg-opt-d').textContent = 'Ningún d de hasta 2.0 m cumple todos los chequeos. Revise la planta.'; return; }
      estado.zapata.d = d;
      aFormulario(); recalcular('programa');
      $('#msg-opt-d').textContent = 'd mínimo que cumple cortante, flexión, aplastamiento y ldc: ' + f(d, 3) + ' m (h = ' + f(d + estado.zapata.r, 3) + ' m).';
    });
    $('#btn-interpretar').addEventListener('click', () => {
      const r = interpretarSap($('#texto-sap').value);
      const msg = $('#msg-sap');
      if (!r.D && !r.L) { msg.textContent = 'No se encontraron filas de CV ni de PP+CM. Copie la tabla con sus columnas Fx a Mz.'; msg.className = 'msg mal'; return; }
      if (r.D) Object.assign(estado.cargas.D, r.D);
      if (r.L) Object.assign(estado.cargas.L, r.L);
      aFormulario(); recalcular('programa');
      msg.className = 'msg ok';
      msg.textContent = 'Leído: ' + [r.D ? 'PP+CM (P ' + r.D.P + ')' : null, r.L ? 'CV (P ' + r.L.P + ')' : null].filter(Boolean).join(' y ') + (!r.D || !r.L ? '. Falta una de las dos filas.' : '.');
    });

    // --- archivos
    $('#btn-exportar').addEventListener('click', () => {
      const nombre = (estado.proyecto.elemento || estado.proyecto.nombre || 'zapata').replace(/[^\w\-áéíóúñ ]+/gi, '').trim().replace(/\s+/g, '_') || 'zapata';
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      avisar('Archivo ' + nombre + '.json exportado.');
    });
    $('#archivo-importar').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const lector = new FileReader();
      lector.onload = () => {
        try {
          const datos = JSON.parse(lector.result);
          if (!datos || typeof datos !== 'object' || !datos.cargas) throw new Error('formato');
          cargarProyecto(datos);
          avisar('Importado: ' + file.name);
        } catch (ex) {
          avisar('El archivo no es un .json válido de esta aplicación.');
        }
        e.target.value = '';
      };
      lector.readAsText(file);
    });

    // --- informe
    $('#btn-imprimir').addEventListener('click', abrirDialogoInforme);
    $('#inf-cancelar').addEventListener('click', () => cerrarDialogo($('#dlg-informe')));
    $('#form-informe').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!guardarDialogoInforme()) return;
      const conExplica = $('#inf-explica').checked;
      cerrarDialogo($('#dlg-informe'));
      setTimeout(() => imprimirInforme(conExplica), Mov.reducido() ? 30 : 190);
    });
    window.addEventListener('beforeprint', () => {
      if (R && !document.body.classList.contains('con-informe')) construirInforme($('#chk-explica').checked);
    });
    window.addEventListener('afterprint', () => {
      limpiarInforme();
      if (imprimiendoInforme) {
        imprimiendoInforme = false;
        const dl = $('#doc-listo');
        dl.classList.remove('anima');
        abrirDialogo(dl);
        requestAnimationFrame(() => dl.classList.add('anima'));
      }
    });
    $('#dl-cerrar').addEventListener('click', () => cerrarDialogo($('#doc-listo')));
    $('#dl-reimprimir').addEventListener('click', () => { cerrarDialogo($('#doc-listo')); setTimeout(abrirDialogoInforme, 180); });

    // --- ajustes y tema
    $$('[data-abrir-ajustes]').forEach((b) => b.addEventListener('click', () => {
      const a = ajustes();
      $$('input[name="aj-anim"]').forEach((r) => { r.checked = r.value === a.anim; });
      $('#aj-sin-intro').checked = !!a.sinIntro;
      abrirDialogo($('#dlg-ajustes'));
    }));
    $('#dlg-ajustes').addEventListener('change', (e) => {
      const a = ajustes();
      if (e.target.name === 'aj-anim') { a.anim = e.target.value; Mov.configurar(a.anim); }
      if (e.target.id === 'aj-sin-intro') a.sinIntro = e.target.checked;
      guardarAjustes(a);
    });
    $('#dlg-ajustes form').addEventListener('submit', (e) => { e.preventDefault(); cerrarDialogo($('#dlg-ajustes')); });
    [$('#dlg-informe'), $('#doc-listo'), $('#dlg-ajustes')].forEach((dlg) => {
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); cerrarDialogo(dlg); });
      dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarDialogo(dlg); });
    });
    $('#btn-tema').addEventListener('click', () => {
      const raiz = document.documentElement;
      const oscuro = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.classList.add('cambiando-tema');
      raiz.dataset.theme = oscuro ? 'light' : 'dark';
      setTimeout(() => raiz.classList.remove('cambiando-tema'), 320);
      try { localStorage.setItem(CLAVE_TEMA, raiz.dataset.theme); } catch (err) { /* sin almacenamiento */ }
    });

    const barra = $('#barra-sup');
    window.addEventListener('scroll', () => barra.classList.toggle('con-borde', window.scrollY > 4), { passive: true });
  }

  // ============================================================ inicio
  function iniciar() {
    try { const t = localStorage.getItem(CLAVE_TEMA); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* sin almacenamiento */ }
    const a = ajustes();
    Mov.configurar(a.anim);
    Proyectos.migrar();
    $('#bv-marca').innerHTML = Logo.svg('logo-grande', 'Diseño de Zapatas');
    $('#marca-logo').innerHTML = Logo.svg('logo');
    llenarSelectBarras();
    pintarTipos();
    enlazar();
    pintarCategorias(T.faltantes(estado));
    pintarValidacion();
    if (a.sinIntro || a.anim === 'desactivadas' || typeof THREE === 'undefined') mostrarPantalla('portada');
    else reproducirIntro();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();

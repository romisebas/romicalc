/* ZapatAPP v3.2: bienvenida con intro 3D, asistente paso a paso, dashboard por categorías,
 * proyectos recientes, informe PDF. El cálculo vive en el módulo del tipo de zapata (js/tipos/).
 */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const f = (x, d = 2) => Number(x).toFixed(d);
  const CLAVE_AJUSTES = 'dz-ajustes';
  const CLAVE_TEMA = 'zapatapp-tema'; // v3.2: clave nueva para que todos arranquen en oscuro

  const T = window.Tipos['aislada-momento'];
  let estado = T.clone(T.VACIO);
  let proyectoId = null;
  let R = null;            // resultados cuando el proyecto está completo
  let enApp = false;
  let capa = 'presion', vista2 = '3d', hay3d = false, okPrevio = null, pestana = 'veredicto', encuadrado = false, veredictoPendiente = false, dirElegida = 'X', fichaSel = null;
  const movers = {};
  const RF_BARS = window.Zapata.BARS; // catálogo de barras (db en mm, A en cm²)

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
  // Magnitud física de cada campo numérico (para convertir al sistema de unidades activo)
  const MAGNITUD = {
    'cargas.D.P': 'fuerza', 'cargas.L.P': 'fuerza', 'cargas.D.Mx': 'momento', 'cargas.D.My': 'momento', 'cargas.L.Mx': 'momento', 'cargas.L.My': 'momento',
    'suelo.qadm': 'presion', 'suelo.Df': 'longitud', 'suelo.gs': 'peso', 'suelo.gc': 'peso',
    'columna.Cx': 'longitud', 'columna.Cy': 'longitud', 'materiales.fc': 'esfuerzo', 'materiales.fy': 'esfuerzo',
    'zapata.Lx': 'longitud', 'zapata.Ly': 'longitud', 'zapata.d': 'longitud', 'zapata.r': 'longitud',
  };
  // Valor interno → texto del campo en el sistema activo (sin ruido de coma flotante)
  function mostrar(k, v) {
    if (v == null || v === '') return '';
    const mag = MAGNITUD[k];
    return mag && Unidades.actual() !== 'curso' ? String(Number(Unidades.a(v, mag).toPrecision(6))) : String(v);
  }
  function aInterno(k, v) { const mag = MAGNITUD[k]; return mag && v != null && Unidades.actual() !== 'curso' ? Number(Unidades.de(v, mag).toPrecision(12)) : v; }
  // Etiquetas de unidades y paso de los campos según el sistema
  function pintarUnidades() {
    $$('[data-u]').forEach((el) => { el.textContent = Unidades.u(el.dataset.u); });
    $$('input[type="number"][data-k]').forEach((el) => {
      if (!MAGNITUD[el.dataset.k]) return;
      if (!el.dataset.paso) el.dataset.paso = el.getAttribute('step') || 'any';
      el.setAttribute('step', Unidades.actual() === 'curso' ? el.dataset.paso : 'any');
    });
  }

  function cambiarUnidades(id) {
    Unidades.usar(id);
    pintarUnidades();
    aFormulario();
    recalcular('programa');
  }

  function ajustes() {
    try { return Object.assign({ anim: 'activadas', sinIntro: false, unid: 'curso' }, JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) || {}); }
    catch (e) { return { anim: 'activadas', sinIntro: false, unid: 'curso' }; }
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
      else el.value = mostrar(el.dataset.k, v);
      el.classList.remove('invalido');
    });
    $('#campos-peso').classList.toggle('apagado', !estado.suelo.pesoPropio);
    $('#fy-malla').value = String(estado.acero.fyMalla || 4200);
  }

  function alCambiar(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.k || el.closest('#mesa')) return; // la mesa de la combinada maneja sus campos
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
    escribir(el.dataset.k, aInterno(el.dataset.k, val));
    if (el.dataset.k === 'suelo.pesoPropio') $('#campos-peso').classList.toggle('apagado', !val);
    // sincroniza el mismo campo si aparece en otro lugar (asistente y ajuste rápido)
    $$('[data-k="' + el.dataset.k + '"]').forEach((o) => { if (o !== el && o.type !== 'checkbox') o.value = val == null ? '' : el.value; });
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
    $('#pestanas').hidden = !R;
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

  // Íconos del riel de datos (trazos de 24 × 24); cada uno tiene su animación al pasar el mouse
  const ICONOS = {
    proyecto: '<path d="M4 6h6l2 2h8v11H4z"/><path class="ic-mov" d="M8 13h8M8 16h5"/>',
    cargas: '<path class="ic-mov" d="M12 2v8M8.5 6.5 12 10l3.5-3.5"/><path d="M9 12h6v4H9zM5 16h14v4H5z"/>',
    suelo: '<path d="M3 9h18"/><path class="ic-mov" d="M5 13l3 3M10 13l3 3M15 13l3 3M5 18l2 2M11 18l2 2M17 18l2 2"/>',
    columna: '<path d="M5 20h14"/><path class="ic-mov" d="M9 4h6v16H9z"/><path d="M11 7v10M13 7v10"/>',
    materiales: '<path class="ic-mov" d="M12 3 4 7l8 4 8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>',
    planta: '<path d="M4 4h16v16H4z"/><path class="ic-mov" d="M9.5 9.5h5v5h-5z"/>',
    altura: '<path d="M4 15h16v5H4z"/><path class="ic-mov" d="M12 3v9M9.5 5.5 12 3l2.5 2.5M9.5 9.5 12 12l2.5-2.5"/>',
  };
  function pintarCategorias(falt) {
    $('#categorias').innerHTML = '<span class="riel-tit">Datos</span>' + PASOS.map((p) => {
      const ok = !falt[p.id];
      return '<button type="button" class="cat" data-cat="' + p.id + '" title="' + p.nombre + '">' +
        '<span class="cat-ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICONOS[p.id] + '</svg><span class="cat-punto ' + (ok ? 'ok' : 'falta') + '"></span></span>' +
        '<span class="cat-nom">' + p.nombre + '</span><span class="sr-only">' + (ok ? ', completo' : ', faltan datos') + '</span></button>';
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
    v.className = 'veredicto ' + (ok ? 'ok' : 'mal') + (v.classList.contains('anima') ? ' anima' : '');
    $('#v-tit').textContent = ok ? 'El diseño cumple' : 'El diseño no cumple';
    // Si cambia el resultado: se anima ahora o al volver a la pestaña Veredicto
    if (okPrevio !== null && okPrevio !== ok) { if (pestana === 'veredicto') animarVeredicto(); else veredictoPendiente = true; }
    okPrevio = ok;
    // Contexto en píldoras: combinación que gobierna, esfuerzo de diseño y caso de presiones
    $('#v-contexto').innerHTML = '<li>Gobierna ' + R.ult.gob.id + '</li><li>σu ' + Unidades.fmt(R.ult.su, 'presion') + '</li>' +
      '<li>Caso ' + R.serv.caso + (R.serv.caso === 'A' ? ', base en compresión' : ', hay tensión') + '</li>';
    const UA = (x, mag) => Unidades.a(x, mag);
    const cifras = { Lx: [UA(R.Lx, 'longitud'), 2], Ly: [UA(R.Ly, 'longitud'), 2], h: [UA(R.h, 'longitud'), 2], util: [R.utilMax * 100, 0] };
    Object.keys(cifras).forEach((k) => Mov.contar($('[data-cifra="' + k + '"]'), cifras[k][0], cifras[k][1], animar));
    // Si no cumple: una píldora por cada chequeo que falla, bajo el titular
    $('#v-fallas').innerHTML = R.chequeos.filter((c) => !c.ok).map((c) => '<li>' + c.titulo + '</li>').join('');
    $('[data-cifra="util"]').classList.toggle('es-mal', R.utilMax > 1);
    // Anillos de utilización (uno por chequeo); la ficha muestra el seleccionado o el más exigido
    if (!fichaSel || !R.chequeos.some((c) => c.id === fichaSel)) fichaSel = R.chequeos.reduce((a, b) => (b.util > a.util ? b : a)).id;
    $('#chequeos').innerHTML = R.chequeos.map((c) => {
      const cls = claseUtil(c.util, c.ok), u = Math.min(1, c.util) * 100;
      return '<li><button type="button" role="tab" class="chequeo anillo ' + (c.ok ? 'ok' : 'mal') + ' u-' + cls + '" data-paso="' + c.id + '" aria-selected="' + (c.id === fichaSel) + '">' +
        '<svg class="an-svg" viewBox="0 0 64 64" aria-hidden="true"><circle class="an-pista" cx="32" cy="32" r="26" pathLength="100"/>' +
        '<circle class="an-valor" cx="32" cy="32" r="26" pathLength="100" style="--u:' + u.toFixed(1) + '"/></svg>' +
        '<span class="an-pct num">' + f(c.util * 100, 0) + '%</span><span class="an-nom">' + (CORTO[c.id] || c.titulo) + '</span>' +
        '<span class="sr-only">' + c.titulo + (c.ok ? ', cumple' : ', no cumple') + '</span></button></li>';
    }).join('');
    pintarFicha();
  }

  const CORTO = { serv: 'Suelo', pz: 'Cortante 2D', cu: 'Cortante 1D', fl: 'Flexión', ap: 'Aplastamiento', ld: 'Desarrollo' };
  function pintarFicha() {
    const c = R.chequeos.find((x) => x.id === fichaSel);
    if (!c) return;
    const cls = claseUtil(c.util, c.ok);
    $$('#chequeos .anillo').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.paso === fichaSel)));
    $('#ficha').innerHTML = '<div class="ficha-cab"><h3 class="ficha-tit">' + c.titulo + '</h3>' +
      '<span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></div>' +
      '<p class="ficha-det">' + c.det + '</p>' +
      '<div class="ficha-barra u-' + cls + '"><span class="ch-pista"><span class="ch-barra" style="width:' + Math.max(2, Math.min(1, c.util) * 100) + '%"></span></span>' +
      '<span class="num">' + f(c.util * 100, 0) + '% de la capacidad</span></div>' +
      '<a href="#" class="ficha-memoria" data-paso="' + c.id + '">Ver en la memoria ›</a>';
    $('#ficha').classList.remove('entra'); void $('#ficha').offsetWidth; $('#ficha').classList.add('entra');
  }

  // Animación del veredicto: el aro se dibuja; si cumple aparece el check y un latido verde,
  // si no cumple se trazan las dos líneas de la X y el bloque tiembla.
  function animarVeredicto() {
    const v = $('#veredicto');
    const r = $('#resumen');
    v.classList.remove('anima'); r.classList.remove('anima');
    void v.offsetWidth;
    v.classList.add('anima'); r.classList.add('anima');
  }

  // ---------------------------------------------------------------- pestañas
  let salidaPanel = null;
  function mostrarPestana(id, foco) {
    const cambia = id !== pestana;
    const anterior = $('#panel-' + pestana);
    pestana = id;
    $$('#pestanas [role="tab"]').forEach((b) => {
      const sel = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(sel));
      b.tabIndex = sel ? 0 : -1;
      if (sel && foco) b.focus();
    });
    if (movers.pestanas) movers.pestanas();
    // Un cambio rápido de pestaña interrumpe el cierre anterior (cancelar no dispara onfinish)
    if (salidaPanel) { salidaPanel.cancel(); salidaPanel = null; }
    const abrirNuevo = () => {
      $$('#contenido > .panel').forEach((pn) => {
        const sel = pn.id === 'panel-' + id;
        pn.hidden = !sel;
        if (sel && cambia) { pn.classList.remove('entra'); void pn.offsetWidth; pn.classList.add('entra'); }
      });
      Object.keys(movers).forEach((k) => { if (k !== 'pestanas' && movers[k]) movers[k](true); });
      if (id === 'veredicto' && veredictoPendiente) { veredictoPendiente = false; animarVeredicto(); }
      if (id === 'planos' && hay3d && R && !encuadrado) { Vista3D.encuadrar(R, false); encuadrado = true; }
      if (cambia) window.scrollTo({ top: 0, behavior: 'auto' });
    };
    // La pestaña que se cierra sale hacia arriba y se desvanece; luego entra la nueva
    if (cambia && anterior && !anterior.hidden && !Mov.reducido() && anterior.animate) {
      anterior.classList.remove('entra');
      salidaPanel = anterior.animate(
        [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(-12px) scale(0.985)', filter: 'blur(2px)' }],
        { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
      salidaPanel.onfinish = () => { salidaPanel = null; abrirNuevo(); };
    } else abrirNuevo();
  }

  function pintarPlanta() { $('#planta').innerHTML = Dibujo.planta(R, capa); PlantaInteractiva.aplicar($('#planta')); }

  function pintarVista2() {
    $('#vista3d').hidden = vista2 !== '3d';
    $('#corte').hidden = vista2 === '3d';
    $('#titulo-vista2').textContent = vista2 === '3d' ? 'Vista 3D' : 'Corte ' + vista2;
    if (vista2 !== '3d') { $('#corte').innerHTML = Dibujo.corte(R, vista2); PlantaInteractiva.aplicar($('#corte')); }
    if (hay3d && vista2 === '3d') Vista3D.update(R);
  }

  // ---------------------------------------------------------------- refuerzo
  function tablaBarras(dir, ops, sel, req, b) {
    const filas = ops.map((o) =>
      '<tr class="est-' + o.estado + (o.barra === sel ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="bar' + dir + '" value="' + o.barra + '"' + (o.barra === sel ? ' checked' : '') + '> #' + o.barra + '</label></td>' +
      '<td class="num">' + o.n + '</td><td class="num">' + Unidades.num(o.s, 'longitud') + '</td><td class="num">' + Unidades.num(o.AsProv, 'acero') + '</td>' +
      '<td class="num">' + f(o.ratio * 100, 0) + '%</td>' +
      '<td><span class="punto est-' + o.estado + '" aria-hidden="true"></span><span class="motivo">' + o.motivo + (o.gobiernaSmax && o.estado !== 'mal' ? ', por smax' : '') + '</span></td></tr>').join('');
    return '<h3>Paralelas a ' + dir + '<small>As requerido ' + Unidades.fmt(req, 'acero') + ', repartido en ' + Unidades.fmt(b, 'longitud') + '</small></h3>' +
      '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Barra</th><th>n</th><th>s (' + Unidades.u('longitud') + ')</th><th>As prov. (' + Unidades.u('acero') + ')</th><th>Prov./req.</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function tablaMallas(rf) {
    const filas = rf.ops.map((o) =>
      '<tr class="est-' + o.estado + (o.ref === rf.ref ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="malla" value="' + o.ref + '"' + (o.ref === rf.ref ? ' checked' : '') + '> ' + o.ref + '</label><span class="alt">' + o.alt + '</span></td>' +
      '<td class="num">' + o.dL + ' / ' + o.dT + '</td><td class="num">' + o.sL + ' / ' + o.sT + '</td>' +
      '<td class="num">' + Unidades.num(o.provX, 'aceroM') + '</td><td class="num">' + Unidades.num(o.provY, 'aceroM') + '</td><td class="num">' + o.capas + '</td>' +
      '<td><span class="punto est-' + o.estado + '" aria-hidden="true"></span><span class="motivo">' + o.motivo + '</span></td></tr>').join('');
    return '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Referencia</th><th>Alambre L / T (mm)</th><th>Separación L / T (mm)</th><th>As en X (' + Unidades.u('aceroM') + ')</th><th>As en Y (' + Unidades.u('aceroM') + ')</th><th>Capas</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  // Tarjeta del elemento elegido: 3D y dibujo de la barra (por dirección) o de la malla
  function pintarElegido() {
    const rf = R.ref, esMalla = rf.tipo === 'malla';
    $('#elegido-dir').hidden = esMalla;
    let e;
    if (esMalla) {
      const m = rf.sel;
      e = { tipo: 'malla', ref: m.ref, alt: m.alt, dL: m.dL, dT: m.dT, sL: m.sL, sT: m.sT, capas: m.capas };
      $('#elegido-tit').textContent = 'Malla ' + (m.capas > 1 ? '2 × ' : '') + m.ref + ' (' + m.alt + ')';
    } else {
      const sel = dirElegida === 'X' ? rf.selX : rf.selY, b = RF_BARS[sel.barra];
      e = { tipo: 'barra', barra: sel.barra, db: b.db, A: b.A, n: sel.n, sTxt: Unidades.fmt(sel.s, 'longitud'), dir: dirElegida };
      $('#elegido-tit').textContent = sel.n + ' barras #' + sel.barra + ' @ ' + Unidades.fmt(sel.s, 'longitud') + ', paralelas a ' + dirElegida;
      $$('#elegido-dir button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.dir === dirElegida)));
      if (movers.elegido) movers.elegido();
    }
    $('#elegido-2d').innerHTML = Elemento.svg2d(e);
    Elemento.mostrar(e);
  }

  function pintarRefuerzo() {
    const rf = R.ref;
    const esMalla = rf.tipo === 'malla';
    $('#panel-barras').hidden = esMalla;
    $('#panel-malla').hidden = !esMalla;
    $$('#tipo-refuerzo button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ref === rf.tipo)));
    if (movers.ref) movers.ref();
    pintarElegido();
    if (!esMalla) {
      $('#acero-x').innerHTML = tablaBarras('X', rf.opsX, rf.barX, R.fx.As, R.Ly);
      $('#acero-y').innerHTML = tablaBarras('Y', rf.opsY, rf.barY, R.fy.As, R.Lx);
      return;
    }
    $$('#capas-malla button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.capas === String(estado.acero.capas))));
    if (movers.capas) movers.capas();
    const ninguna = rf.ops.every((o) => o.estado === 'mal');
    $('#malla-req').innerHTML = 'Acero requerido: <b class="num">' + Unidades.fmt(rf.reqX, 'aceroM') + '</b> en X y <b class="num">' + Unidades.fmt(rf.reqY, 'aceroM') + '</b> en Y, con fy = ' + Unidades.fmt(estado.acero.fyMalla, 'esfuerzo') + '.' +
      (ninguna ? ' <span class="txt-mal">Ninguna malla del catálogo alcanza, ni con 2 capas. Use barras corrugadas o reduzca la demanda.</span>' : '') +
      (rf.sel.traslapo ? ' <span class="txt-aviso">La zapata excede el panel de 6.00 × 2.35 m y requiere traslapos.</span>' : '');
    $('#tabla-mallas').innerHTML = tablaMallas(rf);
  }

  // ---------------------------------------------------------------- memoria y validación
  let secciones = [];
  function pintarMemoria() {
    if (!R) return;
    secciones = MemoriaAisladaMomento.generar(R);
    Diapositivas.datos(secciones, R);
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
    // Enfoca el primer campo solo si el usuario no está ya escribiendo en otro campo del paso
    if (primero) setTimeout(() => { if (!primero.closest('.wz-paso').contains(document.activeElement)) primero.focus({ preventScroll: true }); }, 30);
  }

  function abrirAsistente(i, modo, desde) {
    wz.modo = modo || 'nuevo';
    aFormulario();
    const dlg = $('#asistente');
    if (!dlg.open) {
      dlg.showModal();
      if (desde && !Mov.reducido() && dlg.animate) {
        // La ventana crece desde el botón del riel que se pulsó
        const b = desde.getBoundingClientRect(), d = dlg.getBoundingClientRect();
        const dx = (b.left + b.width / 2) - (d.left + d.width / 2), dy = (b.top + b.height / 2) - (d.top + d.height / 2);
        dlg.classList.add('abierto');
        dlg.animate([{ opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.08)' }, { opacity: 1, transform: 'none' }],
          { duration: 460, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      } else requestAnimationFrame(() => dlg.classList.add('abierto'));
    }
    mostrarPaso(i, 0);
  }
  function cerrarAsistente() {
    const dlg = $('#asistente');
    const terminoNuevo = wz.modo === 'nuevo';
    dlg.classList.remove('abierto');
    setTimeout(() => { if (dlg.open) dlg.close(); }, Mov.reducido() ? 0 : 170);
    recalcular('programa');
    // Al terminar de ingresar los datos de una zapata nueva: carga y veredicto animado
    if (terminoNuevo && R) {
      wz.modo = 'editar';
      mostrarPestana('veredicto');
      Cargando.mostrar('Calculando', R).then(animarVeredicto);
    }
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
      v.innerHTML = '<b>' + (ok ? 'Las dimensiones cumplen' : 'Las dimensiones no cumplen') + '</b><span>σmax ' + Unidades.num(vp.serv.smax, 'presion') + ' de ' + Unidades.fmt(estado.suelo.qadm, 'presion') + ', σmin ' + Unidades.num(vp.serv.smin, 'presion') + (vp.serv.smin > 0 ? ', sin tensión' : ', hay tensión') + '</span>';
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
    document.body.classList.toggle('en-portada', nombre === 'portada');
    window.scrollTo(0, 0);
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
      '<li class="rc-tarjeta"><button type="button" class="reciente" data-id="' + p.id + '">' + miniatura(p.datos) +
      '<span class="rc-estado ' + p.estado + '">' + etq[p.estado] + '</span>' +
      '<span class="rc-nombre">' + Informe.esc(p.nombre || 'Proyecto sin nombre') + '</span>' +
      '<span class="rc-meta">' + Informe.esc(p.elemento || 'Sin elemento') + '</span>' +
      '<span class="rc-fecha">' + fechaRelativa(p.fecha) + '</span></button>' +
      '<button type="button" class="btn-icono rc-borrar" data-borrar="' + p.id + '" aria-label="Borrar ' + Informe.esc(p.nombre || 'proyecto') + '" title="Borrar">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12"/></svg></button></li>').join('');
  }

  // "hace 2 h", "ayer", "hace 3 días"…
  function fechaRelativa(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'ahora';
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const [n, u] = s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : s < 2592000 ? [s / 86400, 'day'] : [s / 2592000, 'month'];
    return rtf.format(-Math.round(n), u);
  }

  // Miniatura de la planta guardada (zapata y columna a escala)
  function miniatura(d) {
    if (d && d.tipo === 'combinada') {
      const C = Tipos.combinada, e = C.preparar(d);
      if (!C.faltantes(e).length) { try { return DibujoCombinada.miniatura(C.calcular(e)); } catch (ex) { /* sin miniatura */ } }
      return '<svg class="rc-mini" viewBox="0 0 48 48" aria-hidden="true"><path class="rc-vacio" d="M4 16h40v16H4z"/></svg>';
    }
    const z = d && d.zapata, c = d && d.columna;
    if (!z || !(z.Lx > 0) || !(z.Ly > 0)) return '<svg class="rc-mini" viewBox="0 0 48 48" aria-hidden="true"><path class="rc-vacio" d="M10 10h28v28H10z"/></svg>';
    const k = 36 / Math.max(z.Lx, z.Ly), w = z.Lx * k, h = z.Ly * k;
    const cw = (c && c.Cx > 0 ? c.Cx : 0) * k, ch = (c && c.Cy > 0 ? c.Cy : 0) * k;
    return '<svg class="rc-mini" viewBox="0 0 48 48" aria-hidden="true"><rect class="rc-zap" x="' + (24 - w / 2) + '" y="' + (24 - h / 2) + '" width="' + w + '" height="' + h + '"/>' +
      (cw ? '<rect class="rc-col" x="' + (24 - cw / 2) + '" y="' + (24 - ch / 2) + '" width="' + cw + '" height="' + ch + '"/>' : '') + '</svg>';
  }

  // Ola del titular: cada letra crece y se eleva según su distancia horizontal al cursor
  function olaTitular(x, y) {
    const h1 = $('#titulo-app'), r = h1.getBoundingClientRect();
    const cerca = x !== null && y > r.top - 80 && y < r.bottom + 40;
    const ancho = r.width * 0.09;
    $$('#titulo-app .letra').forEach((l) => {
      let f = 0;
      if (cerca && !Mov.reducido()) { const b = l.getBoundingClientRect(), d = (b.left + b.width / 2 - x) / ancho; f = Math.exp(-d * d); }
      l.style.setProperty('--f', f.toFixed(3));
    });
  }

  // Animación propia de cada opción antes de continuar
  function elegir(boton, clase, siguiente) {
    if (Mov.reducido()) { siguiente(); return; }
    boton.classList.remove(clase); void boton.offsetWidth; boton.classList.add(clase);
    setTimeout(() => { boton.classList.remove(clase); siguiente(); }, 950);
  }

  // El menú de tipos sirve para una zapata nueva o para cargar el ejemplo de cada tipo
  let modoTipos = 'nuevo';
  function abrirTipos(modo) {
    modoTipos = modo;
    const ej = modo === 'ejemplo';
    $('#tipos-eti').textContent = ej ? 'Paso 2 de 2 · Ejemplos del curso' : 'Paso 2 de 2 · Tipo de cimentación';
    $('#titulo-tipos').textContent = ej ? 'Elige un ejemplo' : 'Tipo de zapata';
    $('#tipos-sub').textContent = ej ? 'Carga el ejemplo del documento del curso para el tipo de zapata que quieras.' : 'Elige cómo llega la carga de la columna al suelo. Los demás tipos llegarán en próximas versiones.';
    mostrarPantalla('tipos');
  }

  function pintarTipos() {
    $('#tipos').innerHTML = CatalogoZapatas.map((t) =>
      '<button type="button" class="tipo-tarjeta' + (t.disponible ? '' : ' pronto') + '" data-tipo="' + t.id + '"' + (t.disponible ? '' : ' aria-disabled="true"') + '>' +
      '<svg class="tt-ico" viewBox="0 0 48 48" aria-hidden="true">' + t.ico + '</svg>' +
      '<span class="tt-nombre">' + t.nombre + '</span><span class="tt-desc">' + t.desc + '</span>' +
      (t.disponible ? '' : '<span class="mi-tag pronto">Próximamente</span>') + '</button>').join('');
  }

  async function reproducirIntro() {
    const intro = $('#intro');
    const a = ajustes();
    $('#bv-portada').hidden = true;
    document.body.classList.add('en-portada');
    intro.hidden = false;
    intro.classList.remove('sale');
    // Con "Según el sistema" y el sistema pidiendo menos movimiento: versión suave (sin vuelos de cámara)
    await Intro3D.reproducir(intro, { suave: a.anim === 'sistema' && Mov.reducido() });
    intro.classList.add('sale');
    mostrarPantalla('portada');
    $('#bv-portada').classList.add('desde-intro');
    setTimeout(() => { intro.hidden = true; intro.classList.remove('sale'); }, 600);
  }

  function abrirApp(conCarga) {
    document.body.classList.remove('en-bienvenida');
    $('#bienvenida').hidden = true;
    $('#app').hidden = false;
    enApp = true;
    if (!hay3d) hay3d = Vista3D.init($('#vista3d'));
    Object.values(movers).forEach((m) => m && m(true));
    aFormulario();
    encuadrado = false;
    mostrarPestana('veredicto');
    recalcular('inicio');
    if (R && conCarga) Cargando.mostrar('Abriendo proyecto', R).then(animarVeredicto);
    else if (R) animarVeredicto();
    Mov.revelar($$('.vistas .vista, #bloque-refuerzo, #bloque-memoria'));
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

  function cargarProyecto(datos, id, conCarga) {
    if (datos && datos.tipo === 'combinada') { Mesa.abrir(datos, id, conCarga); return; }
    estado = normalizar(datos);
    proyectoId = id || Proyectos.nuevoId();
    okPrevio = null;
    abrirApp(conCarga);
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
    const m = (x, mag) => Unidades.num(x == null ? 0 : x, mag); // valor convertido
    const u = (mag) => Unidades.u(mag);
    return [
      { grupo: 'Cargas de servicio', filas: [
        ['Carga axial muerta (PP+CM)', 'P_D', m(e.cargas.D.P, 'fuerza'), u('fuerza')], ['Momento muerto en X', 'M_{x,D}', m(e.cargas.D.Mx, 'momento'), u('momento')], ['Momento muerto en Y', 'M_{y,D}', m(e.cargas.D.My, 'momento'), u('momento')],
        ['Carga axial viva (CV)', 'P_L', m(e.cargas.L.P, 'fuerza'), u('fuerza')], ['Momento vivo en X', 'M_{x,L}', m(e.cargas.L.Mx, 'momento'), u('momento')], ['Momento vivo en Y', 'M_{y,L}', m(e.cargas.L.My, 'momento'), u('momento')]] },
      { grupo: 'Suelo', filas: [['Esfuerzo admisible', '\\sigma_{adm}', m(e.suelo.qadm, 'presion'), u('presion')], ['Profundidad de desplante', 'D_f', m(e.suelo.Df, 'longitud'), u('longitud')]]
        .concat(e.suelo.pesoPropio ? [['Peso unitario del suelo', '\\gamma_s', m(e.suelo.gs, 'peso'), u('peso')], ['Peso unitario del concreto', '\\gamma_c', m(e.suelo.gc, 'peso'), u('peso')]] : []) },
      { grupo: 'Columna', filas: [['Dimensión en X', 'C_x', m(e.columna.Cx, 'longitud'), u('longitud')], ['Dimensión en Y', 'C_y', m(e.columna.Cy, 'longitud'), u('longitud')],
        ['Barras longitudinales', 'n\\,\\#', e.columna.nBarras + ' #' + e.columna.barra, ''], ['Ubicación', '\\alpha_s', v(e.columna.alpha), '']] },
      { grupo: 'Materiales y factores', filas: [['Resistencia del concreto', "f'_c", m(e.materiales.fc, 'esfuerzo'), u('esfuerzo')], ['Fluencia del acero', 'f_y', m(e.materiales.fy, 'esfuerzo'), u('esfuerzo')],
        ['Factor de concreto liviano', '\\lambda', v(e.materiales.lambda), ''], ['Reducción a cortante', '\\phi_v', v(e.materiales.phiV), ''],
        ['Reducción a flexión', '\\phi_f', v(e.materiales.phiF), ''], ['Reducción a aplastamiento', '\\phi_b', v(e.materiales.phiB), '']] },
      { grupo: 'Zapata', filas: [['Dimensión en X', 'L_x', m(R.Lx, 'longitud'), u('longitud')], ['Dimensión en Y', 'L_y', m(R.Ly, 'longitud'), u('longitud')], ['Altura efectiva', 'd', Unidades.num(R.d, 'longitud', null, 3), u('longitud')],
        ['Recubrimiento', 'r', Unidades.num(R.r, 'longitud', null, 3), u('longitud')], ['Altura total', 'h', Unidades.num(R.h, 'longitud', null, 3), u('longitud')]] },
      { grupo: 'Refuerzo inferior', filas: [['Refuerzo', '', rd.etq, '']] },
    ];
  }

  function resumenTexto() {
    return 'Zapata de ' + Unidades.num(R.Lx, 'longitud') + ' × ' + Unidades.fmt(R.Ly, 'longitud') + ' y ' + Unidades.fmt(R.h, 'longitud') + ' de altura. Gobierna ' + R.ult.gob.id + ' con σu = ' + Unidades.fmt(R.ult.su, 'presion') + '; utilización máxima ' + f(R.utilMax * 100, 0) + ' %.';
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
  // Aviso flotante; con accion (texto y función) muestra un botón, por ejemplo "Deshacer"
  function avisar(txt, accion, alPulsar) {
    const a = $('#aviso');
    a.textContent = txt;
    a.classList.toggle('con-accion', !!accion);
    if (accion) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'aviso-accion'; b.textContent = accion;
      b.addEventListener('click', () => { a.classList.remove('ver'); alPulsar(); }, { once: true });
      a.appendChild(b);
    }
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), accion ? 6000 : 2800);
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
    // Diseñar: el botón se "imanta" hacia el cursor y al hacer clic se expande hasta llenar la pantalla
    const cta = $('#btn-disenar');
    $('#bv-portada').addEventListener('pointermove', (e) => {
      if (Mov.reducido() || e.pointerType !== 'mouse') return;
      const r = cta.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
      const f = d < 140 ? (1 - d / 140) * 0.3 : 0;
      cta.style.transform = 'translate(' + (dx * f).toFixed(1) + 'px,' + (dy * f).toFixed(1) + 'px)';
      Escultura.armar(d < 170); // el despiece se arma al acercarse a Diseñar
      olaTitular(e.clientX, e.clientY);
    });
    $('#bv-portada').addEventListener('pointerleave', () => { cta.style.transform = ''; Escultura.armar(false); olaTitular(null); });
    // En pantallas táctiles la ola recorre el titular sola de vez en cuando
    if (matchMedia('(hover: none)').matches) setInterval(() => {
      if (Mov.reducido() || $('#bv-portada').hidden) return;
      const r = $('#titulo-app').getBoundingClientRect(), t0 = performance.now();
      const paso = (t) => { const k = (t - t0) / 1400; if (k > 1) { olaTitular(null); return; } olaTitular(r.left + r.width * k, r.top + r.height / 2); requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }, 6000);
    cta.addEventListener('click', () => {
      cta.style.transform = '';
      if (Mov.reducido()) { mostrarPantalla('opciones'); return; }
      const r = cta.getBoundingClientRect();
      const capa = document.createElement('div');
      capa.className = 'bv-expande';
      const centro = (r.left + r.width / 2).toFixed(0) + 'px ' + (r.top + r.height / 2).toFixed(0) + 'px';
      document.body.appendChild(capa);
      const crece = capa.animate([{ clipPath: 'circle(0px at ' + centro + ')' }, { clipPath: 'circle(150vmax at ' + centro + ')' }],
        { duration: 520, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
      crece.onfinish = () => {
        mostrarPantalla('opciones');
        capa.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' }).onfinish = () => capa.remove();
      };
    });
    $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrarPantalla(b.dataset.ir)));
    $('#op-nueva').addEventListener('click', (e) => elegir(e.currentTarget, 'elige-nueva', () => abrirTipos('nuevo')));
    $('#op-importar').addEventListener('click', (e) => elegir(e.currentTarget, 'elige-importar', () => $('#archivo-importar').click()));
    $('#op-ejemplo').addEventListener('click', (e) => elegir(e.currentTarget, 'elige-ejemplo', () => abrirTipos('ejemplo')));
    $('#tipos').addEventListener('click', (e) => {
      const t = e.target.closest('.tipo-tarjeta');
      if (!t) return;
      if (t.classList.contains('pronto')) { avisar(t.querySelector('.tt-nombre').textContent + ' estará disponible en una próxima versión.'); return; }
      const M = Tipos[t.dataset.tipo];
      if (modoTipos === 'ejemplo') {
        cargarProyecto(M.clone(M.EJEMPLO));
        avisar(t.dataset.tipo === 'combinada' ? 'Ejemplo del documento cargado: dos columnas a 5.00 m.' : 'Ejemplo del documento cargado: 2.50 × 2.00 m con d = 0.475 m.');
        return;
      }
      cargarProyecto(M.clone(M.VACIO));
      if (t.dataset.tipo !== 'combinada') abrirAsistente(0, 'nuevo');
    });
    $('#lista-recientes').addEventListener('click', (e) => {
      const borrar = e.target.closest('[data-borrar]');
      if (borrar) {
        const entrada = Proyectos.obtener(borrar.dataset.borrar);
        const tarjeta = borrar.closest('.rc-tarjeta');
        const quitar = () => { Proyectos.borrar(entrada.id); pintarRecientes(); };
        if (tarjeta && tarjeta.animate && !Mov.reducido()) tarjeta.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 200, easing: 'ease-in' }).onfinish = quitar;
        else quitar();
        avisar('Proyecto borrado.', 'Deshacer', () => { Proyectos.restaurar(entrada); pintarRecientes(); });
        return;
      }
      const r = e.target.closest('.reciente');
      if (!r) return;
      const p = Proyectos.obtener(r.dataset.id);
      if (p) cargarProyecto(p.datos, p.id, true);
    });

    // --- dashboard
    $('#btn-inicio').addEventListener('click', volverAlInicio);
    $('#categorias').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      // Onda desde el punto del clic y rebote del botón; luego se abre el paso
      const r = b.getBoundingClientRect(), onda = document.createElement('span');
      onda.className = 'cat-onda';
      onda.style.left = ((e.clientX || r.left + r.width / 2) - r.left) + 'px';
      onda.style.top = ((e.clientY || r.top + r.height / 2) - r.top) + 'px';
      b.appendChild(onda);
      setTimeout(() => onda.remove(), 700);
      b.classList.remove('pulsado'); void b.offsetWidth; b.classList.add('pulsado');
      cerrarRiel();
      abrirAsistente(PASOS.findIndex((p) => p.id === b.dataset.cat), 'editar', b);
    });
    // Celular: el botón "Datos" abre el riel como hoja inferior
    function cerrarRiel() { $('#categorias').classList.remove('abierto'); $('#btn-datos').setAttribute('aria-expanded', 'false'); }
    $('#btn-datos').addEventListener('click', (e) => {
      e.stopPropagation();
      const abierto = $('#categorias').classList.toggle('abierto');
      $('#btn-datos').setAttribute('aria-expanded', String(abierto));
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#categorias, #btn-datos')) cerrarRiel(); });
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
    movers.pestanas = Mov.segmentado($('#pestanas'));
    movers.elegido = Mov.segmentado($('#elegido-dir'));
    $('#elegido-dir').addEventListener('click', (e) => {
      const b = e.target.closest('[data-dir]');
      if (!b || !R) return;
      dirElegida = b.dataset.dir;
      pintarElegido();
    });
    $('#pestanas').addEventListener('click', (e) => {
      const b = e.target.closest('[role="tab"]');
      if (b) mostrarPestana(b.dataset.tab);
    });
    $('#pestanas').addEventListener('keydown', (e) => {
      const tabs = $$('#pestanas [role="tab"]');
      const i = tabs.findIndex((b) => b.dataset.tab === pestana);
      const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (j === undefined) return;
      e.preventDefault();
      mostrarPestana(tabs[(j + tabs.length) % tabs.length].dataset.tab, true);
    });
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
      const b = e.target.closest('[data-paso]');
      if (!b || !R) return;
      fichaSel = b.dataset.paso;
      pintarFicha();
    });
    $('#ficha').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-paso]');
      if (!a) return;
      e.preventDefault();
      mostrarPestana('memoria');
      clearTimeout(tMemoria);
      pintarMemoria();
      Diapositivas.ir(a.dataset.paso);
    });

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
          if (!datos || typeof datos !== 'object' || !(datos.cargas || (datos.tipo === 'combinada' && datos.columnas))) throw new Error('formato');
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
      if (R && !document.body.classList.contains('con-informe')) construirInforme($('#inf-explica').checked);
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
      $$('input[name="aj-unid"]').forEach((r) => { r.checked = r.value === Unidades.actual(); });
      abrirDialogo($('#dlg-ajustes'));
    }));
    $('#dlg-ajustes').addEventListener('change', (e) => {
      const a = ajustes();
      if (e.target.name === 'aj-anim') { a.anim = e.target.value; Mov.configurar(a.anim); }
      if (e.target.id === 'aj-sin-intro') a.sinIntro = e.target.checked;
      if (e.target.name === 'aj-unid') cambiarUnidades(e.target.value);
      a.unid = Unidades.actual();
      guardarAjustes(a);
    });
    $('#dlg-ajustes form').addEventListener('submit', (e) => { e.preventDefault(); cerrarDialogo($('#dlg-ajustes')); });
    [$('#dlg-informe'), $('#doc-listo'), $('#dlg-ajustes')].forEach((dlg) => {
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); cerrarDialogo(dlg); });
      dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrarDialogo(dlg); });
    });
    $('#btn-tema').addEventListener('click', () => {
      const raiz = document.documentElement;
      const oscuro = raiz.dataset.theme !== 'light'; // oscuro por defecto
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
    Unidades.usar(a.unid);
    pintarUnidades();
    Notacion.observar(); // subíndices reales en todo lo que se pinte
    Proyectos.migrar();
    $('#bv-marca').innerHTML = Logo.svg('logo dibujar', 'ZapatAPP');
    $('#marca-logo').innerHTML = Logo.svg('logo');
    $('#pie-logo').innerHTML = Logo.svg('logo');
    // GitHub: el ícono gira con un aro que se expande y luego se abre el perfil
    $('.pie-github').addEventListener('click', (e) => {
      const a = e.currentTarget;
      e.preventDefault();
      a.classList.remove('gira'); void a.offsetWidth; a.classList.add('gira');
      setTimeout(() => window.open(a.href, '_blank', 'noopener'), Mov.reducido() ? 0 : 600);
    });
    llenarSelectBarras();
    Diapositivas.montar($('#memoria'));
    Elemento.montar($('#elegido-3d'));
    PlantaInteractiva.montar($('#planta'));
    PlantaInteractiva.montar($('#corte'));
    pintarTipos();
    enlazar();
    pintarCategorias(T.faltantes(estado));
    Escultura.montar($('#escultura'));
    if (a.sinIntro || a.anim === 'desactivadas' || typeof THREE === 'undefined') mostrarPantalla('portada');
    else reproducirIntro();
  }

  // Lo que la mesa de la combinada necesita de la app
  window.App = {
    volverAOpciones() {
      $('#app').hidden = true;
      $('#bienvenida').hidden = false;
      document.body.classList.add('en-bienvenida');
      mostrarPantalla('opciones');
    },
    avisar,
  };

  document.addEventListener('DOMContentLoaded', iniciar);
})();

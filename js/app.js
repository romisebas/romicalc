/* Interfaz: enlaza el formulario con el tipo de zapata activo, redibuja en vivo y guarda el trabajo. */
(function () {
  'use strict';

  const CLAVE = 'diseno-zapatas-v2';
  const CLAVE_V1 = 'zapata-momento-v1';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const f = (x, d = 2) => Number(x).toFixed(d);

  const tipoInicial = 'aislada-momento';
  let T = window.Tipos[tipoInicial];
  let estado = cargarLocal() || T.clone(T.EJEMPLO);
  let R = null;
  let capa = 'presion';
  let vista2 = '3d';
  let hay3d = false;
  let okPrevio = null;
  const movers = {};
  const abiertos = new Set(['serv']);

  // ------------------------------------------------------------ estado y almacenamiento
  function leer(path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), estado); }
  function escribir(path, val) {
    const ks = path.split('.');
    let o = estado;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function cargarLocal() {
    try {
      const t = localStorage.getItem(CLAVE) || localStorage.getItem(CLAVE_V1);
      return t ? normalizar(JSON.parse(t)) : null;
    } catch (e) { return null; }
  }
  function guardarLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* almacenamiento no disponible */ }
  }
  // Completa campos faltantes con los del ejemplo (archivos de la v1 o incompletos).
  function normalizar(obj) {
    const base = T.clone(T.EJEMPLO);
    (function mezclar(b, o) {
      Object.keys(b).forEach((k) => {
        if (o == null || !(k in o)) return;
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) mezclar(b[k], o[k]);
        else b[k] = o[k];
      });
    })(base, obj);
    if (!base.acero.tipo) base.acero.tipo = 'barras';
    return base;
  }

  // ------------------------------------------------------------ formulario
  function llenarSelectBarras() {
    $('#sel-barra-col').innerHTML = Object.keys(Refuerzo.BARS).map((n) =>
      '<option value="' + n + '">#' + n + ' (' + Refuerzo.BARS[n].db + ' mm)</option>').join('');
  }

  function aFormulario() {
    $$('[data-k]').forEach((el) => {
      const v = leer(el.dataset.k);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
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
    else {
      val = tipo === 'int' ? parseInt(el.value, 10) : parseFloat(el.value);
      if (!isFinite(val)) { el.classList.add('invalido'); el.setAttribute('aria-invalid', 'true'); return; }
    }
    el.classList.remove('invalido');
    el.removeAttribute('aria-invalid');
    escribir(el.dataset.k, val);
    if (el.dataset.k === 'suelo.pesoPropio') $('#campos-peso').classList.toggle('apagado', !val);
    recalcular('usuario');
  }

  // ------------------------------------------------------------ cálculo y render
  let temporizadorMemoria = 0;
  function recalcular(origen) {
    guardarLocal();
    const err = T.validarEntrada(estado);
    if (err) { mostrarError(err); return; }
    try {
      R = T.calcular(estado);
    } catch (ex) {
      mostrarError('No se pudo calcular: ' + ex.message);
      return;
    }
    const animar = origen === 'programa';
    $('#valor-h').textContent = f(R.h, 3);
    pintarResumen(animar);
    pintarPlanta();
    pintarVista2();
    pintarRefuerzo();
    // La memoria es lo más costoso: al escribir se espera una pausa breve.
    // En cambios programáticos se espera a que arranquen las animaciones del resumen.
    clearTimeout(temporizadorMemoria);
    if (origen === 'inicio') pintarMemoria();
    else temporizadorMemoria = setTimeout(pintarMemoria, origen === 'usuario' ? 120 : 60);
  }

  function mostrarError(msg) {
    const v = $('#veredicto');
    v.className = 'veredicto mal';
    $('#v-tit').textContent = 'Revise los datos';
    $('#v-det').textContent = msg;
    $('#chequeos').innerHTML = '';
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
        '<span class="ch-tit">' + c.titulo + '</span>' +
        '<span class="ch-det">' + c.det + '</span>' +
        '<span class="ch-util ' + cls + '" title="Demanda / capacidad"><span class="ch-barra" style="width:' + ancho + '%"></span><span class="num">' + f(c.util * 100, 0) + '%</span></span>' +
        '<span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'Cumple' : 'No cumple') + '</span></a></li>';
    }).join('');
  }

  function pintarPlanta() {
    const el = $('#planta');
    el.innerHTML = Dibujo.planta(R, capa);
  }

  function pintarVista2() {
    $('#vista3d').hidden = vista2 !== '3d';
    $('#corte').hidden = vista2 === '3d';
    $('#titulo-vista2').textContent = vista2 === '3d' ? 'Vista 3D' : 'Corte ' + vista2;
    if (vista2 !== '3d') $('#corte').innerHTML = Dibujo.corte(R, vista2);
    // La escena 3D solo se reconstruye cuando está visible (o antes de imprimir)
    if (hay3d && (vista2 === '3d' || document.body.classList.contains('imprimiendo'))) Vista3D.update(R);
  }

  // ------------------------------------------------------------ refuerzo
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
      '<td class="num">' + o.dL + ' / ' + o.dT + '</td>' +
      '<td class="num">' + o.sL + ' / ' + o.sT + '</td>' +
      '<td class="num">' + f(o.provX) + '</td><td class="num">' + f(o.provY) + '</td>' +
      '<td class="num">' + o.capas + '</td>' +
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

  // ------------------------------------------------------------ memoria
  let secciones = [];
  function pintarMemoria() {
    if (!R) return;
    const imprimiendo = document.body.classList.contains('imprimiendo');
    secciones = MemoriaAisladaMomento.generar(R);
    $('#memoria').innerHTML = Memoria.aHtml(secciones, imprimiendo ? null : abiertos);
  }
  function abrirPaso(d) {
    Memoria.completar(d, secciones);
    d.open = true;
    abiertos.add(d.id.replace('paso-', ''));
  }

  // ------------------------------------------------------------ validación
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

  // ------------------------------------------------------------ tabla pegada de SAP2000 / ETABS
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

  // ------------------------------------------------------------ aviso flotante
  let tAviso = 0;
  function avisar(txt) {
    const a = $('#aviso');
    a.textContent = txt;
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), 2800);
  }

  // ------------------------------------------------------------ menú de tipos de zapata
  function construirMenuTipos() {
    $('#menu-tipo').innerHTML = CatalogoZapatas.map((t) =>
      '<button type="button" role="menuitem" class="menu-item' + (t.id === T.id ? ' actual' : '') + '" data-tipo="' + t.id + '"' + (t.disponible ? '' : ' data-pronto="1"') + '>' +
      '<span class="mi-nombre">' + t.nombre + '</span><span class="mi-desc">' + t.desc + '</span>' +
      (t.disponible ? (t.id === T.id ? '<span class="mi-tag">Activo</span>' : '') : '<span class="mi-tag pronto">Próximamente</span>') +
      '</button>').join('');
  }
  function abrirMenu(abrir) {
    const m = $('#menu-tipo'), b = $('#btn-tipo');
    b.setAttribute('aria-expanded', String(abrir));
    if (abrir) {
      m.hidden = false;
      requestAnimationFrame(() => m.classList.add('abierto'));
      const primero = m.querySelector('.menu-item');
      if (primero) primero.focus();
    } else {
      m.classList.remove('abierto');
      setTimeout(() => { if (!m.classList.contains('abierto')) m.hidden = true; }, 160);
    }
  }

  // ------------------------------------------------------------ impresión
  function prepararImpresion() {
    document.body.classList.add('imprimiendo');
    clearTimeout(temporizadorMemoria);
    pintarMemoria();
    const p = estado.proyecto, e = estado;
    if (hay3d) Vista3D.update(R);
    const img = hay3d ? Vista3D.snapshot() : null;
    const rd = Dibujo.refuerzoDibujo(R);
    const datos = [
      ['Proyecto', (p.nombre || 'Sin nombre') + (p.elemento ? ', ' + p.elemento : '')],
      ['Tipo de zapata', T.nombre],
      ['Cargas PP+CM', 'P ' + e.cargas.D.P + ' tonf, Mx ' + e.cargas.D.Mx + ' y My ' + e.cargas.D.My + ' tonf·m'],
      ['Cargas CV', 'P ' + e.cargas.L.P + ' tonf, Mx ' + e.cargas.L.Mx + ' y My ' + e.cargas.L.My + ' tonf·m'],
      ['Suelo', 'σadm ' + e.suelo.qadm + ' tonf/m², Df ' + e.suelo.Df + ' m' + (e.suelo.pesoPropio ? ', incluye peso propio' : '')],
      ['Columna', e.columna.Cx + ' × ' + e.columna.Cy + ' m, ' + e.columna.nBarras + ' #' + e.columna.barra + ', αs ' + e.columna.alpha],
      ['Materiales', "f'c " + e.materiales.fc + ' y fy ' + e.materiales.fy + ' kgf/cm², λ ' + e.materiales.lambda + ', φv ' + e.materiales.phiV + ', φf ' + e.materiales.phiF + ', φb ' + e.materiales.phiB],
      ['Zapata', f(R.Lx) + ' × ' + f(R.Ly) + ' m, d ' + f(R.d, 3) + ' m, h ' + f(R.h, 3) + ' m, r ' + f(R.r, 3) + ' m'],
      ['Refuerzo inferior', rd.etq],
    ];
    $('#print-extra').innerHTML =
      '<h2>Datos de entrada</h2><table class="tabla-datos">' + datos.map((d) => '<tr><th>' + d[0] + '</th><td>' + d[1] + '</td></tr>').join('') + '</table>' +
      '<h2>Planos</h2><div class="print-figs">' +
      '<figure>' + Dibujo.planta(R, 'presion', 'imp') + '<figcaption>Planta: presiones de servicio</figcaption></figure>' +
      '<figure>' + Dibujo.planta(R, 'acero', 'imp') + '<figcaption>Planta: refuerzo</figcaption></figure>' +
      '<figure>' + Dibujo.corte(R, 'X', 'imp') + '<figcaption>Corte X</figcaption></figure>' +
      '<figure>' + Dibujo.corte(R, 'Y', 'imp') + '<figcaption>Corte Y</figcaption></figure>' +
      (img ? '<figure><img src="' + img + '" alt="Vista 3D de la zapata"><figcaption>Vista 3D</figcaption></figure>' : '') +
      '</div>';
  }
  function terminarImpresion() {
    document.body.classList.remove('imprimiendo');
    pintarMemoria();
  }

  // ------------------------------------------------------------ eventos
  function seleccionarEn(contSel, attr, valor) {
    $$(contSel + ' button').forEach((x) => x.setAttribute('aria-selected', String(x.dataset[attr] === valor)));
  }

  function enlazar() {
    const panel = $('.panel-datos');
    panel.addEventListener('input', alCambiar);
    panel.addEventListener('change', alCambiar);

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
      estado.acero.malla = null; // vuelve a elegir la malla más liviana que cumpla
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
      clearTimeout(temporizadorMemoria);
      pintarMemoria();
      const d = document.getElementById('paso-' + a.dataset.paso);
      if (!d) return;
      abrirPaso(d);
      Mov.desplazarA(d);
    });

    // Recordar qué pasos están abiertos entre recálculos
    $('#memoria').addEventListener('toggle', (e) => {
      const d = e.target;
      if (!d.id || !d.id.startsWith('paso-')) return;
      const id = d.id.replace('paso-', '');
      if (d.open) Memoria.completar(d, secciones); // apertura nativa (movimiento reducido)
      if (d.open && d.dataset.cerrando !== '1') abiertos.add(id); else if (!d.open) abiertos.delete(id);
    }, true);
    Mov.detallesSuaves($('#memoria'), (d) => Memoria.completar(d, secciones));
    Mov.detallesSuaves($('#validacion').parentElement);
    $('#chk-explica').addEventListener('change', (e) => document.body.classList.toggle('sin-explica', !e.target.checked));
    $('#btn-abrir').addEventListener('click', () => $$('#memoria details.paso').forEach(abrirPaso));
    $('#btn-cerrar').addEventListener('click', () => { $$('#memoria details.paso').forEach((d) => { d.open = false; }); abiertos.clear(); });

    $('#btn-ejemplo').addEventListener('click', () => {
      estado = T.clone(T.EJEMPLO);
      aFormulario();
      recalcular('programa');
      if (hay3d) Vista3D.encuadrar(R, true);
      avisar('Ejemplo del documento cargado: 2.50 × 2.00 m con d = 0.475 m.');
    });

    $('#btn-opt-planta').addEventListener('click', () => {
      const r = T.optimizarPlanta(estado);
      if (!r) { $('#msg-opt').textContent = 'Ninguna planta de hasta 10 × 10 m cumple. Revise las cargas o σadm.'; return; }
      estado.zapata.Lx = r.Lx; estado.zapata.Ly = r.Ly;
      aFormulario(); recalcular('programa');
      if (hay3d) Vista3D.encuadrar(R, true);
      $('#msg-opt').textContent = 'Planta mínima sin tensión y con σmax ≤ σadm: ' + f(r.Lx) + ' × ' + f(r.Ly) + ' m (' + f(r.A) + ' m²).';
    });
    $('#btn-opt-d').addEventListener('click', () => {
      const d = T.optimizarPeralte(estado);
      if (d == null) { $('#msg-opt').textContent = 'Ningún d de hasta 2.0 m cumple todos los chequeos. Revise la planta.'; return; }
      estado.zapata.d = d;
      aFormulario(); recalcular('programa');
      $('#msg-opt').textContent = 'd mínimo que cumple cortante, flexión, aplastamiento y ldc: ' + f(d, 3) + ' m (h = ' + f(d + estado.zapata.r, 3) + ' m).';
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

    $('#btn-exportar').addEventListener('click', () => {
      const nombre = (estado.proyecto.elemento || estado.proyecto.nombre || 'zapata').replace(/[^\w\-áéíóúñ ]+/gi, '').trim().replace(/\s+/g, '_') || 'zapata';
      const blob = new Blob([JSON.stringify(Object.assign({ tipo: T.id }, estado), null, 2)], { type: 'application/json' });
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
          estado = normalizar(JSON.parse(lector.result));
          aFormulario(); recalcular('programa');
          if (hay3d) Vista3D.encuadrar(R, true);
          avisar('Importado: ' + file.name);
        } catch (ex) {
          avisar('El archivo no es un .json válido de esta aplicación.');
        }
        e.target.value = '';
      };
      lector.readAsText(file);
    });

    $('#btn-imprimir').addEventListener('click', () => window.print());
    window.addEventListener('beforeprint', prepararImpresion);
    window.addEventListener('afterprint', terminarImpresion);

    $('#btn-tema').addEventListener('click', () => {
      const raiz = document.documentElement;
      const oscuro = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.classList.add('cambiando-tema');
      raiz.dataset.theme = oscuro ? 'light' : 'dark';
      setTimeout(() => raiz.classList.remove('cambiando-tema'), 320);
      try { localStorage.setItem(CLAVE + '-tema', raiz.dataset.theme); } catch (err) { /* sin almacenamiento */ }
    });

    // Menú de tipos de zapata
    $('#btn-tipo').addEventListener('click', () => abrirMenu($('#btn-tipo').getAttribute('aria-expanded') !== 'true'));
    $('#menu-tipo').addEventListener('click', (e) => {
      const it = e.target.closest('.menu-item');
      if (!it) return;
      abrirMenu(false);
      $('#btn-tipo').focus();
      if (it.dataset.pronto) avisar(it.querySelector('.mi-nombre').textContent + ' estará disponible en una próxima versión.');
    });
    $('#menu-tipo').addEventListener('keydown', (e) => {
      const items = $$('#menu-tipo .menu-item');
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#btn-tipo').getAttribute('aria-expanded') === 'true') { abrirMenu(false); $('#btn-tipo').focus(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.menu-tipo') && $('#btn-tipo').getAttribute('aria-expanded') === 'true') abrirMenu(false); });

    // Borde del encabezado solo cuando hay contenido pasando por debajo
    const barra = $('#barra-sup');
    const alScroll = () => barra.classList.toggle('con-borde', window.scrollY > 4);
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
  }

  function iniciar() {
    try {
      const t = localStorage.getItem(CLAVE + '-tema');
      if (t) document.documentElement.dataset.theme = t;
    } catch (e) { /* sin almacenamiento */ }
    llenarSelectBarras();
    construirMenuTipos();
    aFormulario();
    hay3d = Vista3D.init($('#vista3d'));
    enlazar();
    recalcular('inicio');
    pintarValidacion();
    Mov.revelar($$('.vistas .vista, #bloque-refuerzo, #bloque-memoria, .bloque.no-print, .pie'));
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();

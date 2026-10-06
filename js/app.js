/* Interfaz: enlaza el formulario con el motor, redibuja en vivo y guarda el trabajo. */
(function () {
  'use strict';

  const Z = window.Zapata;
  const CLAVE = 'zapata-momento-v1';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  let estado = cargarLocal() || Z.clone(Z.EJEMPLO);
  let R = null;
  let capa = 'presion';
  let vista2 = '3d';
  let hay3d = false;

  // ------------------------------------------------------------ utilidades
  function leer(path) { return path.split('.').reduce((a, k) => (a == null ? a : a[k]), estado); }
  function escribir(path, val) {
    const ks = path.split('.');
    let o = estado;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function cargarLocal() {
    try {
      const t = localStorage.getItem(CLAVE);
      return t ? normalizar(JSON.parse(t)) : null;
    } catch (e) { return null; }
  }
  function guardarLocal() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* almacenamiento no disponible */ }
  }
  // Completa campos faltantes con los del ejemplo (archivos de versiones previas o incompletos).
  function normalizar(obj) {
    const base = Z.clone(Z.EJEMPLO);
    (function mezclar(b, o) {
      Object.keys(b).forEach((k) => {
        if (o == null || !(k in o)) return;
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) mezclar(b[k], o[k]);
        else b[k] = o[k];
      });
    })(base, obj);
    return base;
  }
  const f = (x, d = 2) => Number(x).toFixed(d);

  // ------------------------------------------------------------ formulario
  function llenarSelectBarras() {
    const sel = $('#sel-barra-col');
    sel.innerHTML = Object.keys(Z.BARS).map((n) => '<option value="' + n + '">#' + n + ' · ' + Z.BARS[n].db + ' mm</option>').join('');
  }

  function aFormulario() {
    $$('[data-k]').forEach((el) => {
      const v = leer(el.dataset.k);
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
    });
    $('#campos-peso').classList.toggle('apagado', !estado.suelo.pesoPropio);
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
      if (!isFinite(val)) { el.classList.add('invalido'); return; }
    }
    el.classList.remove('invalido');
    escribir(el.dataset.k, val);
    if (el.dataset.k === 'suelo.pesoPropio') $('#campos-peso').classList.toggle('apagado', !val);
    recalcular();
  }

  function entradaValida() {
    const e = estado;
    const pos = [e.zapata.Lx, e.zapata.Ly, e.zapata.d, e.columna.Cx, e.columna.Cy, e.materiales.fc, e.materiales.fy, e.suelo.qadm, e.materiales.lambda];
    if (pos.some((x) => !(x > 0))) return 'Las dimensiones, materiales y σadm deben ser mayores que cero.';
    if (e.columna.Cx >= e.zapata.Lx || e.columna.Cy >= e.zapata.Ly) return 'La columna no cabe en la zapata: aumente Lx o Ly.';
    if (e.zapata.r < 0 || e.zapata.r * 2 >= Math.min(e.zapata.Lx, e.zapata.Ly)) return 'Revise el recubrimiento.';
    if (!(Math.abs(e.cargas.D.P) + Math.abs(e.cargas.L.P) > 0)) return 'Ingrese la carga axial de servicio.';
    return null;
  }

  // ------------------------------------------------------------ cálculo y render
  function recalcular() {
    guardarLocal();
    const err = entradaValida();
    if (err) { mostrarError(err); return; }
    try {
      R = Z.calcular(estado);
    } catch (ex) {
      mostrarError('No se pudo calcular: ' + ex.message);
      return;
    }
    $('#valor-h').textContent = f(R.h, 3);
    pintarEstado();
    pintarPlanta();
    pintarVista2();
    pintarAcero();
    $('#memoria').innerHTML = Memoria.aHtml(Memoria.generar(R), document.body.classList.contains('imprimiendo'));
    restaurarAbiertos();
  }

  function mostrarError(msg) {
    $('#veredicto').className = 'veredicto mal';
    $('#veredicto').innerHTML = '<span class="v-tit">Datos incompletos</span><span class="v-det">' + msg + '</span>';
    $('#chequeos').innerHTML = '';
  }

  function pintarEstado() {
    const ok = R.todoOk;
    const s = R.serv;
    $('#veredicto').className = 'veredicto ' + (ok ? 'ok' : 'mal');
    $('#veredicto').innerHTML =
      '<span class="v-tit">' + (ok ? 'El diseño cumple' : 'El diseño no cumple') + '</span>' +
      '<span class="v-det">Zapata ' + f(R.Lx) + ' × ' + f(R.Ly) + ' × ' + f(R.h) + ' m · ' +
      'Gobierna ' + R.ult.gob.id + ' · σu = ' + f(R.ult.su) + ' tonf/m² · caso ' + s.caso + '</span>';
    $('#chequeos').innerHTML = R.chequeos.map((c, i) =>
      '<li><a href="#paso-' + c.id + '" class="chip ' + (c.ok ? 'ok' : 'mal') + '" data-paso="' + c.id + '">' +
      '<span class="chip-n">' + (i + 1) + '</span><span class="chip-t">' + c.titulo + '</span>' +
      '<span class="chip-d">' + c.det + '</span><span class="tag ' + (c.ok ? 'tag-ok' : 'tag-mal') + '">' + (c.ok ? 'OK' : 'MAL') + '</span></a></li>').join('');
  }

  function pintarPlanta() { $('#planta').innerHTML = Dibujo.planta(R, capa); }

  function pintarVista2() {
    const es3d = vista2 === '3d' && hay3d;
    $('#vista3d').hidden = vista2 !== '3d';
    $('#corte').hidden = vista2 === '3d';
    $('#titulo-vista2').textContent = vista2 === '3d' ? 'Vista 3D' : 'Corte ' + vista2;
    if (vista2 !== '3d') $('#corte').innerHTML = Dibujo.corte(R, vista2);
    if (hay3d) Vista3D.update(R);
    if (es3d) window.dispatchEvent(new Event('resize'));
  }

  function tablaAcero(dir, ops, sel, req, b) {
    const filas = ops.map((o) =>
      '<tr class="est-' + o.estado + (o.barra === sel ? ' sel' : '') + '">' +
      '<td><label class="radio"><input type="radio" name="bar' + dir + '" value="' + o.barra + '"' + (o.barra === sel ? ' checked' : '') + '> #' + o.barra + '</label></td>' +
      '<td class="num">' + o.n + '</td><td class="num">' + f(o.s) + '</td><td class="num">' + f(o.AsProv) + '</td>' +
      '<td class="num">' + f(o.ratio * 100, 0) + '%</td>' +
      '<td><span class="punto est-' + o.estado + '" title="' + o.motivo + '"></span><span class="motivo">' + o.motivo + (o.gobiernaSmax && o.estado !== 'mal' ? ' · por smax' : '') + '</span></td></tr>').join('');
    return '<h3>Barras paralelas a ' + dir + ' <small>As req = ' + f(req) + ' cm² · repartidas en ' + f(b) + ' m</small></h3>' +
      '<div class="tabla-scroll"><table class="tabla-acero"><thead><tr><th>Barra</th><th>n</th><th>s (m)</th><th>As prov (cm²)</th><th>Prov/req</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  }

  function pintarAcero() {
    $('#acero-x').innerHTML = tablaAcero('X', R.acero.opsX, R.acero.barX, R.fx.As, R.Ly);
    $('#acero-y').innerHTML = tablaAcero('Y', R.acero.opsY, R.acero.barY, R.fy.As, R.Lx);
  }

  // Mantiene abiertos los pasos que el usuario desplegó entre recálculos.
  const abiertos = new Set(['serv']);
  function restaurarAbiertos() {
    $$('#memoria details').forEach((d) => {
      const id = d.id.replace('paso-', '');
      d.open = abiertos.has(id) || document.body.classList.contains('imprimiendo');
      d.addEventListener('toggle', () => { if (d.open) abiertos.add(id); else abiertos.delete(id); });
    });
  }

  // ------------------------------------------------------------ validación
  function pintarValidacion() {
    const res = Z.validarContraPdf();
    const okTodos = res.every((r) => r.ok);
    $('#tag-validacion').className = 'tag ' + (okTodos ? 'tag-ok' : 'tag-mal');
    $('#tag-validacion').textContent = res.filter((r) => r.ok).length + '/' + res.length;
    $('#tabla-validacion').innerHTML = res.map((r) =>
      '<tr><td>' + r.lbl + '</td><td class="num">' + r.v + ' <span class="u">' + r.u + '</span></td><td class="num">' + f(r.calc, 3) + '</td>' +
      '<td class="num">' + f(r.err * 100, 2) + ' %</td><td><span class="tag ' + (r.ok ? 'tag-ok' : 'tag-mal') + '">' + (r.ok ? 'OK' : 'REVISAR') + '</span></td></tr>').join('');
  }

  // ------------------------------------------------------------ pegar tabla SAP2000
  function interpretarSap(texto) {
    const res = {};
    texto.split(/\r?\n/).forEach((linea) => {
      if (!linea.trim()) return;
      const partes = linea.split(/[\s;]+/).map((s) => s.trim()).filter(Boolean);
      const esNum = (p) => /^-?\d+([.,]\d+)?(e-?\d+)?$/i.test(p.replace(/\s/g, ''));
      const unido = partes.filter((p) => !esNum(p)).join(' ').toUpperCase();
      const nums = partes.filter(esNum).map((p) => parseFloat(p.replace(/\s/g, '').replace(',', '.')));
      if (nums.length < 6) return;
      const [Fx, Fy, Fz, Mx, My] = nums.slice(-6);
      let tipo = null;
      if (/\b1[.,]\d/.test(unido)) tipo = null; // combinación mayorada: se ignora
      else if (/PP\s*\+\s*CM|\bDEAD\b|\bCM\b|\bD\b/.test(unido)) tipo = 'D';
      else if (/\bCV\b|\bLIVE\b|\bL\b/.test(unido)) tipo = 'L';
      if (tipo && !res[tipo]) res[tipo] = { P: Math.abs(Fz), Mx: Math.abs(Mx), My: Math.abs(My), Fx, Fy };
    });
    return res;
  }

  // ------------------------------------------------------------ impresión
  function prepararImpresion() {
    document.body.classList.add('imprimiendo');
    $$('#memoria details').forEach((d) => { d.open = true; });
    const p = estado.proyecto;
    const img = hay3d ? Vista3D.snapshot() : null;
    const datos = [
      ['Proyecto', (p.nombre || '—') + (p.elemento ? ' · ' + p.elemento : '')],
      ['Cargas PP+CM', 'P ' + estado.cargas.D.P + ' tonf · Mx ' + estado.cargas.D.Mx + ' · My ' + estado.cargas.D.My + ' tonf·m'],
      ['Cargas CV', 'P ' + estado.cargas.L.P + ' tonf · Mx ' + estado.cargas.L.Mx + ' · My ' + estado.cargas.L.My + ' tonf·m'],
      ['Suelo', 'σadm ' + estado.suelo.qadm + ' tonf/m² · Df ' + estado.suelo.Df + ' m' + (estado.suelo.pesoPropio ? ' · incluye peso propio' : '')],
      ['Columna', estado.columna.Cx + ' × ' + estado.columna.Cy + ' m · ' + estado.columna.nBarras + ' #' + estado.columna.barra + ' · αs ' + estado.columna.alpha],
      ['Materiales', "f'c " + estado.materiales.fc + ' · fy ' + estado.materiales.fy + ' kgf/cm² · λ ' + estado.materiales.lambda + ' · φv ' + estado.materiales.phiV + ' · φf ' + estado.materiales.phiF + ' · φb ' + estado.materiales.phiB],
      ['Zapata', f(R.Lx) + ' × ' + f(R.Ly) + ' m · d ' + f(R.d, 3) + ' · h ' + f(R.h, 3) + ' m · r ' + f(R.r, 3) + ' m'],
      ['Acero', R.acero.selX.n + ' #' + R.acero.selX.barra + ' @ ' + f(R.acero.selX.s) + ' en X · ' + R.acero.selY.n + ' #' + R.acero.selY.barra + ' @ ' + f(R.acero.selY.s) + ' en Y'],
    ];
    $('#print-extra').innerHTML =
      '<h2>Datos de entrada</h2><table class="memoria datos">' + datos.map((d) => '<tr><th>' + d[0] + '</th><td>' + d[1] + '</td></tr>').join('') + '</table>' +
      '<h2>Planos</h2><div class="print-figs">' +
      '<figure>' + Dibujo.planta(R, 'presion') + '<figcaption>Planta: presiones de servicio</figcaption></figure>' +
      '<figure>' + Dibujo.planta(R, 'acero') + '<figcaption>Planta: refuerzo</figcaption></figure>' +
      '<figure>' + Dibujo.corte(R, 'X') + '<figcaption>Corte X</figcaption></figure>' +
      '<figure>' + Dibujo.corte(R, 'Y') + '<figcaption>Corte Y</figcaption></figure>' +
      (img ? '<figure><img src="' + img + '" alt="Vista 3D"><figcaption>Vista 3D</figcaption></figure>' : '') +
      '</div>';
  }
  function terminarImpresion() {
    document.body.classList.remove('imprimiendo');
    restaurarAbiertos();
  }

  // ------------------------------------------------------------ eventos
  function enlazar() {
    document.querySelector('.panel-datos').addEventListener('input', alCambiar);
    document.querySelector('.panel-datos').addEventListener('change', alCambiar);

    $('#capas').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-capa]');
      if (!b) return;
      capa = b.dataset.capa;
      $$('#capas button').forEach((x) => x.setAttribute('aria-selected', x === b));
      pintarPlanta();
    });
    $('#vistas2').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-vista]');
      if (!b) return;
      vista2 = b.dataset.vista;
      $$('#vistas2 button').forEach((x) => x.setAttribute('aria-selected', x === b));
      pintarVista2();
    });
    $('#btn-encuadrar').addEventListener('click', () => Vista3D.encuadrar(R));

    document.querySelector('.aceros').addEventListener('change', (e) => {
      if (e.target.name === 'barX') estado.acero.barX = parseInt(e.target.value, 10);
      if (e.target.name === 'barY') estado.acero.barY = parseInt(e.target.value, 10);
      recalcular();
    });

    $('#chequeos').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-paso]');
      if (!a) return;
      const d = document.getElementById('paso-' + a.dataset.paso);
      if (d) { d.open = true; abiertos.add(a.dataset.paso); }
    });

    $('#btn-ejemplo').addEventListener('click', () => {
      estado = Z.clone(Z.EJEMPLO);
      aFormulario();
      recalcular();
      $('#validacion').open = true;
      $('#msg-opt').textContent = 'Ejemplo cargado: 2.50 × 2.00 m, d = 0.475 m (dimensiones del documento).';
    });

    $('#btn-opt-planta').addEventListener('click', () => {
      const r = Z.optimizarPlanta(estado);
      if (!r) { $('#msg-opt').textContent = 'No se encontró una planta de hasta 10 × 10 m que cumpla. Revise las cargas o σadm.'; return; }
      estado.zapata.Lx = r.Lx; estado.zapata.Ly = r.Ly;
      aFormulario(); recalcular();
      $('#msg-opt').textContent = 'Planta mínima que cumple σmax ≤ σadm sin tensión: ' + f(r.Lx) + ' × ' + f(r.Ly) + ' m (' + f(r.A) + ' m²).';
    });
    $('#btn-opt-d').addEventListener('click', () => {
      const d = Z.optimizarPeralte(estado);
      if (d == null) { $('#msg-opt').textContent = 'Ningún d hasta 2.0 m cumple todos los chequeos. Revise la planta.'; return; }
      estado.zapata.d = d;
      aFormulario(); recalcular();
      $('#msg-opt').textContent = 'd mínimo que cumple cortante, flexión, aplastamiento y ldc: ' + f(d, 3) + ' m (h = ' + f(d + estado.zapata.r, 3) + ' m).';
    });

    $('#btn-interpretar').addEventListener('click', () => {
      const r = interpretarSap($('#texto-sap').value);
      const msg = $('#msg-sap');
      if (!r.D && !r.L) { msg.textContent = 'No se encontraron filas de CV ni PP+CM. Copie la tabla con sus columnas Fx…Mz.'; msg.className = 'msg mal'; return; }
      if (r.D) Object.assign(estado.cargas.D, { P: r.D.P, Mx: r.D.Mx, My: r.D.My });
      if (r.L) Object.assign(estado.cargas.L, { P: r.L.P, Mx: r.L.Mx, My: r.L.My });
      aFormulario(); recalcular();
      msg.className = 'msg ok';
      msg.textContent = 'Leído: ' + (r.D ? 'PP+CM (P ' + r.D.P + ')' : '') + (r.D && r.L ? ' y ' : '') + (r.L ? 'CV (P ' + r.L.P + ')' : '') + (!r.D || !r.L ? '. Falta una de las dos filas.' : '.');
    });

    $('#btn-exportar').addEventListener('click', () => {
      const nombre = (estado.proyecto.elemento || estado.proyecto.nombre || 'zapata').replace(/[^\w\-áéíóúñ ]+/gi, '').trim().replace(/\s+/g, '_') || 'zapata';
      const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    $('#archivo-importar').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const lector = new FileReader();
      lector.onload = () => {
        try {
          estado = normalizar(JSON.parse(lector.result));
          aFormulario(); recalcular();
          $('#msg-opt').textContent = 'Importado: ' + file.name;
        } catch (ex) {
          $('#msg-opt').textContent = 'El archivo no es un .json válido de esta aplicación.';
        }
        e.target.value = '';
      };
      lector.readAsText(file);
    });

    $('#btn-imprimir').addEventListener('click', () => window.print());
    window.addEventListener('beforeprint', prepararImpresion);
    window.addEventListener('afterprint', terminarImpresion);

    $('#btn-abrir').addEventListener('click', () => $$('#memoria details').forEach((d) => { d.open = true; }));
    $('#btn-cerrar').addEventListener('click', () => $$('#memoria details').forEach((d) => { d.open = false; }));

    $('#btn-tema').addEventListener('click', () => {
      const raiz = document.documentElement;
      const oscuroAhora = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.dataset.theme = oscuroAhora ? 'light' : 'dark';
      try { localStorage.setItem(CLAVE + '-tema', raiz.dataset.theme); } catch (e) { /* sin almacenamiento */ }
      pintarPlanta();
    });
  }

  function iniciar() {
    try {
      const t = localStorage.getItem(CLAVE + '-tema');
      if (t) document.documentElement.dataset.theme = t;
    } catch (e) { /* sin almacenamiento */ }
    llenarSelectBarras();
    aFormulario();
    hay3d = Vista3D.init($('#vista3d'));
    enlazar();
    recalcular();
    pintarValidacion();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();

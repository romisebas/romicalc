/* Asistente por pasos en ventana emergente (beta 1.2), a partir de una lista de pasos con campos.
 * Mismo aspecto y comportamiento que el de la aislada: contador, progreso, Atrás / Siguiente,
 * error con "Continuar de todos modos", vista previa en vivo y crecimiento desde el botón que lo abre.
 *
 * Asistente.crear({
 *   pre,                       prefijo de los id del diálogo
 *   pasos: [{ id, nombre, titulo, html(), vivo?(cuerpo), validar?() → texto|null, ancho? }],
 *   leer(ruta), escribir(ruta, valor),   valores internos (tonf, m, kgf/cm²)
 *   faltantes() → rutas vacías,  nombre(ruta) → nombre legible,
 *   alCambiar(), alCerrar(modo)
 * }) → { abrir(i, modo, desde), cerrar(), refrescar(), rehacer(), abierto(), indice(id), elemento() }
 * Los campos se escriben con Asistente.campo({ k, etq, mag, paso, tipo, opciones, ancho, ayuda }).
 */
(function (global) {
  'use strict';

  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Campo de formulario: muestra el valor en el sistema de unidades activo y guarda la magnitud
  function campo(o) {
    const U = global.Unidades, mag = o.mag && o.mag !== 'texto' ? o.mag : null;
    const etq = o.etq + (mag ? ' <small data-u="' + mag + '">' + U.u(mag) + '</small>' : '');
    const comun = ' data-k="' + o.k + '"' + (mag ? ' data-mag="' + mag + '"' : '') + ' data-tipo="' + (o.tipo || 'num') + '"';
    let control;
    if (o.tipo === 'texto') control = '<input type="text"' + comun + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>';
    else if (o.tipo === 'textarea') control = '<textarea rows="2"' + comun + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '></textarea>';
    else if (o.tipo === 'select') control = '<select' + comun + '><option value="">—</option>' + o.opciones.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select>';
    else control = '<input type="number" inputmode="decimal" step="' + (mag && U.actual() !== 'curso' ? 'any' : (o.paso || 'any')) + '"' + comun + '>';
    return '<label' + (o.ancho ? ' class="ancho"' : '') + '>' + etq + control + (o.ayuda ? '<small class="campo-ayuda">' + o.ayuda + '</small>' : '') + '</label>';
  }

  function crear(op) {
    const pre = op.pre, $ = (s) => document.getElementById(pre + '-' + s);
    let dlg = null, i = 0, modo = 'nuevo';

    function construir() {
      if (dlg) return;
      dlg = document.createElement('dialog');
      dlg.className = 'dialogo asistente';
      dlg.id = pre + '-asistente';
      dlg.setAttribute('aria-labelledby', pre + '-titulo');
      dlg.innerHTML = '<form class="wz-form" id="' + pre + '-form" novalidate>' +
        '<div class="wz-cab"><p class="wz-contador" id="' + pre + '-contador"></p><h2 id="' + pre + '-titulo"></h2><ol class="wz-progreso" id="' + pre + '-progreso" aria-hidden="true"></ol></div>' +
        '<div class="wz-cuerpo" id="' + pre + '-cuerpo">' + op.pasos.map((p) => '<section class="wz-paso" data-paso="' + p.id + '" hidden></section>').join('') + '</div>' +
        '<div class="wz-error" id="' + pre + '-error" role="alert" hidden><span id="' + pre + '-error-txt"></span><button type="button" class="btn btn-mini" id="' + pre + '-continuar">Continuar de todos modos</button></div>' +
        '<div class="wz-pie"><button type="button" class="btn btn-quieto" id="' + pre + '-atras">Atrás</button>' +
        '<button type="button" class="btn btn-quieto wz-saltar" id="' + pre + '-saltar">Ir al dashboard</button><span class="dlg-espacio"></span>' +
        '<button type="submit" class="btn btn-acento" id="' + pre + '-siguiente">Siguiente</button></div></form>';
      document.body.appendChild(dlg);
      $('form').addEventListener('submit', (e) => { e.preventDefault(); avanzar(false); });
      $('continuar').addEventListener('click', () => avanzar(true));
      $('atras').addEventListener('click', () => { if (i > 0) mostrar(i - 1, -1); });
      $('saltar').addEventListener('click', cerrar);
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });
      dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrar(); });
      dlg.addEventListener('input', alEscribir);
      dlg.addEventListener('change', alEscribir);
    }

    function seccion(id) { return dlg.querySelector('.wz-paso[data-paso="' + id + '"]'); }

    // Llena los campos del paso con los valores actuales (convertidos al sistema activo)
    function llenar(sec) {
      const U = global.Unidades;
      sec.querySelectorAll('[data-k]').forEach((el) => {
        if (el === document.activeElement) return;
        const v = op.leer(el.dataset.k), mag = el.dataset.mag;
        el.value = v === null || v === undefined ? '' : mag ? String(Number(U.a(v, mag).toPrecision(6))) : String(v);
      });
    }

    function alEscribir(e) {
      const el = e.target;
      if (!el.dataset || !el.dataset.k) return;
      const t = el.dataset.tipo, txt = el.value;
      let v;
      if (t === 'texto' || t === 'textarea') v = txt;
      else {
        v = txt === '' ? null : Number(txt);
        if (v !== null && !isFinite(v)) return;
        if (v !== null && el.dataset.mag) v = Number(global.Unidades.de(v, el.dataset.mag).toPrecision(12));
      }
      op.escribir(el.dataset.k, v);
      el.classList.remove('invalido');
      op.alCambiar();
      vivo();
    }

    function vivo() {
      const p = op.pasos[i];
      if (p.vivo) p.vivo(seccion(p.id));
    }

    function mostrar(k, direccion) {
      i = k;
      const p = op.pasos[i], editar = modo === 'editar';
      op.pasos.forEach((q) => {
        const s = seccion(q.id), activo = q.id === p.id;
        if (activo) { s.innerHTML = q.html(); llenar(s); } else s.innerHTML = ''; // un solo paso en el DOM: sin campos ni botones repetidos
        s.hidden = !activo;
        s.classList.remove('entra-der', 'entra-izq');
        if (activo && direccion) { void s.offsetWidth; s.classList.add(direccion > 0 ? 'entra-der' : 'entra-izq'); }
      });
      $('titulo').textContent = p.titulo;
      $('contador').textContent = editar ? 'Editar datos' : 'Paso ' + (i + 1) + ' de ' + op.pasos.length;
      $('progreso').hidden = editar;
      $('progreso').innerHTML = op.pasos.map((q, j) => '<li class="' + (j < i ? 'hecho' : j === i ? 'actual' : '') + '"></li>').join('');
      $('atras').hidden = editar || i === 0;
      $('saltar').hidden = editar;
      $('siguiente').textContent = editar ? 'Listo' : i === op.pasos.length - 1 ? 'Ver resultados' : 'Siguiente';
      dlg.classList.toggle('wz-ancho', !!p.ancho);
      $('error').hidden = true;
      if (p.alMostrar) p.alMostrar(seccion(p.id));
      vivo();
      const primero = seccion(p.id).querySelector('input, select, textarea');
      if (primero) setTimeout(() => { if (!seccion(p.id).contains(document.activeElement)) primero.focus({ preventScroll: true }); }, 30);
    }

    function revisar() {
      const p = op.pasos[i], sec = seccion(p.id);
      const rutas = [...sec.querySelectorAll('[data-k]')].map((el) => el.dataset.k);
      const falt = op.faltantes().filter((k) => rutas.includes(k));
      sec.querySelectorAll('[data-k]').forEach((el) => el.classList.toggle('invalido', falt.includes(el.dataset.k)));
      if (falt.length) return 'Faltan: ' + falt.map(op.nombre).join(', ') + '.';
      return p.validar ? p.validar() : null;
    }

    function avanzar(forzar) {
      const msg = forzar ? null : revisar();
      if (msg) { $('error-txt').textContent = msg; $('error').hidden = false; return; }
      if (modo === 'editar' || i === op.pasos.length - 1) { cerrar(); return; }
      mostrar(i + 1, 1);
    }

    function abrir(k, m, desde) {
      construir();
      modo = m || 'nuevo';
      if (!dlg.open) {
        dlg.showModal();
        const reducido = global.Mov && global.Mov.reducido();
        if (desde && !reducido && dlg.animate) {
          // La ventana crece desde el botón que se pulsó
          const b = desde.getBoundingClientRect(), d = dlg.getBoundingClientRect();
          const dx = (b.left + b.width / 2) - (d.left + d.width / 2), dy = (b.top + b.height / 2) - (d.top + d.height / 2);
          dlg.classList.add('abierto');
          dlg.animate([{ opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.08)' }, { opacity: 1, transform: 'none' }],
            { duration: 460, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
        } else requestAnimationFrame(() => dlg.classList.add('abierto'));
      }
      mostrar(k || 0, 0);
    }

    function cerrar() {
      if (!dlg || !dlg.open) return;
      const m = modo;
      dlg.classList.remove('abierto');
      setTimeout(() => { if (dlg.open) dlg.close(); }, global.Mov && global.Mov.reducido() ? 0 : 170);
      modo = 'editar';
      op.alCerrar(m);
    }

    return {
      abrir, cerrar,
      refrescar() { if (dlg && dlg.open) { llenar(seccion(op.pasos[i].id)); vivo(); } },
      rehacer() { if (dlg && dlg.open) mostrar(i, 0); },
      elemento: () => dlg,
      abierto: () => !!dlg && dlg.open,
      indice: (id) => op.pasos.findIndex((p) => p.id === id),
    };
  }

  global.Asistente = { crear, campo };
})(window);

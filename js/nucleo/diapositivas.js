/* Visor de la memoria por diapositivas (v3.3).
 * Una diapositiva a la vez: texto y ecuaciones a la izquierda, figura a la derecha.
 * Índice de capítulos con su estado, barra de progreso, flechas del teclado y deslizar en celular.
 * Solo se dibuja la diapositiva visible (KaTeX y SVG son lo más costoso).
 */
(function (global) {
  'use strict';
  // Partes de las figuras que representa cada símbolo de las ecuaciones
  const LIGA_SEL = {
    perimetro: '.perimetro', area: '.area', seccion: '.seccion', voladizo: '.fig-carga', diagrama: '.diagrama', columna: '.columna',
    esquina: '.esquina, .prisma-esq', zapata: '.zapata, .presion-top', ld: '.cota.ld', carga: '.fig-flecha, .fig-punta',
  };
  // Una instancia por contenedor: op.prefijo da los id de los botones; op.ligas agrega partes de figuras
  function crear(el, op) {
    const pre = (op && op.prefijo) || 'diapo';
    const LIGAS = Object.assign({}, LIGA_SEL, (op && op.ligas) || {});
    let cont = null, escena = null, lista = [], caps = [], R = null, i = 0, anim = null;
    let serie = 0; // prefijo único por dibujo: durante la transición conviven dos diapositivas

    function montar(el) {
      cont = el;
      cont.innerHTML =
        '<nav class="dp-indice" aria-label="Capítulos de la memoria"></nav>' +
        '<div class="dp-escena" tabindex="0" aria-roledescription="presentación" aria-live="polite"></div>' +
        '<div class="dp-control">' +
          '<button type="button" class="btn dp-btn" id="' + pre + '-ant" aria-label="Diapositiva anterior">Anterior</button>' +
          '<div class="dp-progreso" aria-hidden="true"><span class="dp-relleno"></span></div>' +
          '<span class="dp-contador" id="' + pre + '-contador"></span>' +
          '<button type="button" class="btn btn-acento dp-btn" id="' + pre + '-sig" aria-label="Diapositiva siguiente">Siguiente</button>' +
        '</div>';
      escena = cont.querySelector('.dp-escena');
      cont.querySelector('#' + pre + '-ant').addEventListener('click', () => mover(-1));
      cont.querySelector('#' + pre + '-sig').addEventListener('click', () => mover(1));
      cont.querySelector('.dp-indice').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cap]');
        if (b) ir(b.dataset.cap);
      });
      cont.addEventListener('keydown', (e) => {
        if (e.target.closest('input, select, textarea')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); mover(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); mover(-1); }
      });
      // Deslizar con el dedo
      let x0 = null;
      escena.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
      escena.addEventListener('pointerup', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1);
      });
    }

    // Nuevos datos (tras un recálculo): se conserva el capítulo y la diapositiva si existen
    function datos(capitulos, resultado) {
      const previa = lista[i];
      caps = capitulos; R = resultado;
      lista = [];
      caps.forEach((cap, ci) => cap.diapos.forEach((d, di) => lista.push({ cap, ci, di, d })));
      i = 0;
      if (previa) {
        const k = lista.findIndex((x) => x.cap.id === previa.cap.id && x.di === previa.di);
        if (k >= 0) i = k;
      }
      pintarIndice();
      pintar(0);
    }

    function pintarIndice() {
      cont.querySelector('.dp-indice').innerHTML = caps.map((cap, ci) =>
        '<button type="button" class="dp-cap' + (cap.ok ? ' ok' : ' mal') + '" data-cap="' + cap.id + '">' +
          '<span class="dp-cap-n">' + (ci + 1) + '</span><span class="dp-cap-tit">' + cap.titulo + '</span>' +
          '<span class="dp-cap-punto" aria-hidden="true"></span><span class="sr-only">' + (cap.ok ? ', cumple' : ', no cumple') + '</span></button>').join('');
    }

    function figura(f) {
      if (!f || !R) return '';
      if (f.svg) return f.svg;
      if (f.tipo === 'planta') return global.Dibujo.planta(R, f.capa, pre + (++serie));
      if (f.tipo === 'corte') return global.Dibujo.corte(R, f.dir, pre + (++serie));
      return global.Figuras[f.tipo] ? global.Figuras[f.tipo](R, f.dir !== undefined ? f.dir : f.ult) : '';
    }

    function enlazar(diapo, f) {
      const fig = diapo.querySelector('.diapo-fig');
      let m3 = null; // mini-3D de la figura (si el equipo lo permite); si no, queda el SVG técnico
      const marcar = (liga, si) => {
        if (!LIGAS[liga]) return;
        if (m3) m3.resaltar(liga, si);
        fig.querySelectorAll(LIGAS[liga]).forEach((e) => e.classList.toggle('resaltado', si));
        diapo.querySelectorAll('.ec[data-liga="' + liga + '"]').forEach((e) => e.classList.toggle('resaltado', si));
      };
      diapo.querySelectorAll('.ec[data-liga]').forEach((ec) => {
        ec.addEventListener('pointerenter', () => marcar(ec.dataset.liga, true));
        ec.addEventListener('pointerleave', () => marcar(ec.dataset.liga, false));
      });
      // Al revés: la parte de la figura resalta sus ecuaciones
      const ligas = [...new Set([...diapo.querySelectorAll('.ec[data-liga]')].map((e) => e.dataset.liga))];
      ligas.forEach((liga) => fig.querySelectorAll(LIGAS[liga] || '_').forEach((el) => {
        el.addEventListener('pointerenter', () => marcar(liga, true));
        el.addEventListener('pointerleave', () => marcar(liga, false));
      }));
      if (global.Mini3D) m3 = global.Mini3D.montar(fig, f, R, (liga, si) => { if (ligas.includes(liga)) marcar(liga, si); });
    }

    // La figura se dibuja al entrar: los trazos avanzan y los rellenos aparecen, en cascada
    function dibujar(diapo) {
      if (global.Mov && global.Mov.reducido()) return;
      const svg = diapo.querySelector('.diapo-fig svg');
      if (!svg || !svg.animate) return;
      const piezas = [...svg.querySelectorAll('line, path, rect, polygon, circle, polyline, text')].filter((e) => !e.closest('defs, pattern, .cruz'));
      piezas.slice(0, 160).forEach((e, i) => {
        const retraso = 120 + Math.min(i, 60) * 12;
        if (e.tagName === 'text') { e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: retraso + 200, fill: 'backwards' }); return; }
        e.setAttribute('pathLength', '1');
        e.animate([{ strokeDasharray: '1 1', strokeDashoffset: 1, fillOpacity: 0 }, { strokeDasharray: '1 1', strokeDashoffset: 0, fillOpacity: 1 }],
          { duration: 620, delay: retraso, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' })
          .onfinish = () => e.removeAttribute('pathLength');
      });
    }

    function html(x) {
      const d = x.d, cap = x.cap, ultima = x.di === cap.diapos.length - 1;
      return '<article class="diapo" aria-label="' + d.titulo + '">' +
        '<div class="diapo-txt">' +
          '<p class="diapo-cap">Capítulo ' + (x.ci + 1) + ' · ' + cap.titulo + (cap.ref ? ' <span>' + cap.ref + '</span>' : '') + '</p>' +
          '<h3 class="diapo-tit">' + d.titulo + '</h3>' +
          (d.texto ? '<p class="diapo-texto">' + d.texto + '</p>' : '') +
          '<div class="diapo-items">' + d.items.map(global.Memoria.item).join('') + '</div>' +
          (ultima ? '<p class="diapo-fin ' + (cap.ok ? 'ok' : 'mal') + '">' + (cap.ok ? 'Este capítulo cumple' : 'Este capítulo no cumple') + '</p>' : '') +
        '</div>' +
        '<figure class="diapo-fig">' + figura(d.fig) + '</figure>' +
      '</article>';
    }

    function pintar(dir) {
      if (!lista.length) { escena.innerHTML = ''; return; }
      const x = lista[i];
      const reducido = global.Mov && global.Mov.reducido();
      // Un clic durante una transición: cancelar no dispara onfinish, así que la diapositiva
      // que salía se quita a mano. Solo queda la última (la que estaba entrando).
      if (anim) { anim.forEach((a) => a.cancel()); anim = null; }
      while (escena.children.length > 1) escena.firstElementChild.remove();
      const viejo = escena.firstElementChild;
      if (!dir || !viejo || reducido || !Element.prototype.animate) {
        escena.innerHTML = html(x);
        enlazar(escena.lastElementChild, x.d.fig);
        if (dir) dibujar(escena.lastElementChild);
      } else {
        // Transición: la anterior sale hacia un lado y la nueva entra desde el otro
        viejo.classList.add('saliendo');
        escena.insertAdjacentHTML('beforeend', html(x));
        const nuevo = escena.lastElementChild;
        enlazar(nuevo, x.d.fig);
        dibujar(nuevo);
        const d = dir > 0 ? 1 : -1;
        const fuera = viejo.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-40 * d) + 'px)' }], { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
        const dentro = nuevo.animate([{ opacity: 0, transform: 'translateX(' + (48 * d) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 90, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'backwards' });
        anim = [fuera, dentro];
        fuera.onfinish = () => viejo.remove();
        dentro.onfinish = () => { anim = null; };
      }
      $$('.dp-cap').forEach((b) => b.setAttribute('aria-current', String(b.dataset.cap === x.cap.id)));
      cont.querySelector('#' + pre + '-contador').textContent = (i + 1) + ' de ' + lista.length;
      cont.querySelector('.dp-relleno').style.transform = 'scaleX(' + ((i + 1) / lista.length).toFixed(4) + ')';
      cont.querySelector('#' + pre + '-ant').disabled = i === 0;
      cont.querySelector('#' + pre + '-sig').disabled = i === lista.length - 1;
    }
    const $$ = (s) => Array.from(cont.querySelectorAll(s));

    function mover(paso) {
      const k = Math.max(0, Math.min(lista.length - 1, i + paso));
      if (k === i) return;
      i = k;
      pintar(paso);
    }

    function ir(capId) {
      const k = lista.findIndex((x) => x.cap.id === capId);
      if (k < 0 || k === i) return;
      const dir = k > i ? 1 : -1;
      i = k;
      pintar(dir);
    }

    montar(el);
    return { datos, ir, actual: () => lista[i] };
  }

  // Instancia de la memoria de la aislada (API anterior)
  let defecto = null;

  global.Diapositivas = {
    crear,
    montar: (el) => { defecto = crear(el); },
    datos: (c, r) => defecto.datos(c, r),
    ir: (id) => defecto.ir(id),
    actual: () => defecto.actual(),
  };
})(window);

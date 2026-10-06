/* Movimiento de la interfaz (criterios de apple-design y emil-design-eng):
 * transform y opacity solamente, curvas ease-out fuertes, interrumpible,
 * y siempre respetando prefers-reduced-motion.
 */
(function (global) {
  'use strict';

  const mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  // Ajuste de la app: 'sistema' respeta Windows/macOS; 'activadas' y 'desactivadas' lo ignoran.
  let modo = 'activadas';
  const reducido = () => (modo === 'activadas' ? false : modo === 'desactivadas' ? true : mq.matches);
  function configurar(m) {
    modo = m || 'activadas';
    document.documentElement.classList.toggle('mov-reducido', reducido());
  }
  if (mq.addEventListener) mq.addEventListener('change', () => configurar(modo));
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

  // Aparición en cascada la primera vez que una sección entra en pantalla.
  let observador = null;
  function revelar(elementos) {
    if (reducido() || !('IntersectionObserver' in global)) return;
    if (!observador) {
      observador = new IntersectionObserver((entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); observador.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    }
    elementos.forEach((el, i) => {
      if (el.classList.contains('visible')) return;
      el.classList.add('revela');
      el.style.setProperty('--i', String(i % 6));
      observador.observe(el);
    });
  }

  // Números que cuentan desde el valor mostrado hasta el nuevo (solo en cambios programáticos).
  const animando = new WeakMap();
  function contar(el, valor, dec, animar) {
    const final = Number(valor);
    const texto = (x) => x.toFixed(dec);
    const previo = parseFloat(el.dataset.valor);
    el.dataset.valor = String(final);
    if (!animar || reducido() || !isFinite(previo) || Math.abs(previo - final) < Math.pow(10, -dec)) {
      el.textContent = texto(final);
      return;
    }
    const dur = 520;
    let t0 = null; // se fija en el primer cuadro, aunque el hilo haya estado ocupado
    const id = {};
    animando.set(el, id);
    const paso = (t) => {
      if (animando.get(el) !== id) return; // interrumpido por un valor más nuevo
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4); // ease-out cuártico
      el.textContent = texto(previo + (final - previo) * e);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Control segmentado con indicador deslizante (como los de iOS).
  function segmentado(cont) {
    let ind = cont.querySelector('.seg-ind');
    if (!ind) { ind = document.createElement('span'); ind.className = 'seg-ind'; ind.setAttribute('aria-hidden', 'true'); cont.prepend(ind); }
    const mover = (sinAnim) => {
      const b = cont.querySelector('[aria-selected="true"], [aria-pressed="true"]');
      if (!b) { ind.style.opacity = '0'; return; }
      if (sinAnim) ind.classList.add('sin-anim');
      ind.style.opacity = '1';
      ind.style.width = b.offsetWidth + 'px';
      ind.style.height = b.offsetHeight + 'px';
      ind.style.transform = 'translate(' + b.offsetLeft + 'px,' + b.offsetTop + 'px)';
      if (sinAnim) { void ind.offsetWidth; ind.classList.remove('sin-anim'); }
    };
    mover(true);
    if ('ResizeObserver' in global) new ResizeObserver(() => mover(true)).observe(cont);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mover(true));
    return mover;
  }

  // Apertura de <details> con desplazamiento de altura animado (interrumpible).
  // antesDeAbrir(det): permite completar el contenido antes de medir su altura.
  function detallesSuaves(raiz, antesDeAbrir) {
    raiz.addEventListener('click', (ev) => {
      const sum = ev.target.closest('summary');
      if (!sum || !raiz.contains(sum)) return;
      const det = sum.parentElement;
      if (antesDeAbrir && !det.open) antesDeAbrir(det);
      const cuerpo = det.querySelector(':scope > .paso-cuerpo');
      if (!cuerpo || reducido() || !cuerpo.animate) return; // comportamiento nativo
      ev.preventDefault();
      // Se abre si estaba cerrado o cerrándose; se cierra si estaba abierto o abriéndose.
      const abrir = !det.open || det.dataset.cerrando === '1';
      const desde = det.open ? cuerpo.getBoundingClientRect().height : 0; // valor en pantalla
      if (det._anim) det._anim.cancel();
      if (!det.open) det.open = true;
      const hasta = abrir ? cuerpo.scrollHeight : 0;
      det.dataset.cerrando = abrir ? '' : '1';
      det.classList.toggle('abriendo', abrir);
      const anim = cuerpo.animate(
        [{ height: desde + 'px', opacity: abrir ? 0.2 : 1 }, { height: hasta + 'px', opacity: abrir ? 1 : 0 }],
        { duration: abrir ? 340 : 220, easing: abrir ? EASE_OUT : 'cubic-bezier(0.4, 0, 1, 1)' });
      det._anim = anim;
      anim.onfinish = () => {
        det._anim = null;
        det.dataset.cerrando = '';
        det.classList.remove('abriendo');
        if (!abrir) det.open = false;
        det.dispatchEvent(new Event('toggle-fin'));
      };
    });
  }

  function desplazarA(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' });
  }

  // Interpolación para la cámara 3D (ease-in-out, porque se mueve en pantalla).
  function tween(dur, cada, fin) {
    if (reducido()) { cada(1); if (fin) fin(); return { cancelar() {} }; }
    const t0 = performance.now();
    let vivo = true;
    const paso = (t) => {
      if (!vivo) return;
      const k = Math.min(1, (t - t0) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cada(e);
      if (k < 1) requestAnimationFrame(paso); else if (fin) fin();
    };
    requestAnimationFrame(paso);
    return { cancelar() { vivo = false; } };
  }

  global.Mov = { configurar, reducido, revelar, contar, segmentado, detallesSuaves, desplazarA, tween, EASE_OUT, EASE_IN_OUT };
})(window);

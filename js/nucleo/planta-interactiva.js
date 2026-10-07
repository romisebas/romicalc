/* Planos interactivos (v1.1): lectura de σ bajo el mouse, acercar con la rueda y mover arrastrando.
 * Sirve para la planta y para los cortes. El dibujo se vuelve a generar en cada recálculo; el
 * acercamiento se guarda por contenedor y se aplica de nuevo. Los datos vienen en los data-* del SVG.
 */
(function (global) {
  'use strict';
  const estados = new Map();

  function montar(el) {
    if (estados.has(el)) return;
    const e = { cont: el, tip: null, cruz: null, boton: null, vista: null };
    estados.set(el, e);
    conectar(e);
  }
  function aplicar(el) {
    const e = estados.get(el || [...estados.keys()][0]);
    if (e) aplicarEn(e);
  }
  function base(s) { return s.getAttribute('data-vb0').split(' ').map(Number); }
  function aplicarEn(e) {
    const s = e.cont.querySelector('svg.dibujo');
    if (!s) return;
    if (!s.hasAttribute('data-vb0')) s.setAttribute('data-vb0', s.getAttribute('viewBox'));
    s.setAttribute('viewBox', (e.vista || base(s)).map((v) => +v.toFixed(2)).join(' '));
    e.boton.hidden = !e.vista;
  }

  function aSvg(s, ev) {
    const p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(s.getScreenCTM().inverse());
  }

  function conectar(e) {
    const cont = e.cont;
    const svg = () => cont.querySelector('svg.dibujo');
    const aplicar = () => aplicarEn(e);
    let tip, boton, cruz = null;
    e.tip = tip = document.createElement('div'); tip.className = 'tip-planta'; tip.hidden = true;
    e.boton = boton = document.createElement('button'); boton.type = 'button'; boton.id = cont.id + '-encuadre'; boton.className = 'btn btn-mini encuadre encuadre-plano'; boton.textContent = 'Encuadrar'; boton.hidden = true;
    cont.parentElement.style.position = 'relative';
    cont.parentElement.appendChild(tip); cont.parentElement.appendChild(boton);
    boton.addEventListener('click', () => { e.vista = null; aplicar(); });

    cont.addEventListener('wheel', (ev) => {
      const s = svg(); if (!s) return;
      ev.preventDefault();
      const v = e.vista || base(s), p = aSvg(s, ev);
      const f = Math.exp(ev.deltaY * 0.0015), b = base(s);
      const w = Math.max(b[2] / 8, Math.min(b[2], v[2] * f)), h = w * v[3] / v[2];
      e.vista = [p.x - (p.x - v[0]) * w / v[2], p.y - (p.y - v[1]) * h / v[3], w, h];
      if (w >= b[2] - 1e-6) e.vista = null;
      aplicar();
    }, { passive: false });

    let arr = null;
    cont.addEventListener('pointerdown', (ev) => { const s = svg(); if (!s || !e.vista) return; arr = { p: aSvg(s, ev), v: e.vista.slice() }; cont.setPointerCapture(ev.pointerId); cont.classList.add('moviendo'); });
    cont.addEventListener('pointerup', () => { arr = null; cont.classList.remove('moviendo'); });
    cont.addEventListener('pointermove', (ev) => {
      const s = svg(); if (!s) return;
      if (arr) {
        const p = aSvg(s, ev);
        e.vista = [e.vista[0] - (p.x - arr.p.x), e.vista[1] - (p.y - arr.p.y), e.vista[2], e.vista[3]];
        aplicar();
        return;
      }
      const d = s.dataset, p = aSvg(s, ev), k = +d.k;
      const r = cont.parentElement.getBoundingClientRect();
      const mostrarTip = (txt, mal) => {
        tip.textContent = txt; tip.classList.toggle('mal', mal); tip.hidden = false;
        tip.style.transform = 'translate(' + Math.round(ev.clientX - r.left + 14) + 'px,' + Math.round(ev.clientY - r.top + 14) + 'px)';
      };
      // Corte: presión bajo la zapata en la abscisa del cursor
      if (d.modo === 'corte') {
        const x = (p.x - d.cx) / k;
        if (Math.abs(x) > d.l / 2) { tip.hidden = true; return; }
        const sig = +d.izq + (d.der - d.izq) * (x / d.l + 0.5);
        mostrarTip('x = ' + global.Unidades.fmt(x + d.l / 2, 'longitud') + ' · σ = ' + global.Unidades.fmt(sig, 'presion'), sig > +d.qadm);
        return;
      }
      // Planta: σ = P/A + gx·x + gy·y
      const x = (p.x - d.cx) / k, y = (d.cy - p.y) / k;
      const dentro = Math.abs(x) <= d.lx / 2 && Math.abs(y) <= d.ly / 2;
      if (!dentro) { tip.hidden = true; if (cruz) cruz.remove(); cruz = null; return; }
      const sigma = +d.p + +d.gx * x + +d.gy * y;
      mostrarTip('σ = ' + global.Unidades.fmt(sigma, 'presion') + (sigma > +d.qadm ? ' (excede σadm)' : ''), sigma > +d.qadm || sigma <= 0);
      if (!cruz || !s.contains(cruz)) {
        cruz = document.createElementNS('http://www.w3.org/2000/svg', 'g'); cruz.setAttribute('class', 'cruz'); cruz.innerHTML = '<line/><line/><circle r="4"/>';
        s.appendChild(cruz);
      }
      const [h, v, c] = cruz.children, X0 = d.cx - d.lx / 2 * k, X1 = +d.cx + d.lx / 2 * k, Y0 = d.cy - d.ly / 2 * k, Y1 = +d.cy + d.ly / 2 * k;
      h.setAttribute('x1', X0); h.setAttribute('x2', X1); h.setAttribute('y1', p.y); h.setAttribute('y2', p.y);
      v.setAttribute('y1', Y0); v.setAttribute('y2', Y1); v.setAttribute('x1', p.x); v.setAttribute('x2', p.x);
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    });
    cont.addEventListener('pointerleave', () => { tip.hidden = true; if (cruz) cruz.remove(); cruz = null; });
  }

  global.PlantaInteractiva = { montar, aplicar };
})(window);

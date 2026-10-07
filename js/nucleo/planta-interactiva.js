/* Planta interactiva (v1.1): lectura de σ bajo el mouse, acercar con la rueda y mover arrastrando.
 * El dibujo se vuelve a generar en cada recálculo; el acercamiento se guarda aquí y se aplica de nuevo.
 * Los datos del campo de presiones vienen en los atributos data-* del SVG (dibujo.js).
 */
(function (global) {
  'use strict';
  let cont = null, tip = null, cruz = null, boton = null, vista = null; // vista: [x, y, w, h] o null (encuadre completo)

  function svg() { return cont && cont.querySelector('svg.planta'); }
  function base(s) { return s.getAttribute('data-vb0').split(' ').map(Number); }

  function aplicar() {
    const s = svg();
    if (!s) return;
    if (!s.hasAttribute('data-vb0')) s.setAttribute('data-vb0', s.getAttribute('viewBox'));
    s.setAttribute('viewBox', (vista || base(s)).map((v) => +v.toFixed(2)).join(' '));
    boton.hidden = !vista;
  }

  function aSvg(s, ev) {
    const p = s.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(s.getScreenCTM().inverse());
  }

  function montar(el) {
    cont = el;
    tip = document.createElement('div'); tip.className = 'tip-planta'; tip.hidden = true;
    boton = document.createElement('button'); boton.type = 'button'; boton.id = 'planta-encuadre'; boton.className = 'btn btn-mini encuadre'; boton.textContent = 'Encuadrar'; boton.hidden = true;
    cont.parentElement.style.position = 'relative';
    cont.parentElement.appendChild(tip); cont.parentElement.appendChild(boton);
    boton.addEventListener('click', () => { vista = null; aplicar(); });

    cont.addEventListener('wheel', (ev) => {
      const s = svg(); if (!s) return;
      ev.preventDefault();
      const v = vista || base(s), p = aSvg(s, ev);
      const f = Math.exp(ev.deltaY * 0.0015), b = base(s);
      const w = Math.max(b[2] / 8, Math.min(b[2], v[2] * f)), h = w * v[3] / v[2];
      vista = [p.x - (p.x - v[0]) * w / v[2], p.y - (p.y - v[1]) * h / v[3], w, h];
      if (w >= b[2] - 1e-6) vista = null;
      aplicar();
    }, { passive: false });

    let arr = null;
    cont.addEventListener('pointerdown', (ev) => { const s = svg(); if (!s || !vista) return; arr = { p: aSvg(s, ev), v: vista.slice() }; cont.setPointerCapture(ev.pointerId); cont.classList.add('moviendo'); });
    cont.addEventListener('pointerup', () => { arr = null; cont.classList.remove('moviendo'); });
    cont.addEventListener('pointermove', (ev) => {
      const s = svg(); if (!s) return;
      if (arr) {
        const p = aSvg(s, ev);
        vista = [vista[0] - (p.x - arr.p.x), vista[1] - (p.y - arr.p.y), vista[2], vista[3]];
        aplicar();
        return;
      }
      // Lectura de σ en el punto: σ = P/A + gx·x + gy·y
      const d = s.dataset, p = aSvg(s, ev), k = +d.k;
      const x = (p.x - d.cx) / k, y = (d.cy - p.y) / k;
      const dentro = Math.abs(x) <= d.lx / 2 && Math.abs(y) <= d.ly / 2;
      if (!dentro) { tip.hidden = true; if (cruz) cruz.remove(); cruz = null; return; }
      const sigma = +d.p + +d.gx * x + +d.gy * y;
      tip.textContent = 'σ = ' + global.Unidades.fmt(sigma, 'presion') + (sigma > +d.qadm ? ' (excede σadm)' : '');
      tip.classList.toggle('mal', sigma > +d.qadm || sigma <= 0);
      const r = cont.parentElement.getBoundingClientRect();
      tip.hidden = false;
      tip.style.transform = 'translate(' + Math.round(ev.clientX - r.left + 14) + 'px,' + Math.round(ev.clientY - r.top + 14) + 'px)';
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

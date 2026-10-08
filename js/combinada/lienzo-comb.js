/* Lienzo interactivo de la combinada (beta 1.2): alzado con las columnas que se arrastran o se mueven
 * con el teclado y, si se pide, diagramas de presión, cortante y momento con lectura bajo el cursor.
 * Se usa en el paso "Ubicación" del asistente (sin diagramas) y en Planos → Alzado y diagramas.
 *
 * Lienzo.crear(cont, { estado(), resultado(), alMover(), alCarga?(i, boton), diagramas }) → { pintar() }
 */
(function (global) {
  'use strict';

  const PASO = 0.05;
  const D = () => global.DibujoCombinada;

  function separacionMin(estado) {
    const c = estado.columnas, a = Number(c[0].c1) || 0.4, b = Number(c[1].c1) || 0.4;
    return Math.round(((a + b) / 2 + PASO) / PASO) * PASO;
  }

  // La exterior cambia el voladizo a; la interior, la separación s (pasos de 0.05 m)
  function moverColumna(estado, i, valor) {
    const v = +(Math.round(valor / PASO) * PASO).toFixed(2);
    if (i === 0) estado.geometria.a = Math.max(0, v);
    else estado.geometria.s = Math.max(separacionMin(estado), v);
  }

  function crear(cont, op) {
    const conDiagramas = op.diagramas !== false;
    let esc = null, arrastre = null, cuadro = 0;
    cont.classList.add('mesa-lienzo');
    cont.innerHTML = '<div class="mesa-lienzo-ancho' + (conDiagramas ? '' : ' corto') + '"><div class="mesa-cargas"></div><div class="mesa-dibujo"></div></div>' +
      (conDiagramas ? '<p class="mesa-lectura num" aria-live="polite">Pasa el cursor por los diagramas para leer V y M.</p>' : '');
    const q = (s) => cont.querySelector(s);

    function pintar() {
      const estado = op.estado(), R = op.resultado();
      if (!esc || !arrastre) esc = D().escalaLienzo(estado, R);
      const foco = document.activeElement && cont.contains(document.activeElement) && document.activeElement.closest('.mesa-col');
      const iFoco = foco ? foco.dataset.i : null;
      q('.mesa-dibujo').innerHTML = D().lienzo(estado, R, esc, { diagramas: conDiagramas });
      if (iFoco !== null) { const c = q('.mesa-col[data-i="' + iFoco + '"]'); if (c) c.focus({ preventScroll: true }); }
      pintarCargas(estado, R);
    }

    function pintarCargas(estado, R) {
      const U = global.Unidades, G = D().geometria(estado, R), LZ = D().LZ, k = (LZ.W - LZ.ML - LZ.MR) / esc.Xmax;
      q('.mesa-cargas').innerHTML = estado.columnas.map((c, i) => {
        const P = (Number(c.D) || 0) + (Number(c.L) || 0), x = (LZ.ML + G.cols[i].x * k) / LZ.W * 100;
        const txt = c.D > 0 ? 'P<sub>s</sub> = ' + U.fmt(P, 'fuerza') : 'Sin cargas';
        return '<button type="button" class="mesa-carga' + (c.D > 0 ? '' : ' vacia') + '" data-i="' + i + '" style="left:' + x.toFixed(3) + '%"' + (op.alCarga ? ' aria-haspopup="dialog"' : ' tabindex="-1"') + '>' +
          '<span class="mesa-carga-col">' + (i ? 'Interior' : 'Exterior') + '</span><span>' + txt + '</span></button>';
      }).join('');
    }

    // px de pantalla → metros sobre el eje x del lienzo
    function aMetros(clientX) {
      const s = q('.mesa-svg'), r = s.getBoundingClientRect(), LZ = D().LZ;
      return ((clientX - r.left) * LZ.W / r.width - LZ.ML) / Number(s.dataset.k);
    }

    cont.addEventListener('pointerdown', (e) => {
      const col = e.target.closest('.mesa-col');
      if (!col || e.button !== 0) return;
      e.preventDefault();
      const i = Number(col.dataset.i), G = D().geometria(op.estado(), op.resultado());
      arrastre = { i, id: e.pointerId, desfase: aMetros(e.clientX) - G.cols[i].x };
      cont.setPointerCapture(e.pointerId);
      cont.classList.add('arrastrando');
      col.focus({ preventScroll: true });
    });
    const soltarEn = (e) => {
      const estado = op.estado(), G = D().geometria(estado, op.resultado()), x = aMetros(e.clientX) - arrastre.desfase;
      moverColumna(estado, arrastre.i, arrastre.i === 0 ? x - G.c1e / 2 : x - G.x1);
    };
    cont.addEventListener('pointermove', (e) => {
      if (arrastre && e.pointerId === arrastre.id) {
        soltarEn(e);
        if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; op.alMover(); });
        return;
      }
      leer(e);
    });
    const fin = (e) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      soltarEn(e);
      arrastre = null;
      cont.classList.remove('arrastrando');
      if (cuadro) { cancelAnimationFrame(cuadro); cuadro = 0; }
      op.alMover();
    };
    cont.addEventListener('pointerup', fin);
    cont.addEventListener('pointercancel', fin);
    cont.addEventListener('pointerleave', () => { if (!arrastre) ocultarLector(); });
    cont.addEventListener('keydown', (e) => {
      const col = e.target.closest('.mesa-col');
      if (!col || !['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
      e.preventDefault();
      const estado = op.estado(), i = Number(col.dataset.i), paso = (e.shiftKey ? 5 : 1) * PASO * (e.key === 'ArrowLeft' ? -1 : 1);
      const G = D().geometria(estado, op.resultado());
      if (e.key === 'Home') moverColumna(estado, i, 0);
      else moverColumna(estado, i, (i === 0 ? G.a : G.s) + paso);
      op.alMover();
    });
    cont.addEventListener('click', (e) => { const b = e.target.closest('.mesa-carga'); if (b && op.alCarga) op.alCarga(Number(b.dataset.i), b); });

    // Lector: línea vertical con V(x), M(x) y q(x) bajo el cursor
    function leer(e) {
      const R = op.resultado(), zona = e.target.closest ? e.target.closest('.mesa-diag') : null;
      if (!R || !zona || !conDiagramas) { ocultarLector(); return; }
      const U = global.Unidades, x = Math.min(R.L, Math.max(0, aMetros(e.clientX)));
      const v = global.Tipos.combinada.esfuerzos(R, x), lin = q('.mesa-lector'), X = D().LZ.ML + x * Number(q('.mesa-svg').dataset.k);
      lin.setAttribute('x1', X.toFixed(2)); lin.setAttribute('x2', X.toFixed(2)); lin.setAttribute('visibility', 'visible');
      q('.mesa-lectura').textContent = 'x = ' + U.fmt(x, 'longitud') + ' · V = ' + U.fmt(v.V, 'fuerza') + ' · M = ' + U.fmt(v.M, 'momento') + ' · q = ' + U.fmt(v.q, 'presion');
    }
    function ocultarLector() { const l = q('.mesa-lector'); if (l) l.setAttribute('visibility', 'hidden'); }

    return { pintar, reiniciarEscala: () => { esc = null; } };
  }

  global.Lienzo = { crear, separacionMin };
})(window);

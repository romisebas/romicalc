/* Pantalla de carga (v3.2): barra suave que recorre las etapas del cálculo.
 * El cálculo es instantáneo; la carga marca la transición entre los datos y el resultado.
 * La barra avanza por rAF con una curva que se demora un poco en cada etapa, sin saltos.
 * Con animaciones desactivadas no se muestra.
 */
(function (global) {
  'use strict';
  const ETAPAS = ['Esfuerzos en el suelo', 'Punzonamiento', 'Cortante en una dirección', 'Flexión y refuerzo', 'Aplastamiento', 'Longitud de desarrollo', 'Memoria de cálculo'];
  const DURACION = 1900;

  // Avance global suave (ease-in-out) con una leve meseta al final de cada etapa
  function avance(k) {
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const n = ETAPAS.length;
    const x = e * n, i = Math.floor(x), f = x - i;
    const local = f < 0.75 ? f / 0.75 : 1; // cada etapa llena su tramo y espera un instante
    const suave = 1 - Math.pow(1 - local, 2);
    return Math.min(1, (i + suave) / n);
  }

  function mostrar(titulo) {
    const cont = document.getElementById('cargando');
    if (!cont || (global.Mov && global.Mov.reducido())) return Promise.resolve();
    const relleno = document.getElementById('cg-relleno');
    const paso = document.getElementById('cg-paso');
    const pct = document.getElementById('cg-pct');
    document.getElementById('cg-tit').textContent = titulo || 'Calculando';
    document.getElementById('cg-logo').innerHTML = global.Logo.svg('cg-marca dibujar');
    relleno.style.transform = 'scaleX(0)';
    cont.hidden = false;
    cont.classList.remove('sale');
    void cont.offsetWidth;
    cont.classList.add('entra');
    return new Promise((listo) => {
      let t0 = null;
      const cuadro = (t) => {
        if (t0 === null) t0 = t;
        const k = Math.min(1, (t - t0) / DURACION);
        const p = avance(k);
        relleno.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        pct.textContent = Math.round(p * 100) + ' %';
        paso.textContent = ETAPAS[Math.min(ETAPAS.length - 1, Math.floor(p * ETAPAS.length))];
        if (k < 1) { requestAnimationFrame(cuadro); return; }
        paso.textContent = 'Listo';
        cont.classList.add('sale');
        listo(); // el veredicto empieza a animarse mientras la carga se desvanece
        setTimeout(() => { cont.hidden = true; cont.classList.remove('entra', 'sale'); }, 420);
      };
      requestAnimationFrame(cuadro);
    });
  }

  global.Cargando = { mostrar, ETAPAS };
})(window);

/* Pantalla de carga (v1.1): "el proyecto se dibuja".
 * Con un resultado R, dibuja la planta del propio proyecto (contorno con sus cotas reales, columna
 * y mapa de presiones), marca uno a uno los 6 chequeos con su utilización real y termina con el sello
 * del veredicto. Sin R, solo muestra la barra con las etapas del cálculo.
 * La barra avanza por rAF con una curva suave. Con animaciones desactivadas no se muestra.
 */
(function (global) {
  'use strict';
  const ETAPAS = ['Esfuerzos en el suelo', 'Punzonamiento', 'Cortante en una dirección', 'Flexión y refuerzo', 'Aplastamiento', 'Longitud de desarrollo', 'Memoria de cálculo'];
  const DURACION = 2600;
  const CORTO = { serv: 'Suelo', pz: 'Punzonamiento', cu: 'Cortante', fl: 'Flexión', ap: 'Aplastamiento', ld: 'Desarrollo' };
  const ICONO_OK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  const ICONO_MAL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  function avance(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  // Planta simplificada del proyecto, escalada a su proporción real
  function plano(R) {
    const U = global.Unidades, W = 300, H = 230, M = 44;
    const k = Math.min((W - 2 * M) / R.Lx, (H - 2 * M) / R.Ly);
    const w = R.Lx * k, h = R.Ly * k, x0 = (W - w) / 2, y0 = (H - h) / 2;
    const cx = R.inp.columna.Cx * k, cy = R.inp.columna.Cy * k;
    const sv = R.serv, q = R.inp.suelo.qadm;
    const tono = (s) => (s > q || s <= 0 ? '#a3392c' : 'rgb(' + [223, 232, 243].map((b, i) => Math.round(b + ([66, 97, 136][i] - b) * Math.pow(Math.min(1, s / q), 2.4))).join(',') + ')');
    // σ4 arriba a la izquierda, σ1 arriba a la derecha: gradiente diagonal aproximado
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Planta del proyecto">' +
      '<defs><linearGradient id="cg-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="' + tono(sv.s3) + '"/><stop offset="1" stop-color="' + tono(sv.s1) + '"/></linearGradient></defs>' +
      '<rect class="cg-presion" x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" fill="url(#cg-grad)"/>' +
      '<rect class="cg-contorno" pathLength="1" x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '"/>' +
      '<g class="cg-cotas"><path d="M' + x0 + ' ' + (y0 + h + 18) + 'H' + (x0 + w) + 'M' + (x0 + w + 18) + ' ' + y0 + 'V' + (y0 + h) + '"/>' +
      '<text x="' + (x0 + w / 2) + '" y="' + (y0 + h + 34) + '" text-anchor="middle">Lx = ' + U.fmt(R.Lx, 'longitud') + '</text>' +
      '<text x="' + (x0 + w + 30) + '" y="' + (y0 + h / 2) + '" transform="rotate(-90 ' + (x0 + w + 30) + ' ' + (y0 + h / 2) + ')" text-anchor="middle">Ly = ' + U.fmt(R.Ly, 'longitud') + '</text></g>' +
      '<rect class="cg-columna" x="' + (W / 2 - cx / 2) + '" y="' + (H / 2 - cy / 2) + '" width="' + cx + '" height="' + cy + '"/>' +
      '</svg>';
  }

  function mostrar(titulo, R) {
    const cont = document.getElementById('cargando');
    if (!cont || (global.Mov && global.Mov.reducido())) return Promise.resolve();
    const relleno = document.getElementById('cg-relleno');
    const paso = document.getElementById('cg-paso');
    const pct = document.getElementById('cg-pct');
    const escena = document.getElementById('cg-escena');
    document.getElementById('cg-tit').textContent = titulo || 'Calculando';
    document.getElementById('cg-logo').innerHTML = global.Logo.svg('cg-marca dibujar');
    escena.hidden = !R;
    if (R) {
      escena.innerHTML = '<div class="cg-plano">' + plano(R) + '</div>' +
        '<ul class="cg-lista">' + R.chequeos.map((c) => '<li class="cg-chequeo ' + (c.ok ? 'ok' : 'mal') + '"><span class="cg-ico">' + (c.ok ? ICONO_OK : ICONO_MAL) + '</span>' +
          '<span class="cg-nom">' + (CORTO[c.id] || c.titulo) + '</span><span class="cg-u">' + Math.round(c.util * 100) + ' %</span></li>').join('') + '</ul>' +
        '<div class="cg-sello ' + (R.todoOk ? 'ok' : 'mal') + '">' + (R.todoOk ? 'Cumple' : 'No cumple') + '</div>';
    }
    relleno.style.transform = 'scaleX(0)';
    cont.hidden = false;
    cont.classList.remove('sale', 'dibuja');
    void cont.offsetWidth;
    cont.classList.add('entra', 'dibuja');
    const items = R ? [...escena.querySelectorAll('.cg-chequeo')] : [];
    return new Promise((listo) => {
      let t0 = null;
      const cuadro = (t) => {
        if (t0 === null) t0 = t;
        const k = Math.min(1, (t - t0) / DURACION);
        const p = avance(k);
        relleno.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        pct.textContent = Math.round(p * 100) + ' %';
        paso.textContent = ETAPAS[Math.min(ETAPAS.length - 1, Math.floor(p * ETAPAS.length))];
        // Los chequeos se marcan uno a uno entre el 30 % y el 85 % del tiempo
        items.forEach((li, i) => { if (k > 0.3 + i * 0.09) li.classList.add('listo'); });
        if (R && k > 0.86) escena.classList.add('con-sello');
        if (k < 1) { requestAnimationFrame(cuadro); return; }
        paso.textContent = 'Listo';
        setTimeout(() => {
          cont.classList.add('sale');
          listo(); // el veredicto empieza a animarse mientras la carga se desvanece
          setTimeout(() => { cont.hidden = true; cont.classList.remove('entra', 'sale', 'dibuja'); escena.classList.remove('con-sello'); }, 420);
        }, R ? 350 : 0);
      };
      requestAnimationFrame(cuadro);
    });
  }

  global.Cargando = { mostrar, ETAPAS };
})(window);

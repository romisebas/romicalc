/* Figuras pequeñas para las diapositivas de la memoria (v3.3).
 * Complementan la planta y los cortes de dibujo.js: cargas sobre la columna, núcleo central,
 * comparación de resistencias a cortante, voladizo a flexión y áreas de aplastamiento.
 * Usan las mismas clases CSS que los planos (.dibujo) para respetar el tema.
 */
(function (global) {
  'use strict';
  const UN = () => global.Unidades;
  const W = 360, H = 250;
  const svg = (cont, titulo) => '<svg class="dibujo fig" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titulo + '">' + cont + '</svg>';
  const txt = (x, y, t, cls, anc) => '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anc ? ' text-anchor="' + anc + '"' : '') + '>' + t + '</text>';
  const flecha = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), l = 9;
    const p1 = [x2 - l * Math.cos(a - 0.4), y2 - l * Math.sin(a - 0.4)], p2 = [x2 - l * Math.cos(a + 0.4), y2 - l * Math.sin(a + 0.4)];
    return '<line class="fig-flecha" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>' +
      '<path class="fig-punta" d="M' + x2 + ' ' + y2 + 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'Z"/>';
  };

  // Columna sobre la zapata con P y los dos momentos (servicio o mayorados)
  function cargas(R, ult) {
    const P = ult ? R.ult.P : R.serv.P, Mx = ult ? R.ult.Mx : R.serv.Mx, My = ult ? R.ult.My : R.serv.My;
    let s = '<rect class="zapata" x="70" y="168" width="220" height="44"/>';
    s += '<rect class="columna" x="158" y="70" width="44" height="98"/>';
    s += flecha(180, 14, 180, 64) + txt(192, 34, 'P = ' + UN().fmt(P, 'fuerza'), 'fig-etq');
    s += '<path class="fig-flecha" d="M120 92 A40 40 0 0 1 132 62" fill="none"/>' + flecha(128, 66, 132, 62) + txt(20, 118, 'Mx = ' + UN().fmt(Mx, 'momento'), 'fig-etq');
    s += '<path class="fig-flecha" d="M240 92 A40 40 0 0 0 228 62" fill="none"/>' + flecha(232, 66, 228, 62) + txt(232, 118, 'My = ' + UN().fmt(My, 'momento'), 'fig-etq');
    s += '<line class="suelo-line" x1="40" y1="212" x2="320" y2="212"/>';
    s += txt(180, 238, ult ? 'Cargas mayoradas (' + R.ult.gob.id + ')' : 'Cargas de servicio', 'etq-mini', 'middle');
    return svg(s, 'Cargas sobre la columna');
  }

  // Planta con el núcleo central (rombo de L/6) y el punto donde actúa la resultante
  function nucleo(R) {
    const k = Math.min(260 / R.Lx, 180 / R.Ly), cx = W / 2, cy = 118;
    const X = (x) => cx + x * k, Y = (y) => cy - y * k;
    let s = '<rect class="zapata" x="' + X(-R.Lx / 2) + '" y="' + Y(R.Ly / 2) + '" width="' + R.Lx * k + '" height="' + R.Ly * k + '"/>';
    s += '<path class="perimetro" d="M' + X(R.Lx / 6) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(R.Ly / 6) + 'L' + X(-R.Lx / 6) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(-R.Ly / 6) + 'Z"/>';
    s += '<line class="eje" x1="' + X(-R.Lx / 2) + '" y1="' + Y(0) + '" x2="' + X(R.Lx / 2) + '" y2="' + Y(0) + '"/>';
    s += '<line class="eje" x1="' + X(0) + '" y1="' + Y(R.Ly / 2) + '" x2="' + X(0) + '" y2="' + Y(-R.Ly / 2) + '"/>';
    s += '<circle class="fig-punto' + (R.serv.okMin ? '' : ' mal') + '" cx="' + X(R.serv.ex) + '" cy="' + Y(R.serv.ey) + '" r="5"/>';
    s += txt(X(R.Lx / 6) + 6, Y(0) - 6, 'L/6', 'etq-area');
    s += txt(cx, 238, 'ex = ' + UN().num(R.serv.ex, 'longitud', null, 4) + ', ey = ' + UN().num(R.serv.ey, 'longitud', null, 4) + ' ' + UN().u('longitud'), 'etq-mini', 'middle');
    return svg(s, 'Núcleo central y excentricidad');
  }

  // Las tres resistencias a punzonamiento (multiplicadas por φ) frente a Vu
  function vc(R) {
    const pz = R.pz, phi = R.inp.materiales.phiV;
    const lista = [['Vc1', pz.Vc1 * phi], ['Vc2', pz.Vc2 * phi], ['Vc3', pz.Vc3 * phi]];
    const max = Math.max(pz.Vu, lista[0][1], lista[1][1], lista[2][1]) * 1.1;
    const x0 = 64, ancho = 270, esc = ancho / max;
    let s = '';
    lista.forEach((l, i) => {
      const y = 30 + i * 52, min = l[1] === pz.phiVc;
      s += '<rect class="fig-barra' + (min ? ' min' : '') + '" x="' + x0 + '" y="' + y + '" width="' + (l[1] * esc).toFixed(1) + '" height="26" rx="4"/>';
      s += txt(x0 - 10, y + 18, 'φ' + l[0], 'fig-etq', 'end') + txt(x0 + l[1] * esc + 6, y + 18, UN().num(l[1], 'fuerza'), 'etq-mini');
    });
    const xu = x0 + pz.Vu * esc;
    s += '<line class="fig-vu' + (pz.ok ? '' : ' mal') + '" x1="' + xu + '" y1="18" x2="' + xu + '" y2="196"/>';
    s += txt(xu, 214, 'Vu = ' + UN().fmt(pz.Vu, 'fuerza'), 'fig-etq', 'middle');
    s += txt(W / 2, 238, 'Gobierna la menor resistencia', 'etq-mini', 'middle');
    return svg(s, 'Resistencias a punzonamiento frente al cortante último');
  }

  // Corte del voladizo con la reacción del suelo y el momento en la cara de la columna
  function voladizo(R, dir) {
    const F = dir === 'X' ? R.fx : R.fy;
    const L = dir === 'X' ? R.Lx : R.Ly, C = dir === 'X' ? R.inp.columna.Cx : R.inp.columna.Cy;
    const k = 300 / L, x0 = (W - L * k) / 2, yZ = 96, hZ = 40;
    const X = (x) => x0 + (x + L / 2) * k;
    let s = '<rect class="zapata" x="' + x0 + '" y="' + yZ + '" width="' + L * k + '" height="' + hZ + '"/>';
    s += '<rect class="columna" x="' + X(-C / 2) + '" y="20" width="' + C * k + '" height="' + (yZ - 20) + '"/>';
    const xa = X(C / 2), xb = X(L / 2);
    s += '<rect class="fig-carga" x="' + xa + '" y="' + (yZ + hZ) + '" width="' + (xb - xa) + '" height="40"/>';
    for (let i = 0; i <= 5; i++) { const x = xa + (xb - xa) * i / 5; s += flecha(x, yZ + hZ + 40, x, yZ + hZ + 4); }
    s += '<line class="seccion" x1="' + xa + '" y1="' + (yZ - 10) + '" x2="' + xa + '" y2="' + (yZ + hZ + 48) + '"/>';
    s += txt((xa + xb) / 2, yZ + hZ + 60, 'σu = ' + UN().fmt(R.ult.su, 'presion'), 'fig-etq', 'middle');
    s += txt((xa + xb) / 2, yZ - 8, 'K' + dir.toLowerCase() + ' = ' + UN().fmt(F.K, 'longitud'), 'etq-area', 'middle');
    s += txt(xa - 6, 40, 'Mu' + dir.toLowerCase() + ' = ' + UN().fmt(F.Mu, 'momento'), 'fig-etq', 'end');
    s += txt(W / 2, 238, 'Voladizo en la dirección ' + dir + ', sección crítica en la cara de la columna', 'etq-mini', 'middle');
    return svg(s, 'Voladizo a flexión en ' + dir);
  }

  // Área cargada A1 dentro de A2 (limitada a la zapata)
  function aplastamiento(R) {
    const ap = R.ap, c = R.inp.columna;
    const k = Math.min(280 / R.Lx, 190 / R.Ly), cx = W / 2, cy = 112;
    const rect = (w, h, cls) => '<rect class="' + cls + '" x="' + (cx - w * k / 2) + '" y="' + (cy - h * k / 2) + '" width="' + w * k + '" height="' + h * k + '"/>';
    let s = rect(R.Lx, R.Ly, 'zapata');
    s += rect(Math.min(ap.a2x, R.Lx), Math.min(ap.a2y, R.Ly), 'perimetro');
    s += rect(c.Cx, c.Cy, 'columna');
    s += txt(cx, cy + 4, 'A1', 'fig-etq', 'middle');
    s += txt(cx - Math.min(ap.a2x, R.Lx) * k / 2 + 8, cy - Math.min(ap.a2y, R.Ly) * k / 2 + 16, 'A2', 'etq-area');
    s += txt(cx, 238, 'K = √(A2/A1) = ' + ap.raiz.toFixed(2) + (ap.raiz > 2 ? ', se limita a 2' : ''), 'etq-mini', 'middle');
    return svg(s, 'Áreas A1 y A2 para el aplastamiento');
  }

  // Prisma de presiones en perspectiva: altura de cada esquina proporcional a σ
  function prisma(R) {
    const sv = R.serv, Lx = R.Lx, Ly = R.Ly;
    const k = 150 / Math.max(Lx, Ly), c30 = Math.cos(Math.PI / 6), s30 = 0.5, hMax = 80;
    const P = (x, y, z) => [W / 2 + (x - y) * c30 * k, 150 + (x + y) * s30 * k * 0.9 - z];
    const pt = (q) => q[0].toFixed(1) + ',' + q[1].toFixed(1);
    const esq = [[1, Lx / 2, Ly / 2], [2, Lx / 2, -Ly / 2], [3, -Lx / 2, -Ly / 2], [4, -Lx / 2, Ly / 2]];
    // Alturas exageradas para que se note la diferencia entre esquinas (los valores reales van en las etiquetas)
    const rango = sv.smax - sv.smin;
    const z = (i) => (rango > 1e-9 ? 26 + (hMax - 26) * (sv['s' + i] - sv.smin) / rango : hMax * 0.6);
    let s = '<polygon class="zapata" points="' + esq.map(([, x, y]) => pt(P(x, y, 0))).join(' ') + '"/>';
    s += '<polygon class="presion-top" points="' + esq.map(([i, x, y]) => pt(P(x, y, z(i)))).join(' ') + '"/>';
    esq.forEach(([i, x, y]) => {
      const a = P(x, y, 0), b = P(x, y, z(i));
      s += '<g class="prisma-esq esquina"><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/><circle cx="' + b[0] + '" cy="' + b[1] + '" r="3"/>' +
        txt(b[0] + (x > 0 ? 6 : -6), b[1] - 6, 'σ' + i + ' ' + UN().num(sv['s' + i], 'presion'), 'fig-etq', x > 0 ? 'start' : 'end') + '</g>';
    });
    s += txt(W / 2, 238, 'Prisma de presiones de servicio, alturas exageradas (' + UN().u('presion') + ')', 'etq-mini', 'middle');
    return svg(s, 'Prisma de presiones en las esquinas');
  }

  // Corte con la sección crítica a cortante en una dirección (a d de la cara de la columna)
  function seccion(R, dir) {
    const enX = dir !== 'Y', L = enX ? R.Lx : R.Ly, C = enX ? R.inp.columna.Cx : R.inp.columna.Cy, h = R.h, d = R.d;
    const k = 300 / L, x0 = (W - L * k) / 2, yZ = 96, hz = Math.min(50, Math.max(30, h * k));
    const X = (x) => x0 + (x + L / 2) * k;
    const xs = X(C / 2 + d), xb = X(L / 2);
    let s = '<rect class="zapata" x="' + x0 + '" y="' + yZ + '" width="' + L * k + '" height="' + hz + '"/>';
    s += '<rect class="columna" x="' + X(-C / 2) + '" y="40" width="' + C * k + '" height="' + (yZ - 40) + '"/>';
    if (xb > xs) {
      s += '<rect class="area fig-carga" x="' + xs + '" y="' + (yZ + hz) + '" width="' + (xb - xs) + '" height="34"/>';
      for (let i = 0; i <= 4; i++) { const x = xs + (xb - xs) * i / 4; s += flecha(x, yZ + hz + 34, x, yZ + hz + 4); }
    }
    s += '<line class="seccion" x1="' + xs + '" y1="' + (yZ - 14) + '" x2="' + xs + '" y2="' + (yZ + hz + 44) + '"/>';
    s += '<line class="fig-flecha" x1="' + X(C / 2) + '" y1="' + (yZ - 8) + '" x2="' + xs + '" y2="' + (yZ - 8) + '"/>' + txt((X(C / 2) + xs) / 2, yZ - 13, 'd', 'etq-area', 'middle');
    s += txt((xs + xb) / 2, yZ + hz + 52, 'Vu' + dir.toLowerCase() + ' = ' + UN().fmt(enX ? R.cu.x.Vu : R.cu.y.Vu, 'fuerza'), 'fig-etq', 'middle');
    s += txt(W / 2, 238, 'Sección crítica a cortante en la dirección ' + dir, 'etq-mini', 'middle');
    return svg(s, 'Sección crítica a cortante en ' + dir);
  }

  // Voladizo con el diagrama de momento (parábola: máximo en la cara de la columna, cero en el borde)
  function momento(R, dir) {
    const F = dir === 'X' ? R.fx : R.fy, L = dir === 'X' ? R.Lx : R.Ly, C = dir === 'X' ? R.inp.columna.Cx : R.inp.columna.Cy;
    const k = 300 / L, x0 = (W - L * k) / 2, yZ = 70, hz = 30;
    const X = (x) => x0 + (x + L / 2) * k;
    const xa = X(C / 2), xb = X(L / 2), base = yZ + hz + 18, prof = 70;
    let s = '<rect class="zapata" x="' + x0 + '" y="' + yZ + '" width="' + L * k + '" height="' + hz + '"/>';
    s += '<rect class="columna" x="' + X(-C / 2) + '" y="16" width="' + C * k + '" height="' + (yZ - 16) + '"/>';
    let d = 'M' + xa + ' ' + base;
    for (let i = 0; i <= 20; i++) { const f = i / 20, x = xa + (xb - xa) * f; d += 'L' + x.toFixed(1) + ' ' + (base + prof * Math.pow(1 - f, 2)).toFixed(1); }
    s += '<path class="diagrama" d="' + d + 'L' + xb + ' ' + base + 'Z"/>';
    s += '<line class="seccion" x1="' + xa + '" y1="' + (yZ - 8) + '" x2="' + xa + '" y2="' + (base + prof + 8) + '"/>';
    s += txt(xa + 8, base + prof + 2, 'Mu' + dir.toLowerCase() + ' = ' + UN().fmt(F.Mu, 'momento'), 'fig-etq');
    s += txt(W / 2, 238, 'Diagrama de momento del voladizo en ' + dir, 'etq-mini', 'middle');
    return svg(s, 'Diagrama de momento en ' + dir);
  }

  // Corte de la pirámide 1:2 que define A2 bajo la columna
  function piramide(R) {
    const ap = R.ap, Lx = R.Lx, Cx = R.inp.columna.Cx, h = R.h;
    const k = 300 / Lx, x0 = (W - Lx * k) / 2, yZ = 90, hz = Math.max(40, h * k);
    const X = (x) => x0 + (x + Lx / 2) * k;
    const a2 = Math.min(ap.a2x, Lx) / 2;
    let s = '<rect class="zapata" x="' + x0 + '" y="' + yZ + '" width="' + Lx * k + '" height="' + hz + '"/>';
    s += '<rect class="columna" x="' + X(-Cx / 2) + '" y="20" width="' + Cx * k + '" height="' + (yZ - 20) + '"/>';
    s += '<g class="piramide perimetro"><path d="M' + X(-Cx / 2) + ' ' + yZ + 'L' + X(-a2) + ' ' + (yZ + hz) + 'H' + X(a2) + 'L' + X(Cx / 2) + ' ' + yZ + '"/></g>';
    s += txt(X(0), yZ + hz + 18, 'A2 (base de la pirámide 1:2)', 'etq-area', 'middle');
    s += txt(X(0), yZ - 14, 'A1', 'fig-etq', 'middle');
    s += txt(W / 2, 238, 'K = min(√(A2/A1), 2) = ' + ap.K.toFixed(2), 'etq-mini', 'middle');
    return svg(s, 'Pirámide de aplastamiento');
  }

  global.Figuras = { cargas, nucleo, vc, voladizo, aplastamiento, prisma, seccion, momento, piramide };
})(window);

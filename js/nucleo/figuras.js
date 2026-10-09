/* Figuras de la memoria de la zapata aislada, en dibujo técnico (js/nucleo/svg-tecnico.js): son las del PDF y el
 * respaldo del mini-3D. Van a escala con las medidas del proyecto, en una tinta y gris, con achurados, cotas y
 * fuerzas en el sentido de su signo. Las clases zapata, columna, perimetro, seccion, area, fig-carga, diagrama,
 * esquina, cota ld y fig-flecha son las que liga cada ecuación de la diapositiva (js/nucleo/diapositivas.js).
 */
(function (global) {
  'use strict';
  const T = () => global.SvgTec;
  const UN = () => global.Unidades;
  const W = 400, H = 280, PIE = 270;
  const fmt = (v, mag) => UN().fmt(v, mag);
  const num = (v, mag, dec) => UN().num(v, mag, null, dec);
  const signo = (v) => (Math.abs(v) < 1e-9 ? 0 : Math.sign(v));
  const GRIS_CARGA = '#e2e2e2';

  // Alzado a escala de la zapata con su columna en una dirección: coordenadas y dibujo base
  function alzado(R, dir, op) {
    const o = op || {};
    const enX = dir !== 'Y', L = enX ? R.Lx : R.Ly, C = enX ? R.inp.columna.Cx : R.inp.columna.Cy;
    const k = Math.min((o.ancho || 250) / L, 150 / R.h);
    const yBot = o.yBot || 190, hz = Math.max(R.h * k, 16), yTop = yBot - hz;
    const x0 = (W - L * k) / 2, X = (x) => x0 + (x + L / 2) * k;
    const colTop = o.colTop || 60;
    const base = T().concreto(x0, yTop, L * k, hz) + T().columna(X(-C / 2), colTop, C * k, yTop - colTop) +
      T().eje(X(0), colTop - 14, X(0), yBot + 10);
    return { enX, L, C, k, yBot, yTop, hz, x0, X, colTop, base };
  }

  // Acero inferior en el corte: barras en la dirección del corte (línea con ganchos) y las de la otra dirección (círculos)
  function aceroCorte(R, a) {
    const ref = R.ref;
    if (!ref || ref.tipo !== 'barras' || !ref.selX) return '';
    const propia = a.enX ? ref.selX : ref.selY, otra = a.enX ? ref.selY : ref.selX;
    const r = R.inp.zapata.r * a.k, y = a.yBot - Math.max(r, 5), xa = a.x0 + Math.max(r, 5), xb = a.x0 + a.L * a.k - Math.max(r, 5);
    let s = '<path class="barra-alz" d="M' + T().f1(xa) + ' ' + T().f1(y - 14) + 'V' + T().f1(y) + 'H' + T().f1(xb) + 'V' + T().f1(y - 14) + '" fill="none" stroke="' + T().TINTA + '" stroke-width="2.2"/>';
    const n = Math.min(40, Math.max(2, Math.round(a.L / otra.s)));
    for (let i = 0; i < n; i++) s += T().barra(xa + 3 + (xb - xa - 6) * i / (n - 1), y - 4, 2.2);
    return s + T().txt(xb - 4, y - 18, (a.enX ? ref.resumenX : ref.resumenY), { anc: 'end', tam: 10, fondo: true });
  }

  // 1. Columna sobre la zapata con P y los dos momentos (servicio o mayorados)
  function cargas(R, ult) {
    const t = T(), c = ult ? R.ult : R.serv;
    const a = alzado(R, 'X', { colTop: 66, yBot: 200, ancho: 220 });
    const cx = a.X(0);
    let s = t.suelo(a.x0 - 24, a.x0 + a.L * a.k + 24, a.yBot) + a.base;
    s += t.flecha(cx, 18, cx, a.colTop - 6, { grosor: 2 }) + t.txt(cx + 10, 34, ['P', ult ? 'u' : 's', ' = ' + fmt(c.P, 'fuerza')]);
    const mom = (M, x, nombre) => (signo(M) ? t.momento(x, 88, 16, signo(M)) + t.txt(x, 124, ['M', nombre, ' = ' + fmt(Math.abs(M), 'momento')], { anc: 'middle', tam: 11, fondo: true }) : '');
    s += mom(c.Mx, cx - a.C * a.k / 2 - 70, 'x') + mom(c.My, cx + a.C * a.k / 2 + 70, 'y');
    s += t.cota(a.x0, a.yBot + 24, a.x0 + a.L * a.k, a.yBot + 24, ['L', 'x', ' = ' + fmt(R.Lx, 'longitud')]);
    s += t.cota(a.x0 + a.L * a.k + 16, a.yTop, a.x0 + a.L * a.k + 16, a.yBot, 'h = ' + fmt(R.h, 'longitud'));
    s += t.pie(W, PIE, ult ? 'Cargas mayoradas (' + R.ult.gob.id + ')' : 'Cargas de servicio');
    return t.svg(W, H, s, 'Cargas sobre la columna');
  }

  // 2. Planta con el núcleo central (rombo de L/6) y el punto donde actúa la resultante
  function nucleo(R) {
    const t = T(), c = R.inp.columna;
    const k = Math.min(270 / R.Lx, 170 / R.Ly), cx = W / 2 + 10, cy = 128;
    const X = (x) => cx + x * k, Y = (y) => cy - y * k;
    let s = '<rect class="zapata" x="' + X(-R.Lx / 2) + '" y="' + Y(R.Ly / 2) + '" width="' + R.Lx * k + '" height="' + R.Ly * k + '" fill="#f7f6f3" stroke="' + t.TINTA + '" stroke-width="1.6"/>';
    s += t.eje(X(-R.Lx / 2) - 10, Y(0), X(R.Lx / 2) + 10, Y(0)) + t.eje(X(0), Y(R.Ly / 2) - 10, X(0), Y(-R.Ly / 2) + 10);
    s += '<path class="perimetro" d="M' + X(R.Lx / 6) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(R.Ly / 6) + 'L' + X(-R.Lx / 6) + ' ' + Y(0) + 'L' + X(0) + ' ' + Y(-R.Ly / 6) + 'Z" fill="#e9e9e9" stroke="' + t.TINTA + '" stroke-width="1.6" stroke-dasharray="6 3"/>';
    s += '<rect class="columna" x="' + X(-c.Cx / 2) + '" y="' + Y(c.Cy / 2) + '" width="' + c.Cx * k + '" height="' + c.Cy * k + '" fill="url(#st-columna)" stroke="' + t.TINTA + '" stroke-width="1.2" opacity="0.55"/>';
    s += '<circle class="fig-punto" cx="' + X(R.serv.ex) + '" cy="' + Y(R.serv.ey) + '" r="4.5" fill="' + (R.serv.okMin ? t.TINTA : '#a3392c') + '"/>';
    s += t.txt(X(R.Lx / 6) + 6, Y(0) - 6, 'L/6', { tam: 11 });
    s += t.cota(X(-R.Lx / 2), Y(R.Ly / 2) - 16, X(R.Lx / 2), Y(R.Ly / 2) - 16, ['L', 'x', ' = ' + fmt(R.Lx, 'longitud')], { arriba: true });
    s += t.cota(X(-R.Lx / 2) - 16, Y(-R.Ly / 2), X(-R.Lx / 2) - 16, Y(R.Ly / 2), ['L', 'y', ' = ' + fmt(R.Ly, 'longitud')]);
    s += t.pie(W, PIE, 'Resultante en e = (' + num(R.serv.ex, 'longitud', 3) + ', ' + num(R.serv.ey, 'longitud', 3) + ') ' + UN().u('longitud') + (R.serv.okMin ? ', dentro del núcleo central' : ', fuera del núcleo central'));
    return t.svg(W, H, s, 'Núcleo central y excentricidad');
  }

  // 3. Las tres resistencias a punzonamiento (multiplicadas por φ) frente a Vu
  function vc(R) {
    const t = T(), pz = R.pz, phi = R.inp.materiales.phiV;
    const lista = [['c1', pz.Vc1 * phi], ['c2', pz.Vc2 * phi], ['c3', pz.Vc3 * phi]];
    const max = Math.max(pz.Vu, ...lista.map((l) => l[1])) * 1.12;
    const x0 = 78, ancho = 270, esc = ancho / max;
    let s = '<line x1="' + x0 + '" y1="22" x2="' + x0 + '" y2="200" stroke="' + t.TINTA + '" stroke-width="1.2"/>';
    lista.forEach((l, i) => {
      const y = 34 + i * 54, min = Math.abs(l[1] - pz.phiVc) < 1e-6;
      s += '<rect class="fig-barra' + (min ? ' min' : '') + '" x="' + x0 + '" y="' + y + '" width="' + t.f1(l[1] * esc) + '" height="28" fill="' + (min ? '#4a4a4a' : 'url(#st-concreto)') + '" stroke="' + t.TINTA + '" stroke-width="1"/>';
      s += t.txt(x0 - 10, y + 19, ['φV', l[0], ''], { anc: 'end' }) + t.txt(x0 + l[1] * esc + 6, y + 19, num(l[1], 'fuerza'), { tam: 11 });
    });
    const xu = x0 + pz.Vu * esc;
    s += '<line class="fig-vu" x1="' + t.f1(xu) + '" y1="22" x2="' + t.f1(xu) + '" y2="204" stroke="' + (pz.ok ? t.TINTA : '#a3392c') + '" stroke-width="2" stroke-dasharray="6 4"/>';
    s += t.txt(xu, 222, ['V', 'u', ' = ' + fmt(pz.Vu, 'fuerza')], { anc: 'middle', fondo: true });
    s += t.pie(W, PIE, 'Gobierna la menor: φVc = ' + fmt(pz.phiVc, 'fuerza'));
    return t.svg(W, H, s, 'Resistencias a punzonamiento frente al cortante último');
  }

  // 4. Prisma de presiones de servicio en perspectiva: la altura en cada esquina es proporcional a σ
  function prisma(R) {
    const t = T(), sv = R.serv, Lx = R.Lx, Ly = R.Ly;
    const k = 150 / Math.max(Lx, Ly), c30 = Math.cos(Math.PI / 6), hMax = 80, esp = 14;
    const P = (x, y, z) => [W / 2 + (x - y) * c30 * k, 150 + (x + y) * 0.5 * k * 0.9 - z];
    const pt = (q) => q[0].toFixed(1) + ',' + q[1].toFixed(1);
    const esq = [[1, Lx / 2, Ly / 2], [2, Lx / 2, -Ly / 2], [3, -Lx / 2, -Ly / 2], [4, -Lx / 2, Ly / 2]];
    const rango = sv.smax - sv.smin; // alturas exageradas para que se note la diferencia (los valores van en las etiquetas)
    const z = (i) => (rango > 1e-9 ? 26 + (hMax - 26) * (sv['s' + i] - sv.smin) / rango : hMax * 0.6);
    // losa de la zapata: cara superior y dos caras laterales con su espesor
    const cara = (pts, extra) => '<polygon points="' + pts.map(pt).join(' ') + '" ' + extra + '/>';
    let s = cara([P(Lx / 2, Ly / 2, 0), P(Lx / 2, -Ly / 2, 0), P(Lx / 2, -Ly / 2, -esp), P(Lx / 2, Ly / 2, -esp)], 'fill="url(#st-concreto)" stroke="' + t.TINTA + '" stroke-width="1.2"');
    s += cara([P(Lx / 2, Ly / 2, 0), P(-Lx / 2, Ly / 2, 0), P(-Lx / 2, Ly / 2, -esp), P(Lx / 2, Ly / 2, -esp)], 'fill="url(#st-concreto)" stroke="' + t.TINTA + '" stroke-width="1.2"');
    s += cara(esq.map(([, x, y]) => P(x, y, 0)), 'class="zapata" fill="#f7f6f3" stroke="' + t.TINTA + '" stroke-width="1.4"');
    s += cara(esq.map(([i, x, y]) => P(x, y, z(i))), 'class="presion-top" fill="#d9d9d9" fill-opacity="0.7" stroke="' + t.TINTA + '" stroke-width="1.4"');
    esq.forEach(([i, x, y]) => {
      const a = P(x, y, 0), b = P(x, y, z(i));
      s += '<g class="prisma-esq esquina"><line x1="' + t.f1(a[0]) + '" y1="' + t.f1(a[1]) + '" x2="' + t.f1(b[0]) + '" y2="' + t.f1(b[1]) + '" stroke="' + t.TINTA + '" stroke-width="1" stroke-dasharray="3 2"/>' +
        '<circle cx="' + t.f1(b[0]) + '" cy="' + t.f1(b[1]) + '" r="3" fill="' + t.TINTA + '"/>' +
        t.txt(b[0] + (x > 0 ? 7 : -7), b[1] - 7, ['σ', String(i), ' = ' + num(sv['s' + i], 'presion')], { anc: x > 0 ? 'start' : 'end', tam: 11, fondo: true }) + '</g>';
    });
    s += t.pie(W, PIE, 'Presiones de servicio en las esquinas (' + UN().u('presion') + '), alturas exageradas');
    return t.svg(W, H, s, 'Prisma de presiones en las esquinas');
  }

  // 5. Corte del voladizo con la reacción del suelo y el momento en la cara de la columna
  function voladizo(R, dir) {
    const t = T(), F = dir === 'X' ? R.fx : R.fy, d = dir.toLowerCase();
    const a = alzado(R, dir, { colTop: 52, yBot: 168 });
    const xa = a.X(a.C / 2), xb = a.X(a.L / 2);
    let s = a.base + aceroCorte(R, a);
    s += '<rect class="fig-carga" x="' + t.f1(xa) + '" y="' + (a.yBot + 6) + '" width="' + t.f1(xb - xa) + '" height="36" fill="' + GRIS_CARGA + '" stroke="' + t.TINTA + '" stroke-width="1"/>';
    for (let i = 0; i <= 5; i++) { const x = xa + (xb - xa) * i / 5; s += t.flecha(x, a.yBot + 42, x, a.yBot + 8, { grosor: 1.2, punta: 6 }); }
    s += '<line class="seccion" x1="' + t.f1(xa) + '" y1="' + (a.yTop - 26) + '" x2="' + t.f1(xa) + '" y2="' + (a.yBot + 50) + '" stroke="' + t.TINTA + '" stroke-width="1.4" stroke-dasharray="10 3 2 3"/>';
    s += t.txt((xa + xb) / 2, a.yBot + 60, ['σ', 'u', ' = ' + fmt(R.ult.su, 'presion')], { anc: 'middle' });
    s += t.cota(xa, a.yTop - 14, xb, a.yTop - 14, ['K', d, ' = ' + fmt(F.K, 'longitud')], { arriba: true });
    s += t.momento(xa + 16, a.yTop - 52, 11, -1) + t.txt(xa + 34, a.yTop - 48, ['M', 'u' + d, ' = ' + fmt(F.Mu, 'momento')], { tam: 11, fondo: true });
    s += t.pie(W, PIE, 'Voladizo en ' + dir + ': la sección crítica está en la cara de la columna');
    return t.svg(W, H, s, 'Voladizo a flexión en ' + dir);
  }

  // 6. Sección crítica a cortante en una dirección, a d de la cara de la columna
  function seccion(R, dir) {
    const t = T(), d = dir.toLowerCase(), enX = dir !== 'Y';
    const a = alzado(R, dir, { colTop: 52, yBot: 168 });
    const xc = a.X(a.C / 2), xs = a.X(a.C / 2 + R.d), xb = a.X(a.L / 2);
    let s = a.base + aceroCorte(R, a);
    if (xb > xs) {
      s += '<rect class="area fig-carga" x="' + t.f1(xs) + '" y="' + (a.yBot + 6) + '" width="' + t.f1(xb - xs) + '" height="34" fill="' + GRIS_CARGA + '" stroke="' + t.TINTA + '" stroke-width="1"/>';
      for (let i = 0; i <= 4; i++) { const x = xs + (xb - xs) * i / 4; s += t.flecha(x, a.yBot + 40, x, a.yBot + 8, { grosor: 1.2, punta: 6 }); }
    }
    s += '<line class="seccion" x1="' + t.f1(xs) + '" y1="' + (a.yTop - 26) + '" x2="' + t.f1(xs) + '" y2="' + (a.yBot + 48) + '" stroke="' + t.TINTA + '" stroke-width="1.4" stroke-dasharray="10 3 2 3"/>';
    s += t.cota(xc, a.yTop - 14, xs, a.yTop - 14, 'd = ' + fmt(R.d, 'longitud'), { arriba: true });
    s += t.txt((xs + xb) / 2, a.yBot + 58, ['V', 'u' + d, ' = ' + fmt(enX ? R.cu.x.Vu : R.cu.y.Vu, 'fuerza')], { anc: 'middle' });
    s += t.pie(W, PIE, 'Sección crítica a cortante en ' + dir + ', a d de la cara de la columna');
    return t.svg(W, H, s, 'Sección crítica a cortante en ' + dir);
  }

  // 7. Voladizo con el diagrama de momento (parábola: máximo en la cara de la columna, cero en el borde)
  function momento(R, dir) {
    const t = T(), F = dir === 'X' ? R.fx : R.fy, d = dir.toLowerCase();
    const a = alzado(R, dir, { colTop: 30, yBot: 118, ancho: 260 });
    const xa = a.X(a.C / 2), xb = a.X(a.L / 2), base = a.yBot + 18, prof = 92;
    let s = a.base;
    s += '<line x1="' + t.f1(a.x0) + '" y1="' + base + '" x2="' + t.f1(a.x0 + a.L * a.k) + '" y2="' + base + '" stroke="' + t.TINTA + '" stroke-width="1"/>';
    let p = 'M' + t.f1(xa) + ' ' + base;
    for (let i = 0; i <= 24; i++) { const f = i / 24, x = xa + (xb - xa) * f; p += 'L' + t.f1(x) + ' ' + t.f1(base + prof * Math.pow(1 - f, 2)); }
    s += '<path class="diagrama" d="' + p + 'L' + t.f1(xb) + ' ' + base + 'Z" fill="url(#st-suelo)" stroke="' + t.TINTA + '" stroke-width="1.8"/>';
    s += '<line class="seccion" x1="' + t.f1(xa) + '" y1="' + (a.yTop - 10) + '" x2="' + t.f1(xa) + '" y2="' + (base + prof + 8) + '" stroke="' + t.TINTA + '" stroke-width="1.4" stroke-dasharray="10 3 2 3"/>';
    s += t.txt(xa + 10, base + prof - 2, ['M', 'u' + d, ' = ' + fmt(F.Mu, 'momento')], { fondo: true });
    s += t.pie(W, PIE, 'Diagrama de momento del voladizo en ' + dir + ' (tracción abajo)');
    return t.svg(W, H, s, 'Diagrama de momento en ' + dir);
  }

  // 8. Planta con el área cargada A1 dentro de A2 (limitada a la zapata)
  function aplastamiento(R) {
    const t = T(), ap = R.ap, c = R.inp.columna;
    const k = Math.min(280 / R.Lx, 180 / R.Ly), cx = W / 2, cy = 124;
    const rect = (w, h, extra) => '<rect x="' + t.f1(cx - w * k / 2) + '" y="' + t.f1(cy - h * k / 2) + '" width="' + t.f1(w * k) + '" height="' + t.f1(h * k) + '" ' + extra + '/>';
    const a2x = Math.min(ap.a2x, R.Lx), a2y = Math.min(ap.a2y, R.Ly);
    let s = rect(R.Lx, R.Ly, 'class="zapata" fill="#f7f6f3" stroke="' + t.TINTA + '" stroke-width="1.6"');
    s += rect(a2x, a2y, 'class="perimetro" fill="url(#st-suelo)" fill-opacity="0.5" stroke="' + t.TINTA + '" stroke-width="1.6" stroke-dasharray="7 4"');
    s += rect(c.Cx, c.Cy, 'class="columna" fill="url(#st-columna)" stroke="' + t.TINTA + '" stroke-width="1.6"');
    s += t.txt(cx, cy + 4, ['A', '1', ''], { anc: 'middle', peso: 600, fondo: true });
    s += t.txt(cx - a2x * k / 2 + 8, cy - a2y * k / 2 + 16, ['A', '2', ''], { peso: 600, fondo: true });
    s += t.cota(cx - R.Lx * k / 2, cy - R.Ly * k / 2 - 14, cx + R.Lx * k / 2, cy - R.Ly * k / 2 - 14, ['L', 'x', ' = ' + fmt(R.Lx, 'longitud')], { arriba: true });
    s += t.pie(W, PIE, 'K = √(A2/A1) = ' + ap.raiz.toFixed(2) + (ap.raiz > 2 ? ', se limita a 2' : ''));
    return t.svg(W, H, s, 'Áreas A1 y A2 para el aplastamiento');
  }

  // 9. Corte de la pirámide 1:2 que define A2 bajo la columna
  function piramide(R) {
    const t = T(), ap = R.ap;
    const a = alzado(R, 'X', { colTop: 40, yBot: 200, ancho: 270 });
    const a2 = Math.min(ap.a2x, R.Lx) / 2, xc0 = a.X(-a.C / 2), xc1 = a.X(a.C / 2);
    let s = t.suelo(a.x0 - 20, a.x0 + a.L * a.k + 20, a.yBot) + a.base;
    s += '<g class="piramide perimetro"><path d="M' + t.f1(xc0) + ' ' + t.f1(a.yTop) + 'L' + t.f1(a.X(-a2)) + ' ' + t.f1(a.yBot) + 'H' + t.f1(a.X(a2)) + 'L' + t.f1(xc1) + ' ' + t.f1(a.yTop) + '" fill="#d9d9d9" fill-opacity="0.6" stroke="' + t.TINTA + '" stroke-width="1.6" stroke-dasharray="7 4"/></g>';
    // pendiente 1:2 dibujada junto al borde derecho de la pirámide
    s += t.txt((xc0 + a.X(-a2)) / 2 - 8, (a.yTop + a.yBot) / 2 + 4, '1 : 2', { anc: 'end', tam: 10.5, fondo: true });
    s += t.txt(a.X(0), a.yTop - 8, ['A', '1', ''], { anc: 'middle', peso: 600, fondo: true });
    s += t.cota(a.X(-a2), a.yBot + 22, a.X(a2), a.yBot + 22, ['A', '2', ': ' + fmt(2 * a2, 'longitud') + ' en x']);
    s += t.pie(W, PIE, 'K = min(√(A2/A1), 2) = ' + ap.K.toFixed(2));
    return t.svg(W, H, s, 'Pirámide de aplastamiento');
  }

  global.Figuras = { cargas, nucleo, vc, voladizo, aplastamiento, prisma, seccion, momento, piramide };
})(window);

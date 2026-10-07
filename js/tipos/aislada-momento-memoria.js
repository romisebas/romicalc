/* Memoria de cálculo de la zapata aislada con momento (v3.3), en LaTeX (KaTeX).
 * Se organiza en capítulos y cada capítulo en diapositivas de una sola idea:
 * un texto corto, de una a cuatro ecuaciones y una figura. Todo se escribe en el sistema
 * de unidades del cálculo (curso, SI o inglés), con los coeficientes de la norma de ese sistema.
 * Para el PDF, cada capítulo también trae la lista plana de elementos (items).
 */
(function (global) {
  'use strict';

  const n = (x, d = 3) => (x == null || !isFinite(x) ? '\\text{n/a}' : Number(x).toFixed(d));

  // Ecuación alineada: símbolo, sustitución y resultado enmarcado.
  function eq(etq, lhs, simb, sust, res, u, extra) {
    const lineas = [];
    if (simb) lineas.push(lhs + ' &= ' + simb);
    if (sust) lineas.push((simb ? '' : lhs + ' ') + '&= ' + sust);
    lineas.push((simb || sust ? '' : lhs + ' ') + '&= \\boxed{' + res + u + '}');
    return Object.assign({ t: 'eq', etq, tex: '\\begin{aligned}' + lineas.join(' \\\\ ') + '\\end{aligned}', liga: liga(lhs) }, extra || {});
  }

  // Qué parte de la figura representa cada símbolo (para resaltarla al pasar el mouse)
  const LIGAS = [
    [/^b_o/, 'perimetro'], [/^A_\{2D\}|^V_u$/, 'area'], [/^A_[xy]$|^V_\{u[xy]\}/, 'area'], [/^\\phi V_\{c[xy]\}/, 'seccion'],
    [/^K_[xy]|^A_\{[xy]f\}|^F_[xy]/, 'voladizo'], [/^M_\{u[xy]\}|^R_\{n/, 'diagrama'], [/^A_1$|^\\phi P_\{nb1\}|^\\beta/, 'columna'],
    [/^A_2$|^K$|^\\phi P_\{nb2\}/, 'perimetro'], [/^\\sigma_\{[1-4]/, 'esquina'], [/^I_|^A$|^A_z/, 'zapata'], [/^l_\{dc/, 'ld'],
    [/^P_s|^M_\{[xy]s\}|^P_u/, 'carga'],
  ];
  function liga(lhs) { const m = LIGAS.find(([re]) => re.test(lhs)); return m ? m[1] : null; }
  const ver = (etq, tex, ok) => ({ t: 'ver', etq, tex, ok });
  const nota = (tipo, html) => ({ t: 'nota', tipo, html });
  const le = (ok) => (ok ? '\\le' : '>');
  const ge = (ok) => (ok ? '\\ge' : '<');
  const kTx = (k) => (k === 1 ? '' : String(k));

  function generar(R) {
    const I = R.inp, c = I.columna, m = I.materiales;
    const s = R.serv, u = R.ult, pz = R.pz, cu = R.cu, fx = R.fx, fy = R.fy, ap = R.ap, ld = R.ld, rf = R.ref;
    const sis = I.unid || 'curso';
    const UN = global.Unidades;
    const C = UN.coef(sis);
    const v = (x, mag, d) => UN.num(x, mag, sis, d);
    const U = (mag) => UN.tex(mag, sis);
    const en = sis === 'ingles';
    // Conversión del momento a fuerza × longitud corta para R_n
    const convM = { curso: '10^{5}', si: '10^{6}', ingles: '12\\,000' }[sis];
    const convMv = { curso: 1e5, si: 1e6, ingles: 12000 }[sis];
    const uCorto = U('corto'), uEsf = U('esfuerzo');
    const ldU = en ? '\\,\\text{in}' : '\\,\\text{mm}';
    const ldV = (x) => (en ? x / 25.4 : x);
    const unidTxt = { curso: "f'c en kgf/cm², b y d en cm; el resultado sale en kgf y se divide entre 1000 para tonf",
      si: "f'c en MPa, b y d en mm; el resultado sale en N y se divide entre 1000 para kN",
      ingles: "f'c en psi, b y d en pulgadas; el resultado sale en lb y se divide entre 1000 para kip" }[sis];

    const caps = [];
    const capitulo = (id, titulo, ref, ok) => { const cap = { id, titulo, ref, ok, diapos: [] }; caps.push(cap); return cap; };
    const diapo = (cap, titulo, texto, items, fig) => cap.diapos.push({ titulo, texto, items: items.filter(Boolean), fig });

    // ---------------------------------------------------------------- 1. Esfuerzos de servicio
    const c1 = capitulo('serv', 'Área de la zapata y esfuerzos de servicio', 'NSR-10 C.15.2', R.chequeos[0].ok);
    diapo(c1, 'Cargas de servicio',
      'El área de la zapata se determina con las cargas de servicio, sin mayorar (NSR-10 C.15.2.2). Se suman la carga muerta y la viva que baja por la columna.',
      [s.W > 0 ? eq('Peso propio de zapata y suelo', 'W', 'L_x L_y\\left[h\\,\\gamma_c + (D_f - h)\\,\\gamma_s\\right]',
        v(R.Lx, 'longitud') + '\\cdot' + v(R.Ly, 'longitud') + '\\left[' + v(R.h, 'longitud', 3) + '\\cdot' + v(I.suelo.gc, 'peso') + ' + ' + v(Math.max(I.suelo.Df - R.h, 0), 'longitud', 3) + '\\cdot' + v(I.suelo.gs, 'peso') + '\\right]', v(s.W, 'fuerza'), U('fuerza')) : null,
      eq('Carga axial de servicio', 'P_s', 'P_{PP+CM} + P_{CV}' + (s.W > 0 ? ' + W' : ''),
        v(Math.abs(I.cargas.D.P), 'fuerza') + ' + ' + v(Math.abs(I.cargas.L.P), 'fuerza') + (s.W > 0 ? ' + ' + v(s.W, 'fuerza') : ''), v(s.P, 'fuerza'), U('fuerza')),
      eq('Momento en X', 'M_{xs}', 'M_{x,PP+CM} + M_{x,CV}', v(Math.abs(I.cargas.D.Mx), 'momento') + ' + ' + v(Math.abs(I.cargas.L.Mx), 'momento'), v(s.Mx, 'momento'), U('momento')),
      eq('Momento en Y', 'M_{ys}', 'M_{y,PP+CM} + M_{y,CV}', v(Math.abs(I.cargas.D.My), 'momento') + ' + ' + v(Math.abs(I.cargas.L.My), 'momento'), v(s.My, 'momento'), U('momento'))],
      { tipo: 'cargas', ult: false });
    diapo(c1, 'Área requerida y área adoptada',
      'Con solo la carga axial se obtiene un área mínima. Como los momentos aumentan la presión en una esquina, se adopta una zapata algo mayor y se revisan las esquinas.',
      [eq('Área requerida por carga axial', 'A_z', '\\dfrac{P_s}{\\sigma_{adm}}', '\\dfrac{' + v(s.P, 'fuerza') + '}{' + v(I.suelo.qadm, 'presion') + '}', v(s.Areq, 'area'), U('area')),
      eq('Área adoptada', 'A', 'L_x\\,L_y', v(R.Lx, 'longitud') + '\\cdot' + v(R.Ly, 'longitud'), v(s.A, 'area'), U('area'))],
      { tipo: 'planta', capa: 'presion' });
    diapo(c1, 'Inercias y excentricidades',
      'La resultante debe caer dentro del núcleo central (un rombo de L/6 desde el centro). Así toda la base queda en compresión.',
      [eq('Inercia respecto a X', 'I_x', '\\dfrac{L_x L_y^{3}}{12}', '\\dfrac{' + v(R.Lx, 'longitud') + '\\cdot' + v(R.Ly, 'longitud') + '^{3}}{12}', v(s.Ix, 'inercia'), U('inercia')),
      eq('Inercia respecto a Y', 'I_y', '\\dfrac{L_y L_x^{3}}{12}', '\\dfrac{' + v(R.Ly, 'longitud') + '\\cdot' + v(R.Lx, 'longitud') + '^{3}}{12}', v(s.Iy, 'inercia'), U('inercia')),
      ver('Núcleo central en X', 'e_x = \\dfrac{M_{ys}}{P_s} = ' + v(s.ex, 'longitud', 4) + U('longitud') + ' \\;' + le(s.ex <= R.Lx / 6) + '\\; \\dfrac{L_x}{6} = ' + v(R.Lx / 6, 'longitud', 3) + U('longitud'), s.ex <= R.Lx / 6),
      ver('Núcleo central en Y', 'e_y = \\dfrac{M_{xs}}{P_s} = ' + v(s.ey, 'longitud', 4) + U('longitud') + ' \\;' + le(s.ey <= R.Ly / 6) + '\\; \\dfrac{L_y}{6} = ' + v(R.Ly / 6, 'longitud', 3) + U('longitud'), s.ey <= R.Ly / 6)],
      { tipo: 'nucleo' });
    const sig = (i, sx, sy) => eq('Esquina ' + i, '\\sigma_{' + i + '}', null,
      '\\dfrac{' + v(s.P, 'fuerza') + '}{' + v(s.A, 'area') + '} ' + sx + ' \\dfrac{' + v(s.Mx, 'momento') + '\\cdot' + v(R.Ly / 2, 'longitud', 3) + '}{' + v(s.Ix, 'inercia') + '} ' + sy + ' \\dfrac{' + v(s.My, 'momento') + '\\cdot' + v(R.Lx / 2, 'longitud', 3) + '}{' + v(s.Iy, 'inercia') + '}',
      v(s['s' + i], 'presion'), U('presion'));
    diapo(c1, 'Esfuerzos en las esquinas',
      'La presión es la compresión uniforme más la flexión en cada dirección: σ = P/A ± M<sub>x</sub>(L<sub>y</sub>/2)/I<sub>x</sub> ± M<sub>y</sub>(L<sub>x</sub>/2)/I<sub>y</sub>. σ1 es la esquina de arriba a la derecha y las demás siguen en sentido horario.',
      [sig(1, '+', '+'), sig(2, '-', '+'), sig(3, '-', '-'), sig(4, '+', '-')],
      { tipo: 'prisma' });
    diapo(c1, 'Verificación contra el suelo',
      'Ninguna esquina puede superar el esfuerzo admisible del suelo y ninguna puede quedar en tensión, porque el suelo no la resiste.',
      [ver('Esfuerzo máximo', '\\sigma_{max} = ' + v(s.smax, 'presion') + U('presion') + ' \\;' + le(s.okMax) + '\\; \\sigma_{adm} = ' + v(I.suelo.qadm, 'presion') + U('presion'), s.okMax),
      ver('Sin tensión (caso ' + s.caso + ')', '\\sigma_{min} = ' + v(s.smin, 'presion') + U('presion') + ' \\;' + (s.okMin ? '>' : '\\le') + '\\; 0', s.okMin)],
      { tipo: 'corte', dir: 'X' });

    // ---------------------------------------------------------------- 2. Punzonamiento
    const c2 = capitulo('pz', 'Cortante en dos direcciones', en ? 'ACI 318 22.6' : 'NSR-10 C.11.11', pz.ok);
    diapo(c2, 'Cargas mayoradas',
      'Desde aquí se diseña con cargas mayoradas (NSR-10 B.2.4). Gobierna la combinación que produce el mayor esfuerzo en las esquinas.',
      u.lista.map((cb) => eq('Combinación ' + cb.id, 'P_u', cb.tex.replace('D', 'P_D').replace('L', 'P_L'),
        cb.id === '1.4D' ? '1.4\\cdot' + v(Math.abs(I.cargas.D.P), 'fuerza') : '1.2\\cdot' + v(Math.abs(I.cargas.D.P), 'fuerza') + ' + 1.6\\cdot' + v(Math.abs(I.cargas.L.P), 'fuerza'),
        v(cb.P, 'fuerza'), U('fuerza'), { nota: 'σmax = ' + UN.fmt(cb.su, 'presion', sis) + (cb === u.gob ? ', gobierna' : '') })),
      { tipo: 'cargas', ult: true });
    const sigu = (i, sx, sy) => eq('Esquina ' + i, '\\sigma_{' + i + 'u}', null,
      '\\dfrac{' + v(u.P, 'fuerza') + '}{' + v(u.A, 'area') + '} ' + sx + ' \\dfrac{' + v(u.Mx, 'momento') + '\\cdot' + v(R.Ly / 2, 'longitud', 3) + '}{' + v(u.Ix, 'inercia') + '} ' + sy + ' \\dfrac{' + v(u.My, 'momento') + '\\cdot' + v(R.Lx / 2, 'longitud', 3) + '}{' + v(u.Iy, 'inercia') + '}',
      v(u['s' + i], 'presion'), U('presion'));
    diapo(c2, 'Esfuerzo último de diseño',
      'Siguiendo el método del curso, se diseña con el mayor esfuerzo mayorado de las cuatro esquinas, lo que es conservador.',
      [sigu(1, '+', '+'), sigu(2, '-', '+'), sigu(3, '-', '-'), sigu(4, '+', '-'),
      eq('Esfuerzo de diseño', '\\sigma_u', '\\max(\\sigma_{1u},\\,\\sigma_{2u},\\,\\sigma_{3u},\\,\\sigma_{4u})', null, v(u.su, 'presion'), U('presion'))],
      { tipo: 'planta', capa: 'presion' });
    diapo(c2, 'Perímetro crítico y cortante actuante',
      'La columna tiende a perforar la placa a lo largo de un perímetro ubicado a d/2 de sus caras. El cortante es la reacción del suelo fuera de ese perímetro.',
      [eq('Relación de lados de la columna', '\\beta', '\\dfrac{\\max(C_x, C_y)}{\\min(C_x, C_y)}', '\\dfrac{' + v(Math.max(c.Cx, c.Cy), 'longitud') + '}{' + v(Math.min(c.Cx, c.Cy), 'longitud') + '}', n(pz.beta), ''),
      eq('Perímetro crítico', 'b_o', '2(C_x + d) + 2(C_y + d)', '2(' + v(c.Cx, 'longitud') + ' + ' + v(R.d, 'longitud', 3) + ') + 2(' + v(c.Cy, 'longitud') + ' + ' + v(R.d, 'longitud', 3) + ')', v(pz.bo, 'longitud', 3), U('longitud')),
      eq('Área fuera del perímetro', 'A_{2D}', 'L_x L_y - (C_x + d)(C_y + d)', v(R.Lx, 'longitud') + '\\cdot' + v(R.Ly, 'longitud') + ' - ' + v(c.Cx + R.d, 'longitud', 3) + '\\cdot' + v(c.Cy + R.d, 'longitud', 3), v(pz.A2D, 'area'), U('area')),
      eq('Cortante último', 'V_u', '\\sigma_u\\,A_{2D}', v(u.su, 'presion') + '\\cdot' + v(pz.A2D, 'area'), v(pz.Vu, 'fuerza'), U('fuerza'))],
      { tipo: 'planta', capa: 'punz' });
    const raiz = n(m.lambda, 2) + '\\sqrt{' + v(m.fc, 'esfuerzo') + '}\\,(' + v(pz.bo, 'corto') + ')(' + v(R.d, 'corto') + ')/1000';
    diapo(c2, 'Resistencia del concreto',
      'La resistencia es la menor de tres expresiones, con ' + unidTxt + '.',
      [eq('Ecuación ' + C.ec[0], 'V_{c1}', C.pz1 + '\\left(1 + \\dfrac{2}{\\beta}\\right)\\lambda\\sqrt{f\'_c}\\,b_o\\,d', C.pz1 + '\\left(1 + \\dfrac{2}{' + n(pz.beta) + '}\\right)' + raiz, v(pz.Vc1, 'fuerza'), U('fuerza')),
      eq('Ecuación ' + C.ec[1], 'V_{c2}', kTx(C.pz2) + '\\left(\\dfrac{\\alpha_s\\,d}{b_o} + 2\\right)\\lambda\\sqrt{f\'_c}\\,b_o\\,d', kTx(C.pz2) + '\\left(\\dfrac{' + c.alpha + '\\cdot' + v(R.d, 'corto') + '}{' + v(pz.bo, 'corto') + '} + 2\\right)' + raiz, v(pz.Vc2, 'fuerza'), U('fuerza')),
      eq('Ecuación ' + C.ec[2], 'V_{c3}', C.pz3 + '\\,\\lambda\\sqrt{f\'_c}\\,b_o\\,d', C.pz3 + '\\cdot' + raiz, v(pz.Vc3, 'fuerza'), U('fuerza'))],
      { tipo: 'vc' });
    diapo(c2, 'Verificación a punzonamiento',
      'La resistencia de diseño se reduce con φ y debe ser mayor que el cortante último.',
      [eq('Resistencia de diseño', '\\phi V_c', '\\phi_v\\,\\min(V_{c1}, V_{c2}, V_{c3})', n(m.phiV, 2) + '\\cdot' + v(pz.Vc, 'fuerza'), v(pz.phiVc, 'fuerza'), U('fuerza')),
      ver('Punzonamiento', 'V_u = ' + v(pz.Vu, 'fuerza') + U('fuerza') + ' \\;' + le(pz.ok) + '\\; \\phi V_c = ' + v(pz.phiVc, 'fuerza') + U('fuerza'), pz.ok),
      !pz.dentro ? nota('aviso', 'El perímetro crítico se sale de la zapata: el punzonamiento no se desarrolla como se supone. Revise las dimensiones.') : null],
      { tipo: 'planta', capa: 'punz' });

    // ---------------------------------------------------------------- 3. Cortante en una dirección
    const c3 = capitulo('cu', 'Cortante en una dirección', en ? 'ACI 318 22.5' : 'NSR-10 C.11.11.1.1', cu.x.ok && cu.y.ok);
    const una = (dir, o, L, Cl, b, lb) => {
      const dl = dir.toLowerCase();
      diapo(c3, 'Dirección ' + dir,
        'La zapata trabaja como una viga ancha. La sección crítica está a una distancia d de la cara de la columna y el cortante es la reacción del suelo en la franja exterior.',
        [eq('Área tributaria', 'A_' + dl, lb + '\\left(\\dfrac{L_' + dl + ' - C_' + dl + '}{2} - d\\right)', v(b, 'longitud') + '\\left(\\dfrac{' + v(L, 'longitud') + ' - ' + v(Cl, 'longitud') + '}{2} - ' + v(R.d, 'longitud', 3) + '\\right)', v(o.A, 'area'), U('area')),
        eq('Cortante último', 'V_{u' + dl + '}', '\\sigma_u\\,A_' + dl, v(u.su, 'presion') + '\\cdot' + v(o.A, 'area'), v(o.Vu, 'fuerza'), U('fuerza')),
        eq('Resistencia (' + C.ec[3] + ')', '\\phi V_{c' + dl + '}', '\\phi_v\\,' + C.cu + '\\,\\lambda\\sqrt{f\'_c}\\,' + lb + '\\,d',
          n(m.phiV, 2) + '\\cdot ' + C.cu + '\\cdot' + n(m.lambda, 2) + '\\sqrt{' + v(m.fc, 'esfuerzo') + '}\\,(' + v(b, 'corto') + ')(' + v(R.d, 'corto') + ')/1000', v(o.phiVc, 'fuerza'), U('fuerza')),
        ver('Cortante en ' + dir, 'V_{u' + dl + '} = ' + v(o.Vu, 'fuerza') + U('fuerza') + ' \\;' + le(o.ok) + '\\; \\phi V_{c' + dl + '} = ' + v(o.phiVc, 'fuerza') + U('fuerza'), o.ok),
        o.k <= 0 ? nota('info', 'La sección crítica queda fuera de la zapata, así que este cortante es cero.') : null],
        { tipo: 'seccion', dir });
    };
    una('X', cu.x, R.Lx, c.Cx, R.Ly, 'L_y');
    una('Y', cu.y, R.Ly, c.Cy, R.Lx, 'L_x');

    // ---------------------------------------------------------------- 4. Flexión
    const c4 = capitulo('fl', 'Diseño a flexión y refuerzo', en ? 'ACI 318 13.2.7' : 'NSR-10 C.15.4', R.chequeos[3].ok);
    const flex = (dir, F, L, Cl, bTxt, bVal) => {
      const dl = dir.toLowerCase();
      diapo(c4, 'Momento en la dirección ' + dir,
        'El momento de diseño se toma en la cara de la columna (NSR-10 C.15.4.2): el voladizo recibe la reacción del suelo como una carga repartida.',
        [eq('Voladizo', 'K_' + dl, '\\dfrac{L_' + dl + ' - C_' + dl + '}{2}', '\\dfrac{' + v(L, 'longitud') + ' - ' + v(Cl, 'longitud') + '}{2}', v(F.K, 'longitud', 3), U('longitud')),
        eq('Área que genera flexión', 'A_{' + dl + 'f}', bTxt + '\\,K_' + dl, v(bVal, 'longitud') + '\\cdot' + v(F.K, 'longitud', 3), v(F.Af, 'area'), U('area')),
        eq('Fuerza resultante', 'F_' + dl, '\\sigma_u\\,A_{' + dl + 'f}', v(u.su, 'presion') + '\\cdot' + v(F.Af, 'area'), v(F.F, 'fuerza'), U('fuerza')),
        eq('Momento último', 'M_{u' + dl + '}', 'F_' + dl + '\\,\\dfrac{K_' + dl + '}{2}', v(F.F, 'fuerza') + '\\cdot\\dfrac{' + v(F.K, 'longitud', 3) + '}{2}', v(F.Mu, 'momento'), U('momento'))],
        { tipo: 'voladizo', dir });
      const MuC = UN.a(F.Mu, 'momento', sis) * convMv;
      diapo(c4, 'Cuantía de acero en ' + dir,
        'Con el momento se obtiene la cuantía necesaria. No puede ser menor que la mínima por retracción y temperatura (C.7.12.2.1) ni mayor que la de una sección controlada por tracción.',
        [eq('Coeficiente de resistencia', 'R_{n' + dl + '}', '\\dfrac{M_{u' + dl + '}\\cdot ' + convM + '}{\\phi_f\\,b\\,d^{2}}', '\\dfrac{' + n(MuC, 0) + '}{' + n(m.phiF, 2) + '\\cdot' + v(bVal, 'corto') + '\\cdot' + v(R.d, 'corto') + '^{2}}', v(F.Rn, 'esfuerzo', en ? 1 : 3), uEsf),
        eq('Cuantía requerida', '\\rho_{' + dl + '}', '\\dfrac{0.85 f\'_c}{f_y}\\left(1 - \\sqrt{1 - \\dfrac{2R_n}{0.85 f\'_c}}\\right)',
          '\\dfrac{0.85\\cdot' + v(m.fc, 'esfuerzo') + '}{' + v(F.fy, 'esfuerzo') + '}\\left(1 - \\sqrt{1 - \\dfrac{2\\cdot' + v(F.Rn, 'esfuerzo', en ? 1 : 3) + '}{0.85\\cdot' + v(m.fc, 'esfuerzo') + '}}\\right)', n(F.rhoCalc, 5), ''),
        eq('Cuantía de diseño', '\\rho', '\\max(\\rho_{' + dl + '},\\ \\rho_{min})', '\\max(' + n(F.rhoCalc, 5) + ',\\ ' + n(F.rhoMin, 5) + ')', n(F.rho, 5), ''),
        ver('Cuantía máxima', '\\rho = ' + n(F.rho, 5) + ' \\;' + le(F.rho <= F.rhoMax) + '\\; \\rho_{max} = ' + n(F.rhoMax, 5), F.rho <= F.rhoMax)],
        { tipo: 'momento', dir });
      const items = [eq('Acero requerido', 'A_{s' + dl + '}', '\\rho\\,b\\,d', n(F.rho, 5) + '\\cdot' + v(bVal, 'corto') + '\\cdot' + v(R.d, 'corto'), v(F.As, 'acero'), U('acero'))];
      if (rf.tipo === 'barras') {
        const sel = dir === 'X' ? rf.selX : rf.selY;
        items.push(eq('Acero suministrado', 'A_{s,prov}', 'n\\,A_b', sel.n + '\\cdot' + v(sel.Ab, 'acero') + '\\quad(' + sel.n + '\\,\\#' + sel.barra + '\\ @\\ ' + v(sel.s, 'longitud') + U('longitud') + ')', v(sel.AsProv, 'acero'), U('acero')));
        items.push(ver('Acero y separación', 'A_{s,prov} = ' + v(sel.AsProv, 'acero') + U('acero') + ' \\;\\ge\\; A_{s' + dl + '},\\quad s = ' + v(sel.s, 'longitud') + U('longitud') + ' \\;' + le(sel.s <= sel.smax + 1e-9) + '\\; s_{max} = ' + v(sel.smax, 'longitud') + U('longitud'), sel.estado !== 'mal'));
      } else {
        const req = dir === 'X' ? rf.reqX : rf.reqY;
        const prov = dir === 'X' ? rf.sel.provX : rf.sel.provY;
        items.push(eq('Acero requerido por unidad de ancho', 'a_{s' + dl + '}', '\\dfrac{A_{s' + dl + '}}{b}', '\\dfrac{' + v(F.As, 'acero') + '}{' + v(bVal, 'longitud') + '}', v(req, 'aceroM'), U('aceroM')));
        items.push(ver('Malla ' + (rf.sel.capas > 1 ? '2 × ' : '') + rf.sel.ref, 'a_{s,prov} = ' + v(prov, 'aceroM') + U('aceroM') + ' \\;' + ge(prov >= req - 1e-9) + '\\; a_{s' + dl + '} = ' + v(req, 'aceroM') + U('aceroM'), prov >= req - 1e-9));
      }
      // Avisos que importan para construir (antes iban en una diapositiva aparte)
      if (Math.abs(R.Lx - R.Ly) > 1e-6 && R.banda.corta === dir) items.push(nota('info', 'Zapata rectangular: la NSR-10 C.15.4.4.2 pide concentrar en una banda central, de ancho igual al lado corto, la fracción γ<sub>s</sub> = 2/(β + 1) = ' + R.banda.gamma.toFixed(3) + ' de este acero. El método del curso lo reparte de forma uniforme.'));
      if (rf.tipo === 'malla' && dir === 'X') {
        if (rf.sel.traslapo) items.push(nota('aviso', 'La zapata excede el panel Diaco de 6.00 × 2.35 m: se requieren traslapos entre paneles (NSR-10 C.12.18).'));
        items.push(nota('aviso', 'El uso de malla electrosoldada en zapatas debe aprobarlo el diseñador estructural.'));
      }
      diapo(c4, 'Refuerzo en ' + dir,
        rf.tipo === 'barras' ? 'Se elige la barra y la separación que cubren el acero requerido sin pasar la separación máxima s<sub>max</sub> = min(3h, 45 cm).' : 'Se elige la malla electrosoldada cuyo acero por metro cubre el requerido en esta dirección.',
        items, { tipo: 'planta', capa: 'acero' });
    };
    flex('X', fx, R.Lx, c.Cx, 'L_y', R.Ly);
    flex('Y', fy, R.Ly, c.Cy, 'L_x', R.Lx);

    // ---------------------------------------------------------------- 5. Aplastamiento
    const c5 = capitulo('ap', 'Resistencia al aplastamiento', en ? 'ACI 318 22.8' : 'NSR-10 C.10.14', ap.ok1 && ap.ok2);
    const A1c = UN.a(c.Cx, 'corto', sis) * UN.a(c.Cy, 'corto', sis);
    diapo(c5, 'Áreas de contacto',
      'La carga de la columna pasa a la zapata por contacto directo. El concreto que rodea el área cargada la confina y aumenta su resistencia, hasta un límite de 2 veces. A<sub>2</sub> no puede salirse de la zapata.',
      [eq('Área cargada', 'A_1', 'C_x\\,C_y', v(c.Cx, 'longitud') + '\\cdot' + v(c.Cy, 'longitud'), v(ap.A1, 'area'), U('area')),
      eq('Base de la pirámide (pendiente 1:2)', 'A_2', '\\min(C_x + 4h,\\ L_x)\\cdot\\min(C_y + 4h,\\ L_y)', '\\min(' + v(ap.a2x, 'longitud', 3) + ',\\ ' + v(R.Lx, 'longitud') + ')\\cdot\\min(' + v(ap.a2y, 'longitud', 3) + ',\\ ' + v(R.Ly, 'longitud') + ')', v(ap.A2, 'area'), U('area')),
      eq('Factor de confinamiento', 'K', '\\min\\left(\\sqrt{A_2/A_1},\\ 2\\right)', '\\min(' + n(ap.raiz) + ',\\ 2)', n(ap.K), '')],
      { tipo: 'piramide' });
    diapo(c5, 'Verificación al aplastamiento',
      'Se revisa la base de la columna y la cara superior de la zapata, con φ = ' + m.phiB + ' y A<sub>1</sub> en ' + UN.u('corto', sis) + '².',
      [eq('Base de la columna', '\\phi P_{nb1}', '\\phi\\,(0.85\\,f\'_c\\,A_1)', n(m.phiB, 2) + '\\cdot 0.85\\cdot' + v(m.fc, 'esfuerzo') + '\\cdot' + n(A1c, 0) + '/1000', v(ap.phiPnb1, 'fuerza'), U('fuerza')),
      ver('Base de la columna', 'P_u = ' + v(u.P, 'fuerza') + U('fuerza') + ' \\;' + le(ap.ok1) + '\\; \\phi P_{nb1} = ' + v(ap.phiPnb1, 'fuerza') + U('fuerza'), ap.ok1),
      eq('Cara superior de la zapata', '\\phi P_{nb2}', '\\phi\\,(0.85\\,f\'_c\\,A_1)\\,K', v(ap.phiPnb1, 'fuerza') + '\\cdot' + n(ap.K), v(ap.phiPnb2, 'fuerza'), U('fuerza')),
      ver('Cara superior de la zapata', 'P_u = ' + v(u.P, 'fuerza') + U('fuerza') + ' \\;' + le(ap.ok2) + '\\; \\phi P_{nb2} = ' + v(ap.phiPnb2, 'fuerza') + U('fuerza'), ap.ok2)],
      { tipo: 'aplastamiento' });

    // ---------------------------------------------------------------- 6. Longitud de desarrollo
    const c6 = capitulo('ld', 'Longitud de desarrollo', en ? 'ACI 318 25.4.9' : 'NSR-10 C.12.3', R.chequeos[5].ok);
    const fyD = en ? UN.a(m.fy, 'esfuerzo', 'ingles') : ld.fyM, fcD = en ? UN.a(m.fc, 'esfuerzo', 'ingles') : ld.fcM;
    const dbD = ldV(ld.db), uE = en ? '\\,\\text{psi}' : '\\,\\text{MPa}';
    diapo(c6, 'Longitud de anclaje a compresión',
      'Las barras de la columna se anclan dentro de la zapata con una longitud suficiente para transmitir su fuerza (' + (en ? 'ACI 318 25.4.9.2' : 'NSR-10 C.12.3.2') + '). Esta condición suele definir la altura mínima.',
      [eq('Barra #' + ld.barra, 'd_b', null, null, n(dbD, en ? 3 : 1), ldU, { nota: 'fy = ' + n(fyD, en ? 0 : 1) + (en ? ' psi' : ' MPa') + ", f'c = " + n(fcD, en ? 0 : 2) + (en ? ' psi' : ' MPa') }),
      eq('Longitud básica', 'l_{dc}', '\\dfrac{' + (en ? '0.02' : '0.24') + '\\,f_y\\,d_b}{\\lambda\\sqrt{f\'_c}}', '\\dfrac{' + (en ? '0.02' : '0.24') + '\\cdot' + n(fyD, en ? 0 : 1) + '\\cdot' + n(dbD, en ? 3 : 1) + '}{' + n(m.lambda, 2) + '\\sqrt{' + n(fcD, en ? 0 : 2) + '}}', n(ldV(ld.l1), 1), ldU),
      eq('Mínimo', 'l_{dc,min}', '\\max(' + (en ? '0.0003' : '0.043') + '\\,f_y\\,d_b,\\ ' + (en ? '8\\,\\text{in}' : '200\\,\\text{mm}') + ')', '\\max(' + n(ldV(ld.l2), 1) + ',\\ ' + n(ldV(ld.lmin), 0) + ')', n(ldV(Math.max(ld.l2, ld.lmin)), 1), ldU)],
      { tipo: 'corte', dir: 'X' });
    diapo(c6, 'Verificación del anclaje',
      'Las barras terminan en gancho de 90° apoyado en la parrilla inferior; la parte horizontal del gancho no cuenta. No se aplica la reducción por A<sub>s</sub> requerido / A<sub>s</sub> suministrado.',
      [ver('Anclaje disponible', 'l_{dc} = ' + n(ldV(ld.ldc), 1) + ldU + ' \\;' + le(ld.ok) + '\\; h - r = ' + n(ldV(ld.disponible), 1) + ldU, ld.ok),
      ver('Altura mínima sobre el refuerzo (C.15.7)', 'd = ' + n(ldV(R.d * 1000), en ? 1 : 0) + ldU + ' \\;' + ge(R.dMinOk) + '\\; ' + (en ? '6' : '150') + ldU, R.dMinOk),
      ld.tabla != null && !en ? nota('info', 'Referencia: Tabla 4.21 de J. Segura (f<sub>y</sub> = 420 MPa), interpolada para f\'c = ' + ld.fcM.toFixed(1) + ' MPa: <b>' + ld.tabla.toFixed(0) + ' mm</b>.') : null],
      { tipo: 'corte', dir: 'X' });

    // Lista plana para el PDF: cada diapositiva es un subtítulo, su texto y sus elementos
    caps.forEach((cap) => {
      cap.items = [];
      cap.diapos.forEach((d) => {
        cap.items.push({ t: 'sub', txt: d.titulo });
        if (d.texto) cap.items.push({ t: 'p', html: d.texto });
        d.items.forEach((it) => cap.items.push(it));
      });
    });
    return caps;
  }

  global.MemoriaAisladaMomento = { generar };
})(window);

/* Memoria de cálculo de la zapata aislada con momento, en notación LaTeX (KaTeX).
 * Devuelve secciones con párrafos explicativos, ecuaciones alineadas y verificaciones.
 */
(function (global) {
  'use strict';

  const n = (x, d = 3) => (x == null || !isFinite(x) ? '\\text{n/a}' : Number(x).toFixed(d));
  const U = {
    t: '\\,\\text{tonf}', tm2: '\\,\\text{tonf/m}^2', m: '\\,\\text{m}', m2: '\\,\\text{m}^2', m4: '\\,\\text{m}^4',
    tm: '\\,\\text{tonf}\\cdot\\text{m}', kc: '\\,\\text{kgf/cm}^2', cm2: '\\,\\text{cm}^2', cm2m: '\\,\\text{cm}^2/\\text{m}',
    mm: '\\,\\text{mm}', cm: '\\,\\text{cm}', mpa: '\\,\\text{MPa}', none: '',
  };

  // Ecuación alineada: símbolo, sustitución y resultado enmarcado.
  function eq(etq, lhs, simb, sust, res, u, extra) {
    const lineas = [];
    if (simb) lineas.push(lhs + ' &= ' + simb);
    if (sust) lineas.push((simb ? '' : lhs + ' ') + '&= ' + sust);
    lineas.push((simb || sust ? '' : lhs + ' ') + '&= \\boxed{' + res + u + '}');
    return Object.assign({ t: 'eq', etq, tex: '\\begin{aligned}' + lineas.join(' \\\\ ') + '\\end{aligned}' }, extra || {});
  }
  const ver = (etq, tex, ok) => ({ t: 'ver', etq, tex, ok });
  const p = (html) => ({ t: 'p', html });
  const sub = (txt) => ({ t: 'sub', txt });
  const nota = (tipo, html) => ({ t: 'nota', tipo, html });
  const le = (ok) => (ok ? '\\le' : '>');
  const ge = (ok) => (ok ? '\\ge' : '<');

  function generar(R) {
    const I = R.inp, c = I.columna, m = I.materiales;
    const s = R.serv, u = R.ult, pz = R.pz, cu = R.cu, fx = R.fx, fy = R.fy, ap = R.ap, ld = R.ld, rf = R.ref;
    const out = [];

    // ---------------------------------------------------------------- 1
    const a = [];
    a.push(p('El área de la zapata se determina con las cargas de servicio, sin mayorar (NSR-10 C.15.2.2). Como la columna transmite momentos en las dos direcciones, la presión sobre el suelo no es uniforme: varía linealmente y alcanza su máximo en una esquina. Se verifica que ninguna esquina supere el esfuerzo admisible y que ninguna quede en tensión.'));
    if (s.W > 0) a.push(eq('Peso propio de zapata y suelo', 'W', 'L_x L_y\\left[h\\,\\gamma_c + (D_f - h)\\,\\gamma_s\\right]',
      n(R.Lx, 2) + '\\cdot' + n(R.Ly, 2) + '\\left[' + n(R.h) + '\\cdot' + n(I.suelo.gc, 2) + ' + ' + n(Math.max(I.suelo.Df - R.h, 0)) + '\\cdot' + n(I.suelo.gs, 2) + '\\right]', n(s.W), U.t));
    a.push(eq('Carga axial de servicio', 'P_s', 'P_{PP+CM} + P_{CV}' + (s.W > 0 ? ' + W' : ''),
      n(Math.abs(I.cargas.D.P)) + ' + ' + n(Math.abs(I.cargas.L.P)) + (s.W > 0 ? ' + ' + n(s.W) : ''), n(s.P), U.t));
    a.push(eq('Momentos de servicio', 'M_{xs}', 'M_{x,PP+CM} + M_{x,CV}', n(Math.abs(I.cargas.D.Mx)) + ' + ' + n(Math.abs(I.cargas.L.Mx)), n(s.Mx), U.tm));
    a.push(eq('', 'M_{ys}', 'M_{y,PP+CM} + M_{y,CV}', n(Math.abs(I.cargas.D.My)) + ' + ' + n(Math.abs(I.cargas.L.My)), n(s.My), U.tm));
    a.push(eq('Área requerida solo por carga axial', 'A_z', '\\dfrac{P_s}{\\sigma_{adm}}', '\\dfrac{' + n(s.P) + '}{' + n(I.suelo.qadm, 2) + '}', n(s.Areq), U.m2));
    a.push(p('Esa área no considera los momentos, por eso se adopta una zapata algo mayor y se revisan los esfuerzos en las esquinas.'));
    a.push(eq('Área adoptada', 'A', 'L_x\\,L_y', n(R.Lx, 2) + '\\cdot' + n(R.Ly, 2), n(s.A), U.m2));
    a.push(eq('Inercias de la base', 'I_x', '\\dfrac{L_x L_y^{3}}{12}', '\\dfrac{' + n(R.Lx, 2) + '\\cdot' + n(R.Ly, 2) + '^{3}}{12}', n(s.Ix), U.m4));
    a.push(eq('', 'I_y', '\\dfrac{L_y L_x^{3}}{12}', '\\dfrac{' + n(R.Ly, 2) + '\\cdot' + n(R.Lx, 2) + '^{3}}{12}', n(s.Iy), U.m4));
    a.push(eq('Excentricidades', 'e_x', '\\dfrac{M_{ys}}{P_s}', '\\dfrac{' + n(s.My) + '}{' + n(s.P) + '}', n(s.ex, 4), U.m));
    a.push(ver('Dentro del núcleo central en X', 'e_x = ' + n(s.ex, 4) + U.m + ' \\;' + le(s.ex <= R.Lx / 6) + '\\; \\dfrac{L_x}{6} = ' + n(R.Lx / 6, 3) + U.m, s.ex <= R.Lx / 6));
    a.push(eq('', 'e_y', '\\dfrac{M_{xs}}{P_s}', '\\dfrac{' + n(s.Mx) + '}{' + n(s.P) + '}', n(s.ey, 4), U.m));
    a.push(ver('Dentro del núcleo central en Y', 'e_y = ' + n(s.ey, 4) + U.m + ' \\;' + le(s.ey <= R.Ly / 6) + '\\; \\dfrac{L_y}{6} = ' + n(R.Ly / 6, 3) + U.m, s.ey <= R.Ly / 6));
    a.push(p('Los esfuerzos en las esquinas resultan de sumar la compresión uniforme y la flexión en cada dirección. Los signos siguen la numeración del documento: σ1 arriba a la derecha y luego en sentido horario.'));
    const sig = (i, sx, sy) => eq('Esquina ' + i, '\\sigma_{' + i + '}',
      '\\dfrac{P_s}{A} ' + sx + ' \\dfrac{M_{xs}\\,(L_y/2)}{I_x} ' + sy + ' \\dfrac{M_{ys}\\,(L_x/2)}{I_y}',
      '\\dfrac{' + n(s.P) + '}{' + n(s.A) + '} ' + sx + ' \\dfrac{' + n(s.Mx) + '\\cdot' + n(R.Ly / 2) + '}{' + n(s.Ix) + '} ' + sy + ' \\dfrac{' + n(s.My) + '\\cdot' + n(R.Lx / 2) + '}{' + n(s.Iy) + '}',
      n(s['s' + i]), U.tm2);
    a.push(sig(1, '+', '+'), sig(2, '-', '+'), sig(3, '-', '-'), sig(4, '+', '-'));
    a.push(ver('Esfuerzo máximo contra el admisible', '\\sigma_{max} = ' + n(s.smax) + U.tm2 + ' \\;' + le(s.okMax) + '\\; \\sigma_{adm} = ' + n(I.suelo.qadm, 2) + U.tm2, s.okMax));
    a.push(ver('Sin tensión en el suelo (caso ' + s.caso + ')', '\\sigma_{min} = ' + n(s.smin) + U.tm2 + ' \\;' + (s.okMin ? '>' : '\\le') + '\\; 0', s.okMin));
    out.push({ id: 'serv', titulo: 'Área de la zapata y esfuerzos de servicio', ref: 'NSR-10 C.15.2', ok: R.chequeos[0].ok, items: a });

    // ---------------------------------------------------------------- 2
    const b = [];
    b.push(p('La altura de la zapata debe resistir el punzonamiento: la columna tiende a perforar la placa a lo largo de un perímetro crítico ubicado a d/2 de sus caras (NSR-10 C.11.11.1.2). El cortante actuante es la reacción del suelo fuera de ese perímetro, calculada con cargas mayoradas.'));
    u.lista.forEach((cb) => {
      b.push(eq('Combinación ' + cb.id, 'P_u', cb.tex.replace('D', 'P_D').replace('L', 'P_L'),
        cb.id === '1.4D' ? '1.4\\cdot' + n(Math.abs(I.cargas.D.P)) : '1.2\\cdot' + n(Math.abs(I.cargas.D.P)) + ' + 1.6\\cdot' + n(Math.abs(I.cargas.L.P)),
        n(cb.P, 2), U.t, { nota: 'σmax = ' + cb.su.toFixed(3) + ' tonf/m²' + (cb === u.gob ? ', gobierna' : '') }));
    });
    b.push(p('Gobierna la combinación <b>' + u.gob.id + '</b>, con M<sub>xu</sub> = ' + u.Mx.toFixed(3) + ' y M<sub>yu</sub> = ' + u.My.toFixed(3) + ' tonf·m. Siguiendo el documento, se diseña con el mayor esfuerzo de las cuatro esquinas, lo que es conservador.'));
    const sigu = (i, sx, sy) => eq('Esquina ' + i + ' mayorada', '\\sigma_{' + i + 'u}',
      null,
      '\\dfrac{' + n(u.P) + '}{' + n(u.A) + '} ' + sx + ' \\dfrac{' + n(u.Mx) + '\\cdot' + n(R.Ly / 2) + '}{' + n(u.Ix) + '} ' + sy + ' \\dfrac{' + n(u.My) + '\\cdot' + n(R.Lx / 2) + '}{' + n(u.Iy) + '}',
      n(u['s' + i]), U.tm2);
    b.push(sigu(1, '+', '+'), sigu(2, '-', '+'), sigu(3, '-', '-'), sigu(4, '+', '-'));
    b.push(eq('Esfuerzo último de diseño', '\\sigma_u', '\\max(\\sigma_{1u},\\,\\sigma_{2u},\\,\\sigma_{3u},\\,\\sigma_{4u})', null, n(u.su), U.tm2));
    b.push(eq('Relación de lados de la columna', '\\beta', '\\dfrac{\\max(C_x, C_y)}{\\min(C_x, C_y)}', '\\dfrac{' + n(Math.max(c.Cx, c.Cy), 2) + '}{' + n(Math.min(c.Cx, c.Cy), 2) + '}', n(pz.beta), U.none));
    b.push(eq('Perímetro crítico', 'b_o', '2(C_x + d) + 2(C_y + d)', '2(' + n(c.Cx, 2) + ' + ' + n(R.d) + ') + 2(' + n(c.Cy, 2) + ' + ' + n(R.d) + ')', n(pz.bo), U.m));
    b.push(eq('Área a cortante doble', 'A_{2D}', 'L_x L_y - (C_x + d)(C_y + d)', n(R.Lx, 2) + '\\cdot' + n(R.Ly, 2) + ' - ' + n(c.Cx + R.d) + '\\cdot' + n(c.Cy + R.d), n(pz.A2D), U.m2));
    b.push(eq('Cortante último', 'V_{u}', '\\sigma_u\\,A_{2D}', n(u.su) + '\\cdot' + n(pz.A2D), n(pz.Vu, 2), U.t));
    b.push(p('La resistencia del concreto es la menor de tres expresiones (NSR-10 C.11.11.2.1). Con f\'c en kgf/cm² y b<sub>o</sub>, d en cm, el resultado sale en kgf y se divide entre 1000.'));
    const raizTxt = n(m.lambda, 2) + '\\sqrt{' + n(m.fc, 0) + '}\\,(' + n(pz.bo * 100, 1) + ')(' + n(R.d * 100, 1) + ')/1000';
    b.push(eq('Ecuación C.11-31', 'V_{c1}', '0.53\\left(1 + \\dfrac{2}{\\beta}\\right)\\lambda\\sqrt{f\'_c}\\,b_o\\,d', '0.53\\left(1 + \\dfrac{2}{' + n(pz.beta) + '}\\right)' + raizTxt, n(pz.Vc1, 2), U.t));
    b.push(eq('Ecuación C.11-32', 'V_{c2}', '0.27\\left(\\dfrac{\\alpha_s\\,d}{b_o} + 2\\right)\\lambda\\sqrt{f\'_c}\\,b_o\\,d', '0.27\\left(\\dfrac{' + c.alpha + '\\cdot' + n(R.d) + '}{' + n(pz.bo) + '} + 2\\right)' + raizTxt, n(pz.Vc2, 2), U.t));
    b.push(eq('Ecuación C.11-33', 'V_{c3}', '1.0\\,\\lambda\\sqrt{f\'_c}\\,b_o\\,d', raizTxt, n(pz.Vc3, 2), U.t));
    b.push(eq('Resistencia de diseño', '\\phi V_c', '\\phi_v\\,\\min(V_{c1}, V_{c2}, V_{c3})', n(m.phiV, 2) + '\\cdot' + n(pz.Vc, 2), n(pz.phiVc, 2), U.t));
    b.push(ver('Punzonamiento', 'V_u = ' + n(pz.Vu, 2) + U.t + ' \\;' + le(pz.ok) + '\\; \\phi V_c = ' + n(pz.phiVc, 2) + U.t, pz.ok));
    if (!pz.dentro) b.push(nota('aviso', 'El perímetro crítico (C<sub>x</sub> + d, C<sub>y</sub> + d) se sale de la zapata: el punzonamiento no se desarrolla como se supone. Revise las dimensiones.'));
    out.push({ id: 'pz', titulo: 'Cortante en dos direcciones', ref: 'NSR-10 C.11.11', ok: pz.ok, items: b });

    // ---------------------------------------------------------------- 3
    const k = [];
    k.push(p('La zapata también trabaja como una viga ancha en cada dirección. La sección crítica está a una distancia d de la cara de la columna (NSR-10 C.11.11.1.1), y el cortante es la reacción del suelo sobre la franja que queda por fuera.'));
    k.push(sub('Dirección X'));
    k.push(eq('Área tributaria', 'A_x', 'L_y\\left(\\dfrac{L_x - C_x}{2} - d\\right)', n(R.Ly, 2) + '\\left(\\dfrac{' + n(R.Lx, 2) + ' - ' + n(c.Cx, 2) + '}{2} - ' + n(R.d) + '\\right)', n(cu.x.A), U.m2));
    k.push(eq('Cortante último', 'V_{ux}', '\\sigma_u\\,A_x', n(u.su) + '\\cdot' + n(cu.x.A), n(cu.x.Vu, 2), U.t));
    k.push(eq('Resistencia', '\\phi V_{cx}', '\\phi_v\\,0.53\\,\\lambda\\sqrt{f\'_c}\\,L_y\\,d', n(m.phiV, 2) + '\\cdot 0.53\\cdot' + n(m.lambda, 2) + '\\sqrt{' + n(m.fc, 0) + '}\\,(' + n(R.Ly * 100, 0) + ')(' + n(R.d * 100, 1) + ')/1000', n(cu.x.phiVc, 2), U.t));
    k.push(ver('Cortante en X', 'V_{ux} = ' + n(cu.x.Vu, 2) + U.t + ' \\;' + le(cu.x.ok) + '\\; \\phi V_{cx} = ' + n(cu.x.phiVc, 2) + U.t, cu.x.ok));
    k.push(sub('Dirección Y'));
    k.push(eq('Área tributaria', 'A_y', 'L_x\\left(\\dfrac{L_y - C_y}{2} - d\\right)', n(R.Lx, 2) + '\\left(\\dfrac{' + n(R.Ly, 2) + ' - ' + n(c.Cy, 2) + '}{2} - ' + n(R.d) + '\\right)', n(cu.y.A), U.m2));
    k.push(eq('Cortante último', 'V_{uy}', '\\sigma_u\\,A_y', n(u.su) + '\\cdot' + n(cu.y.A), n(cu.y.Vu, 2), U.t));
    k.push(eq('Resistencia', '\\phi V_{cy}', '\\phi_v\\,0.53\\,\\lambda\\sqrt{f\'_c}\\,L_x\\,d', n(m.phiV, 2) + '\\cdot 0.53\\cdot' + n(m.lambda, 2) + '\\sqrt{' + n(m.fc, 0) + '}\\,(' + n(R.Lx * 100, 0) + ')(' + n(R.d * 100, 1) + ')/1000', n(cu.y.phiVc, 2), U.t));
    k.push(ver('Cortante en Y', 'V_{uy} = ' + n(cu.y.Vu, 2) + U.t + ' \\;' + le(cu.y.ok) + '\\; \\phi V_{cy} = ' + n(cu.y.phiVc, 2) + U.t, cu.y.ok));
    if (cu.x.k <= 0 || cu.y.k <= 0) k.push(nota('info', 'En alguna dirección la sección crítica queda fuera de la zapata, así que ese cortante es cero.'));
    out.push({ id: 'cu', titulo: 'Cortante en una dirección', ref: 'NSR-10 C.11.11.1.1', ok: cu.x.ok && cu.y.ok, items: k });

    // ---------------------------------------------------------------- 4
    const f = [];
    f.push(p('El momento de diseño se toma en la cara de la columna (NSR-10 C.15.4.2), considerando el voladizo cargado por la reacción del suelo. Con ese momento se obtiene la cuantía necesaria, que no puede ser menor que la mínima por retracción y temperatura (C.7.12.2.1).'));
    if (rf.tipo === 'malla') f.push(nota('info', 'Refuerzo con malla electrosoldada: se diseña con f<sub>y</sub> = ' + n(fx.fy, 0) + ' kgf/cm²' + (fx.fy > 4200 ? ', por lo que ρ<sub>min</sub> = 0.0018·4200/f<sub>y</sub> = ' + fx.rhoMin.toFixed(5) : '') + '.'));
    const flex = (dir, F, L, C, bTxt, bVal) => {
      const dl = dir.toLowerCase();
      f.push(sub('Momento en la dirección ' + dir));
      f.push(eq('Voladizo', 'K_' + dl, '\\dfrac{L_' + dl + ' - C_' + dl + '}{2}', '\\dfrac{' + n(L, 2) + ' - ' + n(C, 2) + '}{2}', n(F.K), U.m));
      f.push(eq('Área que genera flexión', 'A_{' + dl + 'f}', bTxt + '\\,K_' + dl, n(bVal, 2) + '\\cdot' + n(F.K), n(F.Af), U.m2));
      f.push(eq('Fuerza resultante', 'F_' + dl, '\\sigma_u\\,A_{' + dl + 'f}', n(u.su) + '\\cdot' + n(F.Af), n(F.F, 2), U.t));
      f.push(eq('Momento último', 'M_{u' + dl + '}', 'F_' + dl + '\\,\\dfrac{K_' + dl + '}{2}', n(F.F, 3) + '\\cdot\\dfrac{' + n(F.K) + '}{2}', n(F.Mu, 2), U.tm));
      f.push(eq('Coeficiente de resistencia', 'R_{n' + dl + '}', '\\dfrac{M_{u' + dl + '}}{\\phi_f\\,b\\,d^{2}}', '\\dfrac{' + n(F.Mu * 1e5, 0) + '}{' + n(m.phiF, 2) + '\\cdot' + n(bVal * 100, 0) + '\\cdot' + n(R.d * 100, 1) + '^{2}}', n(F.Rn), U.kc));
      f.push(eq('Cuantía requerida', '\\rho_{' + dl + '}', '\\dfrac{0.85 f\'_c}{f_y}\\left(1 - \\sqrt{1 - \\dfrac{2R_n}{0.85 f\'_c}}\\right)',
        '\\dfrac{0.85\\cdot' + n(m.fc, 0) + '}{' + n(F.fy, 0) + '}\\left(1 - \\sqrt{1 - \\dfrac{2\\cdot' + n(F.Rn) + '}{0.85\\cdot' + n(m.fc, 0) + '}}\\right)', n(F.rhoCalc, 5), U.none));
      f.push(eq('Cuantía de diseño', '\\rho', '\\max(\\rho_{' + dl + '},\\ \\rho_{min})', '\\max(' + n(F.rhoCalc, 5) + ',\\ ' + n(F.rhoMin, 5) + ')', n(F.rho, 5), U.none));
      f.push(ver('Cuantía máxima (sección controlada por tracción)', '\\rho = ' + n(F.rho, 5) + ' \\;' + le(F.rho <= F.rhoMax) + '\\; \\rho_{max} = ' + n(F.rhoMax, 5), F.rho <= F.rhoMax));
      f.push(eq('Acero requerido', 'A_{s' + dl + '}', '\\rho\\,b\\,d', n(F.rho, 5) + '\\cdot' + n(bVal * 100, 0) + '\\cdot' + n(R.d * 100, 1), n(F.As, 2), U.cm2));
      if (rf.tipo === 'barras') {
        const sel = dir === 'X' ? rf.selX : rf.selY;
        f.push(eq('Acero suministrado', 'A_{s,prov}', 'n\\,A_b', sel.n + '\\cdot' + n(sel.Ab, 2) + '\\quad(' + sel.n + '\\,\\#' + sel.barra + '\\ @\\ ' + n(sel.s, 2) + '\\,\\text{m})', n(sel.AsProv, 2), U.cm2));
        f.push(ver('Acero y separación en ' + dir, 'A_{s,prov} = ' + n(sel.AsProv, 2) + U.cm2 + ' \\;\\ge\\; A_{s' + dl + '} = ' + n(F.As, 2) + U.cm2 + ',\\quad s = ' + n(sel.s, 2) + U.m + ' \\;' + le(sel.s <= sel.smax + 1e-9) + '\\; s_{max} = ' + n(sel.smax, 2) + U.m, sel.estado !== 'mal'));
      } else {
        const req = dir === 'X' ? rf.reqX : rf.reqY;
        const prov = dir === 'X' ? rf.sel.provX : rf.sel.provY;
        f.push(eq('Acero requerido por metro', 'a_{s' + dl + '}', '\\dfrac{A_{s' + dl + '}}{b}', '\\dfrac{' + n(F.As, 2) + '}{' + n(bVal, 2) + '}', n(req), U.cm2m));
        f.push(ver('Malla en ' + dir + ' (' + (rf.sel.capas > 1 ? '2 capas de ' : '') + rf.sel.ref + ')', 'a_{s,prov} = ' + n(prov) + U.cm2m + ' \\;' + ge(prov >= req - 1e-9) + '\\; a_{s' + dl + '} = ' + n(req) + U.cm2m, prov >= req - 1e-9));
      }
    };
    flex('X', fx, R.Lx, c.Cx, 'L_y', R.Ly);
    flex('Y', fy, R.Ly, c.Cy, 'L_x', R.Lx);
    f.push(nota('pdf', 'Corrección respecto al documento (pág. 10): allí se escribe A<sub>yf</sub> = L<sub>x</sub>·K<sub>y</sub> pero se calcula L<sub>y</sub>·K<sub>y</sub> = ' + fy.AfPdf.toFixed(2) + ' m², y se obtiene M<sub>uy</sub> = ' + fy.MuPdf.toFixed(2) + ' tonf·m. Con L<sub>x</sub>·K<sub>y</sub> el valor correcto es <b>' + fy.Mu.toFixed(2) + ' tonf·m</b>. Además, ρ<sub>y</sub> debe calcularse con R<sub>ny</sub> (el documento usa R<sub>nx</sub>).'));
    if (Math.abs(R.Lx - R.Ly) > 1e-6) {
      f.push(nota('info', 'Zapata rectangular: la NSR-10 C.15.4.4.2 pide concentrar en una banda central, de ancho igual al lado corto, la fracción γ<sub>s</sub> = 2/(β + 1) = ' + R.banda.gamma.toFixed(3) + ' (β = ' + R.banda.beta.toFixed(3) + ') del acero paralelo al lado corto. El documento lo reparte de forma uniforme; aquí se sigue el documento.'));
    }
    if (rf.tipo === 'malla') {
      if (rf.sel.traslapo) f.push(nota('aviso', 'La zapata excede el panel Diaco de 6.00 × 2.35 m: se requieren traslapos entre paneles, según NSR-10 C.12.18.'));
      f.push(nota('aviso', 'El uso de malla electrosoldada como refuerzo de zapatas debe aprobarlo el diseñador estructural o el profesor.'));
    }
    out.push({ id: 'fl', titulo: 'Diseño a flexión y refuerzo', ref: 'NSR-10 C.15.4', ok: R.chequeos[3].ok, items: f });

    // ---------------------------------------------------------------- 5
    const e = [];
    e.push(p('La carga de la columna se transmite por contacto directo. Se revisa el aplastamiento del concreto en la base de la columna y en la cara superior de la zapata (NSR-10 C.10.14), con φ = ' + m.phiB + '. En la zapata la resistencia aumenta por el confinamiento del concreto que rodea el área cargada, con un límite de 2 veces.'));
    e.push(eq('Área cargada', 'A_1', 'C_x\\,C_y', n(c.Cx, 2) + '\\cdot' + n(c.Cy, 2), n(ap.A1), U.m2));
    e.push(eq('Base de la pirámide (pendiente 1:2)', 'A_2', '\\min(C_x + 4h,\\ L_x)\\cdot\\min(C_y + 4h,\\ L_y)', '\\min(' + n(ap.a2x) + ',\\ ' + n(R.Lx, 2) + ')\\cdot\\min(' + n(ap.a2y) + ',\\ ' + n(R.Ly, 2) + ')', n(ap.A2), U.m2));
    e.push(eq('Resistencia en la base de la columna', '\\phi P_{nb1}', '\\phi\\,(0.85\\,f\'_c\\,A_1)', n(m.phiB, 2) + '\\cdot 0.85\\cdot' + n(m.fc, 0) + '\\cdot' + n(ap.A1 * 1e4, 0) + '/1000', n(ap.phiPnb1, 2), U.t));
    e.push(ver('Base de la columna', 'P_u = ' + n(u.P, 2) + U.t + ' \\;' + le(ap.ok1) + '\\; \\phi P_{nb1} = ' + n(ap.phiPnb1, 2) + U.t, ap.ok1));
    e.push(eq('Factor de confinamiento', 'K', '\\min\\left(\\sqrt{A_2/A_1},\\ 2\\right)', '\\min\\left(\\sqrt{' + n(ap.A2) + '/' + n(ap.A1) + '},\\ 2\\right) = \\min(' + n(ap.raiz) + ',\\ 2)', n(ap.K), U.none));
    e.push(eq('Resistencia en la zapata', '\\phi P_{nb2}', '\\phi\\,(0.85\\,f\'_c\\,A_1)\\,K', n(ap.phiPnb1, 2) + '\\cdot' + n(ap.K), n(ap.phiPnb2, 2), U.t));
    e.push(ver('Cara superior de la zapata', 'P_u = ' + n(u.P, 2) + U.t + ' \\;' + le(ap.ok2) + '\\; \\phi P_{nb2} = ' + n(ap.phiPnb2, 2) + U.t, ap.ok2));
    if (ap.recortada) e.push(nota('pdf', 'A<sub>2</sub> se limita al área de la zapata. El documento usa (C<sub>x</sub> + 4h)(C<sub>y</sub> + 4h) = ' + ap.A2sin.toFixed(2) + ' m² sin recortar. En el ejemplo no cambia el resultado porque K queda limitado a 2.'));
    out.push({ id: 'ap', titulo: 'Resistencia al aplastamiento', ref: 'NSR-10 C.10.14', ok: ap.ok1 && ap.ok2, items: e });

    // ---------------------------------------------------------------- 6
    const g = [];
    g.push(p('Las barras de la columna deben anclarse dentro de la zapata con una longitud suficiente para transmitir su fuerza por compresión (NSR-10 C.12.3.2). Esta condición suele definir la altura mínima de la zapata. Las barras terminan en gancho de 90° apoyado sobre la parrilla inferior; la parte horizontal del gancho no cuenta para el anclaje.'));
    g.push(eq('Datos de la barra #' + ld.barra, 'd_b', null, null, n(ld.db, 1), U.mm, { nota: 'fy = ' + ld.fyM.toFixed(1) + ' MPa, f\'c = ' + ld.fcM.toFixed(2) + ' MPa' }));
    g.push(eq('Longitud básica', 'l_{dc}', '\\dfrac{0.24\\,d_b\\,f_y}{\\lambda\\sqrt{f\'_c}}', '\\dfrac{0.24\\cdot' + n(ld.db, 1) + '\\cdot' + n(ld.fyM, 1) + '}{' + n(m.lambda, 2) + '\\sqrt{' + n(ld.fcM, 2) + '}}', n(ld.l1, 1), U.mm));
    g.push(eq('Mínimo', 'l_{dc,min}', '\\max(0.043\\,d_b\\,f_y,\\ 200\\,\\text{mm})', '\\max(0.043\\cdot' + n(ld.db, 1) + '\\cdot' + n(ld.fyM, 1) + ',\\ 200)', n(Math.max(ld.l2, 200), 1), U.mm));
    g.push(ver('Anclaje disponible', 'l_{dc} = ' + n(ld.ldc, 1) + U.mm + ' \\;' + le(ld.ok) + '\\; h - r = ' + n(ld.disponible, 1) + U.mm, ld.ok));
    g.push(ver('Altura mínima sobre el refuerzo (C.15.7)', 'd = ' + n(R.d * 1000, 0) + U.mm + ' \\;' + ge(R.dMinOk) + '\\; 150' + U.mm, R.dMinOk));
    if (ld.tabla != null) g.push(nota('info', 'Referencia: Tabla 4.21 de J. Segura (f<sub>y</sub> = 420 MPa), interpolada para f\'c = ' + ld.fcM.toFixed(1) + ' MPa: <b>' + ld.tabla.toFixed(0) + ' mm</b>.'));
    g.push(nota('info', 'No se aplica la reducción por A<sub>s</sub> requerido / A<sub>s</sub> suministrado.'));
    out.push({ id: 'ld', titulo: 'Longitud de desarrollo', ref: 'NSR-10 C.12.3', ok: R.chequeos[5].ok, items: g });

    return out;
  }

  global.MemoriaAisladaMomento = { generar };
})(window);

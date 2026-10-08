/* Memoria de cálculo de la zapata combinada (beta 1.2), en LaTeX (KaTeX), por capítulos y diapositivas.
 * Mismo formato que la de la aislada: cada diapositiva tiene un texto corto, ecuaciones y una figura
 * (aquí la figura ya viene dibujada en f.svg). Todo se escribe en el sistema de unidades del cálculo.
 */
(function (global) {
  'use strict';

  const n = (x, d = 3) => (x == null || !isFinite(x) ? '\\text{n/a}' : Number(x).toFixed(d));

  function eq(etq, lhs, simb, sust, res, u, liga) {
    const lineas = [];
    if (simb) lineas.push(lhs + ' &= ' + simb);
    if (sust) lineas.push((simb ? '' : lhs + ' ') + '&= ' + sust);
    lineas.push((simb || sust ? '' : lhs + ' ') + '&= \\boxed{' + res + u + '}');
    return { t: 'eq', etq, tex: '\\begin{aligned}' + lineas.join(' \\\\ ') + '\\end{aligned}', liga: liga || null };
  }
  const ver = (etq, tex, ok) => ({ t: 'ver', etq, tex, ok });
  const nota = (tipo, html) => ({ t: 'nota', tipo, html });
  const le = (ok) => (ok ? '\\le' : '>');

  // Partes de las figuras de la combinada que resalta cada liga
  const LIGAS = { xbar: '.fig-xbar', presion: '.fig-presion, .fig-presion-f', franja: '.franja', ldc: '.fig-ld', diagrama: '.diagrama-v, .diagrama-m' };

  function generar(R) {
    const I = R.inp, m = I.materiales, sis = I.unid || 'curso', UN = global.Unidades, D = global.DibujoCombinada;
    const v = (x, mag, d) => UN.num(x, mag, sis, d), U = (mag) => UN.tex(mag, sis);
    const C = UN.coef(sis).eq, en = sis === 'ingles', doc = I.metodo === 'documento';
    const uW = '\\,\\text{' + UN.u('fuerza', sis) + '/' + UN.u('longitud', sis) + '}';
    const vW = (w) => Number(UN.a(w, 'fuerza', sis) / UN.a(1, 'longitud', sis)).toFixed(2);
    const convM = { curso: '10^{5}', si: '10^{6}', ingles: '12\\,000' }[sis];
    const ldU = en ? '\\,\\text{in}' : '\\,\\text{mm}', ldV = (x) => (en ? x / 25.4 : x);
    const [c0, c1] = R.cols, nombre = ['exterior', 'interior'];

    const caps = [];
    const capitulo = (id, titulo, ref, ok) => { const cap = { id, titulo, ref, ok, diapos: [] }; caps.push(cap); return cap; };
    const diapo = (cap, titulo, texto, items, svg) => cap.diapos.push({ titulo, texto, items: items.filter(Boolean), fig: svg ? { svg } : null });
    const chk = (id) => R.chequeos.find((c) => c.id === id);

    // 1. Cargas y combinaciones
    const k1 = capitulo('cargas', 'Cargas y combinaciones', 'NSR-10 B.2.3 y B.2.4', true);
    diapo(k1, 'Cargas de servicio',
      'Cada columna baja su carga muerta D y su carga viva L. El sismo vertical E se reduce con el coeficiente de disipación R.',
      [eq('Coeficiente de disipación', 'R', 'R_0\\,\\phi_a\\,\\phi_p\\,\\phi_r', n(I.sismo.R0, 2) + '\\cdot' + n(I.sismo.phiA, 2) + '\\cdot' + n(I.sismo.phiP, 2) + '\\cdot' + n(I.sismo.phiR, 2), n(R.R, 2), ''),
        ...R.cols.map((c, i) => eq('Servicio sin sismo, columna ' + nombre[i], 'P_{s' + (i + 1) + '}', 'D + L', v(c.D, 'fuerza') + ' + ' + v(c.L, 'fuerza'), v(c.Ps, 'fuerza'), U('fuerza'), 'carga')),
        ...R.cols.map((c, i) => eq('Servicio con sismo (B.2.3-8), columna ' + nombre[i], 'P_{sE' + (i + 1) + '}', 'D + 0.75\\cdot0.7\\dfrac{E}{R} + 0.75L',
          v(c.D, 'fuerza') + ' + 0.525\\dfrac{' + v(c.E, 'fuerza') + '}{' + n(R.R, 2) + '} + 0.75\\cdot' + v(c.L, 'fuerza'), v(c.PsE, 'fuerza'), U('fuerza')))],
      D.figCargas(R, false));
    diapo(k1, 'Cargas mayoradas',
      'Se evalúan las combinaciones de resistencia y gobierna la que da la mayor carga total sobre la zapata; con ella se diseña todo el elemento.',
      R.ult.lista.map((cb) => ({ t: 'eq', etq: cb.id + (cb.id === R.ult.combo ? ' · gobierna' : ''), liga: 'carga',
        tex: '\\begin{aligned}P_{u1} &= ' + v(cb.P[0], 'fuerza') + U('fuerza') + ' \\\\ P_{u2} &= ' + v(cb.P[1], 'fuerza') + U('fuerza') + ' \\\\ \\Sigma P_u &= ' + (cb.id === R.ult.combo ? '\\boxed{' + v(cb.suma, 'fuerza') + U('fuerza') + '}' : v(cb.suma, 'fuerza') + U('fuerza')) + '\\end{aligned}' })),
      D.figCargas(R, true));

    // 2. Dimensiones en planta
    const k2 = capitulo('planta', 'Dimensiones en planta', 'NSR-10 C.15.2', chk('suelo').ok);
    diapo(k2, 'Centroide de las cargas',
      'Para que la presión del suelo sea uniforme, el centro de la zapata debe coincidir con la resultante de las cargas de servicio. Por eso el largo es el doble de la distancia del lindero al centroide.',
      [eq('Centroide desde el lindero', '\\bar{x}', '\\dfrac{P_{s1}x_1 + P_{s2}x_2}{P_{s1} + P_{s2}}',
        '\\dfrac{' + v(c0.Ps, 'fuerza') + '\\cdot' + v(c0.x, 'longitud') + ' + ' + v(c1.Ps, 'fuerza') + '\\cdot' + v(c1.x, 'longitud') + '}{' + v(c0.Ps + c1.Ps, 'fuerza') + '}', v(R.xbar, 'longitud'), U('longitud'), 'xbar'),
        I.geometria.modoL === 'fijo'
          ? eq('Largo fijado', 'L', null, null, v(R.L, 'longitud'), U('longitud'), 'zapata')
          : eq('Largo (redondeado a 0.05 m)', 'L', '2\\,\\bar{x}', '2\\cdot' + v(R.xbar, 'longitud'), v(R.L, 'longitud'), U('longitud'), 'zapata')],
      D.figCargas(R, false));
    diapo(k2, 'Área y ancho',
      'El área sale de la carga de servicio y del esfuerzo admisible; con sismo el admisible se aumenta. Gobierna el caso que pide más área.',
      [eq('Área sin sismo', 'A_z', '\\dfrac{\\Sigma P_s}{\\sigma_{adm}}', '\\dfrac{' + v(R.Ps, 'fuerza') + '}{' + v(I.suelo.qadm, 'presion') + '}', v(R.serv.Asin, 'area'), U('area'), 'zapata'),
        eq('Área con sismo', 'A_{zE}', '\\dfrac{\\Sigma P_{sE}}{' + n(I.suelo.factorSismo, 2) + '\\,\\sigma_{adm}}', '\\dfrac{' + v(R.PsE, 'fuerza') + '}{' + v(I.suelo.qadm * I.suelo.factorSismo, 'presion') + '}', v(R.serv.Acon, 'area'), U('area')),
        eq('Ancho (redondeado a 0.05 m)', 'B', '\\dfrac{A}{L}', '\\dfrac{' + v(R.serv.A, 'area') + '}{' + v(R.L, 'longitud') + '}', v(R.B, 'longitud'), U('longitud'), 'franja'),
        ver('Presión de servicio', '\\sigma_{max} = ' + v(R.serv.smax, 'presion') + U('presion') + '\\;' + le(R.serv.ok) + '\\;\\sigma_{adm}', R.serv.ok)],
      D.planta(R, 'mm' + Math.random().toString(36).slice(2, 6)));

    // 3. Presión última
    const k3 = capitulo('presion', 'Presión última del suelo', doc ? 'Método del documento' : 'Equilibrio exacto', true);
    diapo(k3, 'Presión última',
      doc ? 'Como en el documento, la presión última se toma uniforme: la suma de las cargas mayoradas sobre el área.'
        : 'La resultante mayorada no cae exactamente en el centro, así que la presión varía en línea recta para que haya equilibrio exacto de fuerzas y momentos.',
      [eq('Presión media', 'q_u', '\\dfrac{\\Sigma P_u}{L\\,B}', '\\dfrac{' + v(R.q.Pu, 'fuerza') + '}{' + v(R.L, 'longitud') + '\\cdot' + v(R.B, 'longitud') + '}', v(R.q.qm, 'presion'), U('presion'), 'presion'),
        eq('Carga lineal hacia arriba', 'w_u', 'q_u\\,B', v(R.q.qm, 'presion') + '\\cdot' + v(R.B, 'longitud'), vW(R.q.w0), uW, 'presion'),
        doc ? null : eq('Presión en los extremos', 'q_{1},\\;q_{2}', null, null, v(R.q.q1, 'presion') + U('presion') + ',\\;' + v(R.q.q2, 'presion'), U('presion'), 'presion')],
      D.figPresion(R));

    // 4. Análisis longitudinal
    const k4 = capitulo('lon', 'Análisis longitudinal', 'Viga invertida', true);
    const p = R.lon.puntos;
    diapo(k4, 'Cortante y momento',
      'La zapata trabaja como una viga invertida: las columnas son los apoyos y el suelo empuja hacia arriba. El momento negativo máximo está donde el cortante es cero, entre columnas.',
      [eq('Cortante en la columna exterior', 'V_{1}', null, null, v(p.ext.Vizq, 'fuerza') + '\\;/\\;' + v(p.ext.Vder, 'fuerza'), U('fuerza'), 'diagrama'),
        eq('Cortante en la columna interior', 'V_{2}', null, null, v(p.int.Vizq, 'fuerza') + '\\;/\\;' + v(p.int.Vder, 'fuerza'), U('fuerza'), 'diagrama'),
        p.V0 !== null ? eq('Cortante nulo desde la columna exterior', 'x_{V=0}', null, null, v(p.V0 - c0.x, 'longitud'), U('longitud'), 'diagrama') : null,
        eq('Momento negativo máximo', 'M_u^{-}', null, null, v(R.lon.Mneg.M, 'momento'), U('momento'), 'diagrama'),
        eq('Momento bajo las columnas', 'M_u^{+}', null, null, v(R.lon.Mpos[0].M, 'momento') + '\\;/\\;' + v(R.lon.Mpos[1].M, 'momento'), U('momento'), 'diagrama')],
      D.figVM(R));

    // 5. Flexión longitudinal
    const k5 = capitulo('fl', 'Flexión longitudinal', 'NSR-10 C.10 y C.7.12', R.fl.sup.ok && R.fl.inf.ok);
    const flex = (etq, f, Mu, b, sel, sub) => [
      eq(etq + ': coeficiente de resistencia', 'R_{n' + sub + '}', '\\dfrac{M_u\\cdot' + convM + '}{\\phi\\,b\\,d^{2}}',
        '\\dfrac{' + v(Mu, 'momento') + '\\cdot' + convM + '}{' + n(m.phiF, 2) + '\\cdot' + v(b, 'corto') + '\\cdot' + v(R.d, 'corto') + '^{2}}', v(f.Rn, 'esfuerzo', 2), U('esfuerzo'), 'diagrama'),
      eq(etq + ': cuantía', '\\rho_{' + sub + '}', '\\max\\left(\\dfrac{0.85f\'_c}{f_y}\\left[1 - \\sqrt{1 - \\dfrac{2R_n}{0.85f\'_c}}\\right],\\;\\rho_{min}\\right)', null, n(f.rho, 4), ''),
      eq(etq + ': acero', 'A_{s' + sub + '}', '\\rho\\,b\\,d' + (f.gobiernaMin && f.base === 'bh' ? '\\;(\\rho_{min}\\,b\\,h)' : ''), null, v(f.As, 'acero'), U('acero')),
      nota('ok', 'Se colocan ' + sel.resumen + '.'),
    ];
    diapo(k5, 'Acero superior', 'El momento negativo tracciona la cara superior entre columnas.', flex('Superior', R.fl.sup, Math.abs(R.lon.Mneg.M), R.B, R.fl.sup.sel, 'sup'), D.corteLongitudinal(R));
    diapo(k5, 'Acero inferior', doc ? 'El momento positivo es pequeño y gobierna la cuantía mínima con b·d, como en el documento.' : 'El momento positivo bajo las columnas es pequeño; gobierna la cuantía mínima de retracción, 0.0018·b·h (NSR-10 C.7.12).',
      flex('Inferior', R.fl.inf, Math.max(0, R.lon.Mpos[0].M, R.lon.Mpos[1].M), R.B, R.fl.inf.sel, 'inf'), D.corteLongitudinal(R));

    // 6. Cortante longitudinal
    const k6 = capitulo('cl', 'Cortante longitudinal', en ? 'ACI 318 22.5' : 'NSR-10 C.11.2', R.cl.ok);
    diapo(k6, 'Cortante a d de la cara',
      doc ? 'Como en el documento, el cortante del centro de la columna se escala a la sección crítica: V_ud = V_u(X − d)/X, con X desde el punto de cortante nulo hasta la cara.'
        : 'La sección crítica está a una distancia d de la cara de cada columna; se toma el mayor cortante de las cuatro secciones.',
      [eq('Cortante actuante', 'V_{ud}', null, null, v(R.cl.Vud, 'fuerza'), U('fuerza'), 'diagrama'),
        eq('Resistencia del concreto', '\\phi V_c', '\\phi\\,' + C.cu + '\\,\\lambda\\sqrt{f\'_c}\\,b\\,d', n(m.phiV, 2) + '\\cdot' + C.cu + '\\cdot' + n(m.lambda, 2) + '\\sqrt{' + v(m.fc, 'esfuerzo') + '}\\cdot' + v(R.B, 'corto') + '\\cdot' + v(R.d, 'corto'), v(R.cl.phiVc, 'fuerza'), U('fuerza')),
        ver('Cortante longitudinal', 'V_{ud} = ' + v(R.cl.Vud, 'fuerza') + U('fuerza') + '\\;' + le(R.cl.ok) + '\\;\\phi V_c', R.cl.ok)],
      D.figVM(R));

    // 7. Punzonamiento
    const k7 = capitulo('pz', 'Punzonamiento', en ? 'ACI 318 22.6' : 'NSR-10 C.11.11', R.pz.every((x) => x.ok));
    R.pz.forEach((z, i) => diapo(k7, 'Columna ' + nombre[i],
      z.lados === 3 ? 'La columna está en el borde: el perímetro crítico tiene tres lados (α<sub>s</sub> = 30).' : 'El perímetro crítico rodea la columna a d/2 de sus caras (α<sub>s</sub> = 40).',
      [eq('Perímetro crítico', 'b_o', null, null, v(z.bo, 'longitud'), U('longitud'), 'perimetro'),
        eq('Cortante actuante', 'V_u', 'P_u - q_u\\,A_o', v(R.cols[i].Pu, 'fuerza') + ' - ' + v(z.Vu === undefined ? 0 : (R.cols[i].Pu - z.Vu) / z.A, 'presion') + '\\cdot' + v(z.A, 'area'), v(z.Vu, 'fuerza'), U('fuerza'), 'area'),
        eq('Resistencia', '\\phi V_c', '\\phi\\min(V_{c1}, V_{c2}, V_{c3})', n(m.phiV, 2) + '\\cdot\\min(' + v(z.Vc1, 'fuerza') + ',\\,' + v(z.Vc2, 'fuerza') + ',\\,' + v(z.Vc3, 'fuerza') + ')', v(z.phiVc, 'fuerza'), U('fuerza')),
        ver('Punzonamiento', 'V_u = ' + v(z.Vu, 'fuerza') + U('fuerza') + '\\;' + le(z.ok) + '\\;\\phi V_c', z.ok)],
      D.figPunz(R, i)));

    // 8. Sentido transversal
    const k8 = capitulo('tr', 'Sentido transversal', 'Franjas bajo las columnas', R.tr.every((t) => t.ok));
    R.tr.forEach((t, i) => diapo(k8, 'Franja ' + nombre[i],
      'Cada columna reparte su carga en una franja de ancho igual a la columna más d a cada lado (recortada por el borde). La franja trabaja como un voladizo a cada lado de la columna.',
      [eq('Ancho de la franja', 'b_' + (i + 1), null, null, v(t.b, 'longitud'), U('longitud'), 'franja'),
        eq('Carga por metro', 'w_u', '\\dfrac{P_u}{B}', '\\dfrac{' + v(R.cols[i].Pu, 'fuerza') + '}{' + v(R.B, 'longitud') + '}', vW(t.wu), uW),
        eq('Momento en la cara', 'M_u', '\\dfrac{w_u\\,L_v^{2}}{2}', '\\dfrac{' + vW(t.wu) + '\\cdot' + v(t.Lv, 'longitud') + '^{2}}{2}', v(t.Mu, 'momento'), U('momento')),
        eq('Acero', 'A_s', null, null, v(t.fl.As, 'acero'), U('acero')),
        ver('Cortante a d de la cara', 'V_u = w_u(L_v - d) = ' + v(t.Vu, 'fuerza') + U('fuerza') + '\\;' + le(t.Vu <= t.phiVc) + '\\;\\phi V_c = ' + v(t.phiVc, 'fuerza') + U('fuerza'), t.Vu <= t.phiVc),
        nota('ok', 'Se colocan ' + t.sel.resumen + '.')],
      D.corteTransversal(R, i)));
    if (R.entre.sel) diapo(k8, 'Entre franjas', 'Fuera de las franjas se coloca el acero mínimo de retracción.',
      [eq('Acero mínimo', 'A_{s,min}', '0.0018\\,b\\,h', '0.0018\\cdot' + v(R.entre.b, 'corto') + '\\cdot' + v(R.h, 'corto'), v(R.entre.As, 'acero'), U('acero'), 'franja'), nota('ok', 'Se colocan ' + R.entre.sel.resumen + '.')],
      D.planta(R, 'mm' + Math.random().toString(36).slice(2, 6)));

    // 9. Aplastamiento y desarrollo
    const k9 = capitulo('ap', 'Aplastamiento y desarrollo', 'NSR-10 C.10.14 y C.12', chk('ap').ok && chk('ld').ok);
    diapo(k9, 'Aplastamiento',
      'La carga de cada columna se apoya sobre la zapata; el área de apoyo A₂ crece con una pendiente 1:2 hasta los bordes.',
      R.ap.map((a, i) => ver('Columna ' + nombre[i], 'P_u = ' + v(R.cols[i].Pu, 'fuerza') + U('fuerza') + '\\;' + le(a.ok) + '\\;\\phi P_{nb} = ' + v(Math.max(a.phiPnb1, a.phiPnb2), 'fuerza') + U('fuerza'), a.ok)),
      D.corteLongitudinal(R));
    diapo(k9, 'Longitudes de desarrollo',
      'Las dovelas deben desarrollarse a compresión dentro de la altura útil; las barras transversales a tracción dentro del voladizo.',
      [...R.ld.dovelas.map((x, i) => ver('Dovelas, columna ' + nombre[i], 'l_{dc} = ' + n(ldV(x.ldc), 0) + ldU + '\\;' + le(x.ok) + '\\;d = ' + n(ldV(x.disponible), 0) + ldU, x.ok)),
        ...R.ld.trans.map((x, i) => ver('Transversal, franja ' + nombre[i], 'l_d = ' + n(ldV(x.ld), 0) + ldU + '\\;' + le(x.ok) + '\\;L_v - r = ' + n(ldV(x.disponible), 0) + ldU, x.ok)),
        eq('Barras superiores (ψt = 1.3)', 'l_{d,sup}', null, null, n(ldV(R.ld.sup), 0), ldU, 'ldc')],
      D.figVM(R));

    // 10. Despiece
    const k10 = capitulo('despiece', 'Despiece', 'Ganchos de 12 db', true);
    diapo(k10, 'Lista de barras',
      'Las barras superiores se cortan a una longitud de desarrollo de los puntos de inflexión; las demás corren de lado a lado con ganchos.',
      R.despiece.marcas.map((x) => nota('ok', '<b>' + x.marca + '</b> · ' + x.desc + ': ' + x.n + ' #' + x.barra + ' de ' + x.largo.toFixed(2) + ' m (' + x.kg.toFixed(1) + ' kg)'))
        .concat([nota('ok', '<b>Total: ' + R.despiece.total.toFixed(1) + ' kg</b>')]),
      D.corteLongitudinal(R));

    // 11. Conclusiones
    const k11 = capitulo('fin', 'Conclusiones', '', R.todoOk);
    diapo(k11, R.todoOk ? 'El diseño cumple' : 'El diseño no cumple',
      R.resumen + ' ' + (R.todoOk ? 'Todos los chequeos cumplen con las cargas consideradas.' : 'Revise las dimensiones o el refuerzo hasta que todos los chequeos cumplan.'),
      R.chequeos.map((c) => ver(c.titulo, '\\text{Utilización} = ' + n(c.util * 100, 0) + '\\,\\%', c.ok)).concat(R.avisos.map((a) => nota('mal', a))),
      D.planta(R, 'mm' + Math.random().toString(36).slice(2, 6)));
    return caps;
  }

  // Notas de corrección respecto al documento (solo en pantalla)
  function correcciones(R) {
    if (R.inp.metodo === 'documento') return [];
    return [
      'Momento bajo la columna interior: el documento da 81.26 tonf·m con presión uniforme; con equilibrio exacto ambos lados del diagrama coinciden.',
      'Cuantía mínima de losas y zapatas: 0.0018·b·h (NSR-10 C.7.12), no 0.0018·b·d.',
      'El documento no revisa punzonamiento, aplastamiento ni desarrollo; aquí se agregan.',
      'Cortante longitudinal: se toma el cortante exacto a d de la cara, no el del centro escalado.',
    ];
  }

  global.MemoriaCombinada = { generar, correcciones, LIGAS };
})(window);

/* Memoria de cálculo: convierte los resultados del motor en pasos legibles
 * (fórmula → valores reemplazados → resultado), siguiendo el orden del documento.
 */
(function (global) {
  'use strict';

  const n = (x, dec = 2) => (x == null || isNaN(x) ? '—' : Number(x).toFixed(dec));
  const v = (x, dec = 3) => '<span class="num">' + n(x, dec) + '</span>';

  // Fila de memoria: etiqueta, fórmula simbólica, sustitución, resultado.
  function fila(etq, formula, sust, res, unidad, ok) {
    return { etq, formula, sust, res, unidad, ok };
  }

  function nota(tipo, html) { return { nota: true, tipo, html }; }

  function generar(R) {
    const I = R.inp;
    const c = I.columna, m = I.materiales;
    const s = R.serv, u = R.ult, pz = R.pz, cu = R.cu, fx = R.fx, fy = R.fy, ap = R.ap, ld = R.ld;
    const secciones = [];

    // 1. Área y esfuerzos de servicio
    const f1 = [];
    if (s.W > 0) {
      f1.push(fila('Peso propio + suelo', 'W = Lx·Ly·(h·γc + (Df − h)·γs)',
        n(R.Lx) + '·' + n(R.Ly) + '·(' + n(R.h) + '·' + n(I.suelo.gc) + ' + ' + n(Math.max(I.suelo.Df - R.h, 0)) + '·' + n(I.suelo.gs) + ')',
        s.W, 'tonf'));
    }
    f1.push(fila('Carga de servicio', 'Ps = P(PP+CM) + P(CV)' + (s.W > 0 ? ' + W' : ''),
      n(Math.abs(I.cargas.D.P), 3) + ' + ' + n(Math.abs(I.cargas.L.P), 3) + (s.W > 0 ? ' + ' + n(s.W, 3) : ''), s.P, 'tonf'));
    f1.push(fila('Momento de servicio X', 'Mxs = Mx(PP+CM) + Mx(CV)', n(Math.abs(I.cargas.D.Mx), 3) + ' + ' + n(Math.abs(I.cargas.L.Mx), 3), s.Mx, 'tonf·m'));
    f1.push(fila('Momento de servicio Y', 'Mys = My(PP+CM) + My(CV)', n(Math.abs(I.cargas.D.My), 3) + ' + ' + n(Math.abs(I.cargas.L.My), 3), s.My, 'tonf·m'));
    f1.push(fila('Área requerida (solo axial)', 'Az = Ps / σadm', n(s.P, 3) + ' / ' + n(I.suelo.qadm), s.Areq, 'm²'));
    f1.push(fila('Área adoptada', 'A = Lx·Ly', n(R.Lx) + '·' + n(R.Ly), s.A, 'm²'));
    f1.push(fila('Inercia en X', 'Ix = Lx·Ly³/12', n(R.Lx) + '·' + n(R.Ly) + '³/12', s.Ix, 'm⁴'));
    f1.push(fila('Inercia en Y', 'Iy = Ly·Lx³/12', n(R.Ly) + '·' + n(R.Lx) + '³/12', s.Iy, 'm⁴'));
    f1.push(fila('Excentricidad X', 'ex = Mys/Ps  vs  Lx/6', n(s.My, 3) + '/' + n(s.P, 3) + '  vs  ' + n(R.Lx / 6, 3), s.ex, 'm'));
    f1.push(fila('Excentricidad Y', 'ey = Mxs/Ps  vs  Ly/6', n(s.Mx, 3) + '/' + n(s.P, 3) + '  vs  ' + n(R.Ly / 6, 3), s.ey, 'm'));
    const sig = (i, sx, sy) => fila('σ' + i + ' servicio',
      'σ' + i + ' = P/A ' + sx + ' Mx·(Ly/2)/Ix ' + sy + ' My·(Lx/2)/Iy',
      n(s.P, 3) + '/' + n(s.A, 3) + ' ' + sx + ' ' + n(s.Mx, 3) + '·' + n(R.Ly / 2, 3) + '/' + n(s.Ix, 3) + ' ' + sy + ' ' + n(s.My, 3) + '·' + n(R.Lx / 2, 3) + '/' + n(s.Iy, 3),
      s['s' + i], 'tonf/m²', s['s' + i] <= I.suelo.qadm && s['s' + i] > 0);
    f1.push(sig(1, '+', '+'), sig(2, '−', '+'), sig(3, '−', '−'), sig(4, '+', '−'));
    f1.push(nota(s.caso === 'A' ? 'ok' : 'mal',
      'Caso <b>' + s.caso + '</b>: ' + (s.caso === 'A'
        ? 'toda la base está en compresión (excentricidad dentro del núcleo central).'
        : s.caso === 'B' ? 'un extremo queda con esfuerzo cero. El documento lo considera MAL.'
          : 'un extremo queda en tensión y el suelo no la resiste. Aumente las dimensiones.')));
    secciones.push({ id: 'serv', titulo: '1. Área de la zapata y esfuerzos de servicio', ok: R.chequeos[0].ok, filas: f1 });

    // 2. Esfuerzos últimos y punzonamiento
    const f2 = [];
    u.lista.forEach((cb) => {
      f2.push(fila('Combinación ' + cb.id, 'Pu, Mxu, Myu', n(cb.P, 2) + ' tonf · ' + n(cb.Mx, 3) + ' · ' + n(cb.My, 3) + ' tonf·m → σmax',
        cb.su, 'tonf/m²'));
    });
    f2.push(nota('info', 'Gobierna <b>' + u.gob.id + '</b>. Se diseña con el esfuerzo máximo de las cuatro esquinas, como en el documento.'));
    const sigu = (i, sx, sy) => fila('σ' + i + 'u',
      'σ' + i + 'u = Pu/A ' + sx + ' Mxu·(Ly/2)/Ix ' + sy + ' Myu·(Lx/2)/Iy',
      n(u.P, 3) + '/' + n(u.A, 3) + ' ' + sx + ' ' + n(u.Mx, 3) + '·' + n(R.Ly / 2, 3) + '/' + n(u.Ix, 3) + ' ' + sy + ' ' + n(u.My, 3) + '·' + n(R.Lx / 2, 3) + '/' + n(u.Iy, 3),
      u['s' + i], 'tonf/m²');
    f2.push(sigu(1, '+', '+'), sigu(2, '−', '+'), sigu(3, '−', '−'), sigu(4, '+', '−'));
    f2.push(fila('Esfuerzo último de diseño', 'σu = max(σ1u … σ4u)', '', u.su, 'tonf/m²'));
    f2.push(fila('Relación de lados columna', 'β = max(Cx,Cy)/min(Cx,Cy)', n(Math.max(c.Cx, c.Cy)) + '/' + n(Math.min(c.Cx, c.Cy)), pz.beta, ''));
    f2.push(fila('Perímetro crítico', 'bo = 2(Cx + d) + 2(Cy + d)', '2(' + n(c.Cx) + ' + ' + n(d3(R.d)) + ') + 2(' + n(c.Cy) + ' + ' + n(d3(R.d)) + ')', pz.bo, 'm'));
    f2.push(fila('Área a cortante doble', 'A2D = Lx·Ly − (Cx + d)(Cy + d)', n(R.Lx) + '·' + n(R.Ly) + ' − ' + n(c.Cx + R.d, 3) + '·' + n(c.Cy + R.d, 3), pz.A2D, 'm²'));
    f2.push(fila('Cortante último', 'Vu2D = σu·A2D', n(u.su, 3) + '·' + n(pz.A2D, 3), pz.Vu, 'tonf'));
    const raiz = 'λ√f\'c·bo·d';
    const sus = n(m.lambda) + '·√' + n(m.fc, 0) + '·' + n(pz.bo * 100, 1) + '·' + n(R.d * 100, 1) + ' / 1000';
    f2.push(fila('C.11-31', 'Vc1 = 0.53(1 + 2/β)·' + raiz, '0.53(1 + 2/' + n(pz.beta, 3) + ')·' + sus, pz.Vc1, 'tonf'));
    f2.push(fila('C.11-32', 'Vc2 = 0.27(αs·d/bo + 2)·' + raiz, '0.27(' + c.alpha + '·' + n(R.d, 3) + '/' + n(pz.bo, 3) + ' + 2)·' + sus, pz.Vc2, 'tonf'));
    f2.push(fila('C.11-33', 'Vc3 = 1.0·' + raiz, sus, pz.Vc3, 'tonf'));
    f2.push(fila('Resistencia', 'φVc = φv·min(Vc1, Vc2, Vc3)', n(m.phiV) + '·' + n(pz.Vc), pz.phiVc, 'tonf', pz.ok));
    if (!pz.dentro) f2.push(nota('aviso', 'El perímetro crítico (Cx + d, Cy + d) se sale de la zapata: el punzonamiento no se desarrolla como se supone. Revise las dimensiones.'));
    secciones.push({ id: 'pz', titulo: '2. Diseño a cortante en dos direcciones', ok: pz.ok, filas: f2 });

    // 3. Cortante en una dirección
    const f3 = [];
    f3.push(fila('Área tributaria X', 'Ax = Ly·((Lx − Cx)/2 − d)', n(R.Ly) + '·((' + n(R.Lx) + ' − ' + n(c.Cx) + ')/2 − ' + n(R.d, 3) + ')', cu.x.A, 'm²'));
    f3.push(fila('Cortante último X', 'Vux = σu·Ax', n(u.su, 3) + '·' + n(cu.x.A, 3), cu.x.Vu, 'tonf'));
    f3.push(fila('Resistencia X', 'φVcx = φv·0.53·λ√f\'c·Ly·d', n(m.phiV) + '·0.53·' + n(m.lambda) + '·√' + n(m.fc, 0) + '·' + n(R.Ly * 100, 0) + '·' + n(R.d * 100, 1) + ' / 1000', cu.x.phiVc, 'tonf', cu.x.ok));
    f3.push(fila('Área tributaria Y', 'Ay = Lx·((Ly − Cy)/2 − d)', n(R.Lx) + '·((' + n(R.Ly) + ' − ' + n(c.Cy) + ')/2 − ' + n(R.d, 3) + ')', cu.y.A, 'm²'));
    f3.push(fila('Cortante último Y', 'Vuy = σu·Ay', n(u.su, 3) + '·' + n(cu.y.A, 3), cu.y.Vu, 'tonf'));
    f3.push(fila('Resistencia Y', 'φVcy = φv·0.53·λ√f\'c·Lx·d', n(m.phiV) + '·0.53·' + n(m.lambda) + '·√' + n(m.fc, 0) + '·' + n(R.Lx * 100, 0) + '·' + n(R.d * 100, 1) + ' / 1000', cu.y.phiVc, 'tonf', cu.y.ok));
    if (cu.x.k <= 0 || cu.y.k <= 0) f3.push(nota('info', 'La sección crítica (a una distancia d de la cara) queda fuera de la zapata en alguna dirección: el cortante en esa dirección es cero.'));
    secciones.push({ id: 'cu', titulo: '3. Diseño a cortante en una dirección', ok: cu.x.ok && cu.y.ok, filas: f3 });

    // 4. Flexión
    const f4 = [];
    const flex = (dir, F, L, C, b, bNom, sel) => {
      f4.push({ sub: 'Momento en la dirección ' + dir });
      f4.push(fila('Voladizo', 'K' + dir.toLowerCase() + ' = (L' + dir.toLowerCase() + ' − C' + dir.toLowerCase() + ')/2', '(' + n(L) + ' − ' + n(C) + ')/2', F.K, 'm'));
      f4.push(fila('Área que genera flexión', 'A' + dir.toLowerCase() + 'f = ' + bNom + '·K' + dir.toLowerCase(), n(b) + '·' + n(F.K, 3), F.Af, 'm²'));
      f4.push(fila('Fuerza', 'F = σu·Af', n(u.su, 3) + '·' + n(F.Af, 3), F.F, 'tonf'));
      f4.push(fila('Momento último', 'Mu = F·K/2', n(F.F, 3) + '·' + n(F.K, 3) + '/2', F.Mu, 'tonf·m'));
      f4.push(fila('Coeficiente de resistencia', 'Rn = Mu/(φf·b·d²)', n(F.Mu * 1e5, 0) + '/(' + n(m.phiF) + '·' + n(b * 100, 0) + '·' + n(R.d * 100, 1) + '²)', F.Rn, 'kgf/cm²'));
      f4.push(fila('Cuantía calculada', 'ρ = (0.85f\'c/fy)(1 − √(1 − 2Rn/(0.85f\'c)))', '(0.85·' + n(m.fc, 0) + '/' + n(m.fy, 0) + ')(1 − √(1 − 2·' + n(F.Rn, 3) + '/(0.85·' + n(m.fc, 0) + ')))', F.rhoCalc, '', null, 5));
      f4.push(fila('Cuantía de diseño', 'ρ = max(ρcalc, 0.0018) ≤ ρmax', 'ρmax = ' + n(F.rhoMax, 4) + (F.gobiernaMin ? ' · gobierna ρmin' : ''), F.rho, '', F.ok, 5));
      f4.push(fila('Acero requerido', 'As = ρ·b·d', n(F.rho, 4) + '·' + n(b * 100, 0) + '·' + n(R.d * 100, 1), F.As, 'cm²'));
      f4.push(fila('Armado elegido', 'n #barra @ s', sel.n + ' #' + sel.barra + ' @ ' + n(sel.s) + ' m · As prov = ' + n(sel.AsProv) + ' cm² (' + n(sel.ratio * 100, 0) + '%)', sel.s, 'm', sel.estado !== 'mal'));
    };
    flex('X', fx, R.Lx, c.Cx, R.Ly, 'Ly', R.acero.selX);
    flex('Y', fy, R.Ly, c.Cy, R.Lx, 'Lx', R.acero.selY);
    f4.push(nota('pdf', 'Corrección respecto al documento (pág. 10): allí se escribe A<sub>yf</sub> = Lx·Ky pero se calcula Ly·Ky = ' + n(fy.AfPdf) + ' m², lo que da Mu<sub>y</sub> = ' + n(fy.MuPdf) + ' tonf·m. Con Lx·Ky el valor correcto es <b>' + n(fy.Mu) + ' tonf·m</b>. Además, ρ<sub>y</sub> debe usar R<sub>ny</sub> (el documento usa R<sub>nx</sub>).'));
    f4.push(nota('info', 'Se usa el mismo d en ambas direcciones y ρmin = 0.0018 sobre b·d, como en el documento. Separación máxima: min(3h, 45 cm) = ' + n(Math.min(3 * R.h, 0.45)) + ' m.'));
    secciones.push({ id: 'fl', titulo: '4. Diseño a flexión', ok: R.chequeos[3].ok, filas: f4 });

    // 5. Aplastamiento
    const f5 = [];
    f5.push(fila('Carga axial mayorada', 'Pu', u.gob.id, u.P, 'tonf'));
    f5.push(fila('Área cargada', 'A1 = Cx·Cy', n(c.Cx) + '·' + n(c.Cy), ap.A1, 'm²'));
    f5.push(fila('Base de la pirámide', 'A2 = min(Cx + 4h, Lx)·min(Cy + 4h, Ly)', 'min(' + n(ap.a2x, 3) + ', ' + n(R.Lx) + ')·min(' + n(ap.a2y, 3) + ', ' + n(R.Ly) + ')', ap.A2, 'm²'));
    f5.push(fila('Base de la columna', 'φPnb1 = φ·0.85·f\'c·A1', n(m.phiB) + '·0.85·' + n(m.fc, 0) + '·' + n(ap.A1 * 1e4, 0) + ' / 1000', ap.phiPnb1, 'tonf', ap.ok1));
    f5.push(fila('Factor de confinamiento', 'K = min(√(A2/A1), 2)', '√(' + n(ap.A2, 3) + '/' + n(ap.A1, 3) + ') = ' + n(ap.raiz, 3), ap.K, ''));
    f5.push(fila('Base de la zapata', 'φPnb2 = φ·0.85·f\'c·A1·K', n(ap.phiPnb1, 2) + '·' + n(ap.K, 3), ap.phiPnb2, 'tonf', ap.ok2));
    if (ap.recortada) f5.push(nota('pdf', 'A2 se limita al área de la zapata. El documento usa (Cx + 4h)(Cy + 4h) = ' + n(ap.A2sin) + ' m² sin recortar; en el ejemplo no cambia el resultado porque K queda limitado a 2.'));
    secciones.push({ id: 'ap', titulo: '5. Resistencia al aplastamiento', ok: ap.ok1 && ap.ok2, filas: f5 });

    // 6. Longitud de desarrollo
    const f6 = [];
    f6.push(fila('Barra de la columna', '#' + ld.barra, 'db = ' + n(ld.db, 1) + ' mm · fy = ' + n(ld.fyM, 1) + ' MPa · f\'c = ' + n(ld.fcM, 2) + ' MPa', ld.db, 'mm'));
    f6.push(fila('Longitud básica', 'ldc = 0.24·db·fy/(λ√f\'c)', '0.24·' + n(ld.db, 1) + '·' + n(ld.fyM, 1) + '/(' + n(m.lambda) + '·√' + n(ld.fcM, 2) + ')', ld.l1, 'mm'));
    f6.push(fila('Mínimo', 'ldc ≥ 0.043·db·fy ≥ 200 mm', '0.043·' + n(ld.db, 1) + '·' + n(ld.fyM, 1), ld.l2, 'mm'));
    f6.push(fila('Longitud de desarrollo', 'ldc = max(…)', '', ld.ldc, 'mm'));
    f6.push(fila('Disponible en la zapata', 'h − r', n(R.h * 1000, 0) + ' − ' + n(R.r * 1000, 0), ld.disponible, 'mm', ld.ok));
    if (ld.tabla != null) f6.push(nota('info', 'Referencia Tabla 4.21 (Segura, fy = 420 MPa) interpolada para f\'c = ' + n(ld.fcM, 1) + ' MPa: <b>' + n(ld.tabla, 0) + ' mm</b>.'));
    f6.push(nota('info', 'No se aplica la reducción As requerido/As suministrado. Las dovelas terminan en gancho de 90° apoyado sobre la parrilla inferior.'));
    f6.push(fila('Peralte mínimo', 'd ≥ 150 mm (C.15.7)', n(R.d * 1000, 0) + ' mm', R.d * 1000, 'mm', R.dMinOk));
    secciones.push({ id: 'ld', titulo: '6. Longitud de desarrollo', ok: R.chequeos[5].ok, filas: f6 });

    return secciones;
  }

  function d3(x) { return Number(x.toFixed(3)); }

  function aHtml(secciones, abiertas) {
    return secciones.map((sec, i) => {
      const cuerpo = sec.filas.map((f) => {
        if (f.sub) return '<tr class="sub"><th colspan="4">' + f.sub + '</th></tr>';
        if (f.nota) return '<tr class="nota nota-' + f.tipo + '"><td colspan="4">' + f.html + '</td></tr>';
        const estado = f.ok === true ? '<span class="tag tag-ok">OK</span>' : f.ok === false ? '<span class="tag tag-mal">MAL</span>' : '';
        const dec = f.res != null && Math.abs(f.res) < 0.1 && f.res !== 0 ? 4 : 3;
        return '<tr>' +
          '<td class="m-etq">' + f.etq + '</td>' +
          '<td class="m-for"><span class="f">' + f.formula + '</span>' + (f.sust ? '<span class="s">' + f.sust + '</span>' : '') + '</td>' +
          '<td class="m-res">' + v(f.res, dec) + ' <span class="u">' + (f.unidad || '') + '</span></td>' +
          '<td class="m-est">' + estado + '</td></tr>';
      }).join('');
      return '<details class="paso" id="paso-' + sec.id + '"' + (abiertas || i === 0 ? ' open' : '') + '>' +
        '<summary><span class="paso-tit">' + sec.titulo + '</span>' +
        '<span class="tag ' + (sec.ok ? 'tag-ok' : 'tag-mal') + '">' + (sec.ok ? 'OK' : 'MAL') + '</span></summary>' +
        '<div class="tabla-scroll"><table class="memoria"><thead><tr><th>Concepto</th><th>Fórmula y sustitución</th><th>Resultado</th><th></th></tr></thead><tbody>' + cuerpo + '</tbody></table></div></details>';
    }).join('');
  }

  global.Memoria = { generar, aHtml };
})(window);

/* Armado 3D compartido: el acero de la zapata aislada y de la combinada tal como se coloca en obra, para todos los 3D
 * (Planos de la aislada y de la combinada, y los mini-3D de la memoria).
 * - Armado.aislada(R) y Armado.combinada(R) devuelven las marcas: forma de una barra en su plano (u a lo largo, v vertical),
 *   diámetro y dónde va cada copia [x, y, z, giro]. Coordenadas centradas en la zapata, y hacia arriba, en metros.
 * - Armado.malla(THREE, marca, opciones) arma una malla instanciada por marca, con los dobleces curvos.
 * Ganchos de 90°: 12 db rectos después del doblez (NSR-10 C.7.1); doblez de diámetro interior 6 db (C.7.2, barras #3 a #8).
 */
(function (global) {
  'use strict';
  const COLOR = { L1: 0x4f7cb3, L3: 0x8db8f2, L4: 0x8db8f2, T4: 0x7aa3d6, L2: 0x8a9099, T1: 0xb08a4a, T2: 0xb08a4a, T3: 0xc9a66b, D: 0x6c8a5a, X: 0x8a9099, Y: 0xb08a4a };
  const GIRO_Z = -Math.PI / 2; // la barra local (eje u) queda paralela a z

  // Barra recta de largo `largo` con gancho opcional en cada punta, hacia arriba (dir = 1) o hacia abajo (dir = -1)
  function recta(largo, db, gIni, gFin, dir, alto) {
    const G = Math.min(15.5 * db, alto || Infinity) * dir; // 12 db + el doblez (3.5 db al eje)
    return [].concat(gIni ? [[0, G]] : [], [[0, 0], [largo, 0]], gFin ? [[largo, G]] : []);
  }

  // Forma de la marca, con sus datos para poder cortarla (Armado.cortar)
  const forma = (largo, db, gIni, gFin, dir, alto) => ({ pts: recta(largo, db, gIni, gFin, dir, alto), r: { largo, gIni, gFin, dir, alto } });

  // Posiciones repartidas de a hasta b (n barras; una sola va al centro)
  const reparto = (a, b, n) => Array.from({ length: n }, (_, j) => a + (b - a) * (n > 1 ? j / (n - 1) : 0.5));

  // Dovelas: vertical desde la parrilla inferior hasta arriba de la zapata, con gancho de 12 db hacia el centro de la columna
  function dovelas(pts, db, y0, y1, cx, marca, etq, grupo) {
    const G = 15.5 * db;
    return { marca, etq, grupo, db, pts: [[G, 0], [0, 0], [0, y1 - y0]],
      inst: pts.map(([x, z]) => [cx + x, y0, z, Math.atan2(z, -x)]) }; // eje u local apunta al centro (−x, −z)
  }

  function aislada(R) {
    const D = global.Dibujo, rd = D.refuerzoDibujo(R), { Lx, Ly, h, r } = R, out = [];
    const altoCol = Math.max(1.0, h * 2), dx = rd.X.db / 1000, dy = rd.Y.db / 1000, alto = h - 2 * r;
    const nom = (c) => (rd.malla ? 'Malla ' : 'Barras ') + c.etq;
    const X = { marca: 'X', etq: nom(rd.X) + ', paralelas a X', grupo: 'inf', db: dx, mal: rd.X.mal, ...forma(Lx - 2 * r, dx, !rd.malla, !rd.malla, 1, alto), inst: [] };
    const Y = { marca: 'Y', etq: nom(rd.Y) + ', paralelas a Y', grupo: 'inf', db: dy, mal: rd.Y.mal, ...forma(Ly - 2 * r, dy, !rd.malla, !rd.malla, 1, alto), inst: [] };
    for (let capa = 0; capa < rd.capas; capa++) {
      const base = r + capa * (dx + dy);
      D.posicionesParrilla(Ly, r, rd.X).forEach((py) => X.inst.push([-Lx / 2 + r, base + dx / 2, -py, 0]));
      D.posicionesParrilla(Lx, r, rd.Y).forEach((px) => Y.inst.push([px, base + dx + dy / 2, -(Ly / 2 - r), GIRO_Z]));
    }
    out.push(X, Y);
    const col = R.inp.columna, dd = R.ld.db / 1000;
    const pts = D.barrasColumna(col.Cx, col.Cy, col.nBarras, 0.05).map(([x, y]) => [x, -y]);
    const d = dovelas(pts, dd, r + rd.capas * (dx + dy) + dd / 2, h + altoCol - 0.02, 0, 'D',
      'Dovelas ' + col.nBarras + ' #' + R.ld.barra + ', ldc ' + global.Unidades.fmt(R.ld.ldc, 'ldmm'), 'dovelas');
    d.mal = !R.ld.ok;
    out.push(d);
    return out;
  }

  function combinada(R) {
    const RF = global.Refuerzo, L = R.L, B = R.B, h = R.h, r = R.inp.zapata.r, alto = h - 2 * r;
    const X = (x) => x - L / 2, Z = (z) => z - B / 2, db = (n) => RF.BARS[n].db / 1000, out = [];
    const sup = R.fl.sup.sel, inf = R.fl.inf.sel, sm = R.supMin;
    const filas = (n) => reparto(r, B - r, n);
    // Inferior: L2 abajo de lado a lado; las transversales encima
    const d2 = db(inf.barra), yL2 = r + d2 / 2;
    if (inf.n) out.push({ marca: 'L2', grupo: 'inf', etq: 'L2 · Inferior: ' + inf.resumen, db: d2, ...forma(L - 2 * r, d2, true, true, 1, alto),
      inst: filas(inf.n).map((z) => [X(r), yL2, Z(z), 0]) });
    const transv = (marca, sel, xs, etq) => {
      if (!sel || !xs.length) return;
      const dt = db(sel.barra);
      out.push({ marca, grupo: 'trans', etq, db: dt, ...forma(B - 2 * r, dt, true, true, 1, alto), inst: xs.map((x) => [X(x), r + d2 + dt / 2, Z(r), GIRO_Z]) });
    };
    R.tr.forEach((t, i) => transv('T' + (i + 1), t.sel, reparto(Math.max(r, t.x0), Math.min(L - r, t.x1), t.sel.n), 'T' + (i + 1) + ' · Franja ' + (i ? 'interior' : 'exterior') + ': ' + t.sel.resumen));
    if (R.entre.sel) {
      const tramos = [[r, R.tr[0].x0], [R.tr[0].x1, R.tr[1].x0], [R.tr[1].x1, L - r]].filter(([a, b]) => b - a > 0.05);
      const total = tramos.reduce((s, [a, b]) => s + b - a, 0);
      // en cada tramo, sin repetir la barra del borde de la franja
      const xs = [].concat(...tramos.map(([a, b]) => { const n = Math.max(1, Math.round(R.entre.sel.n * (b - a) / total)), s = (b - a) / n; return reparto(a + s / 2, b - s / 2, n); }));
      transv('T3', R.entre.sel, xs, 'T3 · Entre franjas: ' + R.entre.sel.resumen);
    }
    // Superior: L1 arriba, cortada a ld de los puntos de inflexión; L3 y L4 empalmadas a su lado; T4 de repartición debajo
    const d1 = db(sup.barra), yL1 = h - r - d1 / 2;
    if (sup.n) out.push({ marca: 'L1', grupo: 'sup', etq: 'L1 · Superior: ' + sup.resumen, db: d1, ...forma(sm.xb - sm.xa, d1, sm.xa <= r + 1e-9, sm.xb >= L - r - 1e-9, -1, alto),
      inst: filas(sup.n).map((z) => [X(sm.xa), yL1, Z(z), 0]) });
    const d3 = db(sm.sel.barra);
    sm.tramos.forEach((t) => {
      const ext = t.x0 <= r + 1e-9;
      out.push({ marca: t.marca, grupo: 'min', etq: t.marca + ' · Superior mínima, extremo ' + t.lado + ': ' + sm.sel.resumen, db: d3,
        ...forma(t.x1 - t.x0, d3, ext, !ext, -1, alto), inst: filas(sm.sel.n).map((z) => [X(t.x0), h - r - d3 / 2, Z(Math.min(B - r, z + (d1 + d3) / 2)), 0]) });
    });
    const d4 = db(sm.trans.sel.barra);
    out.push({ marca: 'T4', grupo: 'min', etq: 'T4 · Repartición superior: ' + sm.trans.sel.resumen, db: d4, ...forma(B - 2 * r, d4, true, true, -1, alto),
      inst: reparto(r, L - r, sm.trans.sel.n).map((x) => [X(x), h - r - Math.max(d1, d3) - d4 / 2, Z(r), GIRO_Z]) });
    // Dovelas sobre la parrilla inferior
    const yApoyo = r + d2 + db((R.tr[0].sel || {}).barra || inf.barra);
    R.cols.forEach((c, i) => {
      const col = R.inp.columnas[i], dd = db(col.barra);
      out.push(dovelas(global.Dibujo.barrasColumna(c.c1, c.c2, col.nBarras, 0.05), dd, yApoyo + dd / 2, h + 0.9, X(c.x), 'D' + (i + 1),
        'D' + (i + 1) + ' · Dovelas: ' + col.nBarras + ' #' + col.barra, 'dovelas'));
    });
    return out;
  }

  // Corte por un plano x = c o z = c: se queda el lado `lado` (−1 menor, +1 mayor). Las barras que cruzan el plano se acortan
  // y pierden el gancho de esa punta; las dovelas se quedan si están del lado. Devuelve null si no queda nada.
  function cortar(m, eje, c, lado) {
    const k = eje === 'x' ? 0 : 2, dentro = (v) => (v - c) * lado >= -1e-9;
    if (!m.r) { const inst = m.inst.filter((i) => dentro(i[k])); return inst.length ? Object.assign({}, m, { inst }) : null; }
    const { largo, gIni, gFin, dir, alto } = m.r, paralela = (i) => (Math.abs(i[3]) < 1e-9 ? 0 : 2) === k;
    const inst = [];
    let r = m.r;
    m.inst.forEach((i) => {
      if (!paralela(i)) { if (dentro(i[k])) inst.push(i); return; }
      const a = i[k], b = a + largo;
      if (lado < 0 ? a >= c : b <= c) return; // toda del otro lado
      if (lado < 0 ? b <= c : a >= c) { inst.push(i); return; } // toda de este lado
      const j = i.slice();
      if (lado < 0) r = { largo: c - a, gIni, gFin: false, dir, alto };
      else { j[k] = c; r = { largo: b - c, gIni: false, gFin, dir, alto }; }
      inst.push(j);
    });
    if (!inst.length) return null;
    return Object.assign({}, m, { inst, r, pts: recta(r.largo, m.db, r.gIni, r.gFin, r.dir, r.alto) });
  }

  // Esquinas redondeadas: cada esquina interior se cambia por un arco de radio rd (curva de Bézier, 6 tramos)
  function redondear(pts, rd) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [a, p, b] = [pts[i - 1], pts[i], pts[i + 1]];
      const la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), k = Math.min(rd, la / 2, lb / 2);
      const s = [p[0] - (p[0] - a[0]) / la * k, p[1] - (p[1] - a[1]) / la * k], e = [p[0] + (b[0] - p[0]) / lb * k, p[1] + (b[1] - p[1]) / lb * k];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6, u = 1 - t;
        out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // Tubo a lo largo de una polilínea del plano (u, v), con marcos de transporte paralelo para que no se tuerza
  function tubo(THREE, pts2, radio, lados) {
    const P = pts2.map(([u, v]) => new THREE.Vector3(u, v, 0)), n = P.length;
    const T = P.map((p, i) => new THREE.Vector3().subVectors(P[Math.min(i + 1, n - 1)], P[Math.max(i - 1, 0)]).normalize());
    let N = new THREE.Vector3(0, 0, 1);
    const pos = [], nor = [], idx = [], q = new THREE.Quaternion(), v = new THREE.Vector3(), Bn = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (i) N.applyQuaternion(q.setFromUnitVectors(T[i - 1], T[i]));
      Bn.crossVectors(T[i], N);
      for (let k = 0; k <= lados; k++) {
        const a = k / lados * Math.PI * 2;
        v.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(Bn, Math.sin(a));
        nor.push(v.x, v.y, v.z); pos.push(P[i].x + v.x * radio, P[i].y + v.y * radio, P[i].z + v.z * radio);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < lados; k++) {
      const a = i * (lados + 1) + k, b = a + lados + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }

  // Malla instanciada de una marca. op: { material(color, marca) opcional, lados, grosor (para que las barras finas se lean), colorMal }
  function malla(THREE, m, op) {
    op = op || {};
    const grosor = op.grosor || 1, color = m.mal && op.colorMal ? op.colorMal : (COLOR[m.marca] || COLOR[m.marca[0]] || 0x8a9099);
    const geo = tubo(THREE, redondear(m.pts, 3.5 * m.db), m.db / 2 * grosor, op.lados || 8);
    const mat = op.material ? op.material(color, m) : new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.38 });
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, m.inst.length));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    m.inst.forEach(([x, y, z, giro], i) => { M.compose(P.set(x, y, z), Q.setFromAxisAngle(Y, giro), S); im.setMatrixAt(i, M); });
    im.count = m.inst.length;
    im.userData = { grupo: m.grupo, etq: m.etq, nombre: m.etq, marca: m.marca, mat };
    return im;
  }

  global.Armado = { COLOR, aislada, combinada, malla, cortar, recta, redondear };
})(window);

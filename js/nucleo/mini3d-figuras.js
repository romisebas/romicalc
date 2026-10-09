/* Escenas del mini-3D (js/nucleo/mini3d.js) para las figuras de la memoria de la zapata aislada y de la combinada.
 * Cada escena recibe (THREE, R, figura, materiales) y devuelve { grupo, dir (desde dónde mira la cámara), etiquetas
 * [{ p, html }], ligas { nombre: [mallas] } }. Medidas reales en metros: x y z en planta, y hacia arriba.
 * Los nombres de las ligas son los de las ecuaciones de la memoria (zapata, columna, carga, perimetro, area, seccion,
 * voladizo, diagrama, esquina, presion, xbar).
 */
(function (global) {
  'use strict';
  const UN = () => global.Unidades;
  const fmt = (v, mag) => UN().fmt(v, mag);
  const sub = (a, b, resto) => a + '<sub>' + b + '</sub>' + (resto || '');

  function ayudas(THREE, m) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const arista = new THREE.LineBasicMaterial({ color: 0x1d1d1d, transparent: true, opacity: 0.45 });
    const pieza = (g, geo, mat, conArista) => {
      const p = new THREE.Mesh(geo, mat);
      p.userData.mat0 = mat;
      if (conArista !== false) p.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), arista));
      g.add(p);
      return p;
    };
    // caja por sus límites
    const caja = (g, x0, x1, y0, y1, z0, z1, mat, conArista) => {
      const p = pieza(g, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, conArista);
      p.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return p;
    };
    // flecha recta de a hacia b (el cuerpo y la punta son mallas, para poder ligarlas)
    const flecha = (g, a, b, r, mat) => {
      const dir = b.clone().sub(a), L = dir.length(), u = dir.clone().normalize(), punta = Math.min(L * 0.3, r * 7);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), u);
      const cuerpo = pieza(g, new THREE.CylinderGeometry(r, r, L - punta, 12), mat || m.tinta(), false);
      cuerpo.quaternion.copy(q); cuerpo.position.copy(a).addScaledVector(u, (L - punta) / 2);
      const cono = pieza(g, new THREE.ConeGeometry(r * 2.6, punta, 16), cuerpo.material, false);
      cono.quaternion.copy(q); cono.position.copy(a).addScaledVector(u, L - punta / 2);
      cono.userData.mat0 = cuerpo.userData.mat0;
      return [cuerpo, cono];
    };
    // momento: arco de 270° alrededor del eje dado ('x', 'y' o 'z') con punta en el sentido de su signo
    const arco = (g, centro, radio, eje, signo, mat) => {
      if (!signo) return [];
      const sub_ = new THREE.Group(); g.add(sub_);
      const mt = mat || m.tinta(); mt.side = THREE.DoubleSide;
      const toro = pieza(sub_, new THREE.TorusGeometry(radio, radio * 0.07, 10, 48, Math.PI * 1.5), mt, false);
      const fin = Math.PI * 1.5, punta = pieza(sub_, new THREE.ConeGeometry(radio * 0.2, radio * 0.45, 16), mt, false);
      punta.position.set(radio * Math.cos(fin), radio * Math.sin(fin), 0);
      punta.quaternion.setFromUnitVectors(V(0, 1, 0), V(-Math.sin(fin), Math.cos(fin), 0));
      if (signo < 0) sub_.scale.x = -1; // espejo: gira al revés
      if (eje === 'x') sub_.rotation.y = Math.PI / 2;
      if (eje === 'y') sub_.rotation.x = Math.PI / 2;
      sub_.position.copy(centro);
      return [toro, punta];
    };
    const etiqueta = (e, p, html, clase) => e.etiquetas.push({ p, html, clase });
    const ligar = (e, nombre, ...piezas) => { e.ligas[nombre] = (e.ligas[nombre] || []).concat(...piezas); };
    // plano translúcido vertical (sección) perpendicular a x
    const planoX = (g, x, y0, y1, z0, z1, mat) => {
      const p = pieza(g, new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat || m.plano(), false);
      p.rotation.y = Math.PI / 2; p.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
      p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), new THREE.LineBasicMaterial({ color: 0x2a5db0 })));
      return p;
    };
    return { V, pieza, caja, flecha, arco, etiqueta, ligar, planoX };
  }

  const nueva = (THREE) => ({ grupo: new THREE.Group(), etiquetas: [], ligas: {} });

  // ---------------------------------------------------------------- zapata aislada
  // Zapata (0 ≤ y ≤ h) y columna encima. En planta: x = Lx, z = Ly (el eje y del plano va hacia −z).
  function aislada(THREE, R, m, op) {
    const A = ayudas(THREE, m), e = nueva(THREE), g = e.grupo, o = op || {};
    const c = R.inp.columna, h = R.h, colH = Math.max(R.Lx, R.Ly) * (o.colH || 0.45);
    const zap = o.sinZapata ? null : A.caja(g, -R.Lx / 2, R.Lx / 2, 0, h, -R.Ly / 2, R.Ly / 2, o.zapataVidrio ? m.vidrio() : m.concreto());
    const col = A.caja(g, -c.Cx / 2, c.Cx / 2, h, h + colH, -c.Cy / 2, c.Cy / 2, o.columnaVidrio ? m.vidrio() : m.columna());
    if (zap) A.ligar(e, 'zapata', zap);
    A.ligar(e, 'columna', col);
    return { A, e, g, h, colTop: h + colH, c };
  }

  // Zapata vista en una dirección (dir X o Y): el voladizo de interés queda hacia +x
  function enDireccion(THREE, R, m, dir) {
    const A = ayudas(THREE, m), e = nueva(THREE), g = e.grupo, enX = dir !== 'Y';
    const L = enX ? R.Lx : R.Ly, B = enX ? R.Ly : R.Lx, C = enX ? R.inp.columna.Cx : R.inp.columna.Cy, Cb = enX ? R.inp.columna.Cy : R.inp.columna.Cx, h = R.h;
    const resto = A.caja(g, -L / 2, C / 2, 0, h, -B / 2, B / 2, m.concreto());
    const vol = A.caja(g, C / 2, L / 2, 0, h, -B / 2, B / 2, m.concreto());
    const col = A.caja(g, -C / 2, C / 2, h, h + L * 0.35, -Cb / 2, Cb / 2, m.columna());
    A.ligar(e, 'zapata', resto, vol); A.ligar(e, 'columna', col);
    return { A, e, g, L, B, C, h, enX, d: dir.toLowerCase() };
  }
  // Presión del suelo bajo una franja (de x0 a x1): placa celeste y flechas hacia arriba
  function presionBajo(z, x0, x1, alto) {
    const { A, e, g, B, m } = z;
    const placa = A.caja(g, x0, x1, -alto - 0.03, -alto, -B / 2, B / 2, m.cielo(0.6), false);
    const fl = [];
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) {
      const x = x0 + (x1 - x0) * (0.1 + 0.8 * i / 4), zz = -B / 2 + B * (0.2 + 0.6 * j / 2);
      fl.push(...A.flecha(g, A.V(x, -alto, zz), A.V(x, -0.02, zz), 0.012, m.tinta()));
    }
    return [placa, ...fl];
  }

  const ESC = {
    // 1. Cargas sobre la columna: P hacia abajo y los momentos en arco según su signo
    cargas(THREE, R, f, m) {
      const z = aislada(THREE, R, m), { A, e, g, colTop } = z, cg = f.ult ? R.ult : R.serv, s = f.ult ? 'u' : 's';
      const lP = Math.max(R.Lx, R.Ly) * 0.35;
      A.ligar(e, 'carga', ...A.flecha(g, A.V(0, colTop + lP, 0), A.V(0, colTop + 0.02, 0), 0.025));
      A.etiqueta(e, A.V(0, colTop + lP + 0.05, 0), sub('P', s, ' = ' + fmt(cg.P, 'fuerza')));
      // los momentos van a los lados de la columna: Mx en el plano yz, My en el plano xy
      const r = Math.max(R.Lx, R.Ly) * 0.09, yM = colTop - r * 1.2, c = R.inp.columna;
      const pMx = A.V(-(c.Cx / 2 + r * 1.6), yM, 0), pMy = A.V(0, yM, c.Cy / 2 + r * 1.6);
      A.ligar(e, 'carga', ...A.arco(g, pMx, r, 'x', Math.sign(cg.Mx)));
      A.ligar(e, 'carga', ...A.arco(g, pMy, r, 'z', Math.sign(cg.My)));
      if (Math.abs(cg.Mx) > 1e-9) A.etiqueta(e, pMx.clone().add(A.V(0, r * 1.2, 0)), sub('M', 'x', ' = ' + fmt(Math.abs(cg.Mx), 'momento')));
      if (Math.abs(cg.My) > 1e-9) A.etiqueta(e, pMy.clone().add(A.V(0, -r * 1.3, 0)), sub('M', 'y', ' = ' + fmt(Math.abs(cg.My), 'momento')), 'abajo');
      e.dir = A.V(1, 0.55, 1.3);
      return e;
    },
    // 2. Núcleo central en la cara superior y el punto de la resultante
    nucleo(THREE, R, f, m) {
      const z = aislada(THREE, R, m, { colH: 0.12, columnaVidrio: true }), { A, e, g, h } = z;
      const s = new THREE.Shape([A.V(R.Lx / 6, 0), A.V(0, R.Ly / 6), A.V(-R.Lx / 6, 0), A.V(0, -R.Ly / 6)].map((p) => new THREE.Vector2(p.x, p.y)));
      const rombo = A.pieza(g, new THREE.ShapeGeometry(s), m.cielo(0.7), false);
      rombo.rotation.x = -Math.PI / 2; rombo.position.y = h + 0.004;
      A.ligar(e, 'perimetro', rombo);
      const punto = A.pieza(g, new THREE.SphereGeometry(Math.max(R.Lx, R.Ly) * 0.02, 20, 12), m.tinta(), false);
      punto.position.set(R.serv.ex, h + 0.02, -R.serv.ey);
      A.etiqueta(e, A.V(R.Lx / 6, h, 0), 'L/6');
      A.etiqueta(e, A.V(R.serv.ex, h + 0.05, -R.serv.ey), 'e = (' + UN().num(R.serv.ex, 'longitud', null, 3) + ', ' + UN().num(R.serv.ey, 'longitud', null, 3) + ')', 'abajo');
      e.dir = A.V(0.5, 1.8, 1);
      return e;
    },
    // 3. Las tres resistencias φVc como barras y el plano de Vu
    vc(THREE, R, f, m) {
      const A = ayudas(THREE, m), e = nueva(THREE), g = e.grupo, pz = R.pz, phi = R.inp.materiales.phiV;
      const lista = [['c1', pz.Vc1 * phi], ['c2', pz.Vc2 * phi], ['c3', pz.Vc3 * phi]], max = Math.max(pz.Vu, ...lista.map((l) => l[1]));
      lista.forEach(([n, v], i) => {
        const alto = 1.6 * v / max, x = (i - 1) * 0.7, min = Math.abs(v - pz.phiVc) < 1e-6;
        A.caja(g, x - 0.22, x + 0.22, 0, alto, -0.22, 0.22, min ? m.azul() : m.concreto());
        A.etiqueta(e, A.V(x, alto + 0.04, 0), sub('φV', n, ' ' + UN().num(v, 'fuerza')));
      });
      const yu = 1.6 * pz.Vu / max;
      const plano = A.pieza(g, new THREE.PlaneGeometry(2.4, 0.9), m.cielo(0.35), false);
      plano.rotation.x = -Math.PI / 2; plano.position.y = yu;
      A.etiqueta(e, A.V(1.2, yu, 0.45), sub('V', 'u', ' = ' + fmt(pz.Vu, 'fuerza')));
      e.dir = A.V(0.9, 0.5, 1.4);
      return e;
    },
    // 4. Prisma de presiones de servicio: altura de cada esquina proporcional a σ (exagerada)
    prisma(THREE, R, f, m) {
      const z = aislada(THREE, R, m, { colH: 0.1, columnaVidrio: true }), { A, e, g, h } = z, sv = R.serv;
      const esq = [[1, R.Lx / 2, R.Ly / 2], [2, R.Lx / 2, -R.Ly / 2], [3, -R.Lx / 2, -R.Ly / 2], [4, -R.Lx / 2, R.Ly / 2]];
      const rango = sv.smax - sv.smin, H = Math.max(R.Lx, R.Ly) * 0.35;
      const alto = (i) => h + (rango > 1e-9 ? H * (0.3 + 0.7 * (sv['s' + i] - sv.smin) / rango) : H * 0.6);
      const P = esq.map(([i, x, y]) => [A.V(x, h, -y), A.V(x, alto(i), -y)]);
      const pos = [];
      const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      tri(P[0][1], P[1][1], P[2][1]); tri(P[0][1], P[2][1], P[3][1]);
      for (let k = 0; k < 4; k++) { const a = P[k], b = P[(k + 1) % 4]; tri(a[0], b[0], b[1]); tri(a[0], b[1], a[1]); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      A.ligar(e, 'zapata', A.pieza(g, geo, m.cielo(0.5)));
      esq.forEach(([i, x, y], k) => {
        const b = A.pieza(g, new THREE.CylinderGeometry(0.012, 0.012, alto(i) - h, 8), m.tinta(), false);
        b.position.set(x, (h + alto(i)) / 2, -y);
        const bola = A.pieza(g, new THREE.SphereGeometry(0.035, 14, 10), m.tinta(), false); bola.position.copy(P[k][1]);
        A.ligar(e, 'esquina', b, bola);
        A.etiqueta(e, P[k][1], sub('σ', String(i), ' = ' + UN().num(sv['s' + i], 'presion')));
      });
      e.dir = A.V(1, 0.85, 1.25);
      return e;
    },
    // 5. Voladizo: presión del suelo bajo el voladizo, sección en la cara de la columna y Mu
    voladizo(THREE, R, f, m) {
      const z = enDireccion(THREE, R, m, f.dir), { A, e, g, L, B, C, h, d } = z; z.m = m;
      const F = z.enX ? R.fx : R.fy;
      A.ligar(e, 'voladizo', ...presionBajo(z, C / 2, L / 2, 0.45));
      A.ligar(e, 'seccion', A.planoX(g, C / 2, -0.1, h + 0.25, -B / 2 - 0.1, B / 2 + 0.1));
      A.etiqueta(e, A.V(C / 2, h + 0.3, 0), sub('M', 'u' + d, ' = ' + fmt(F.Mu, 'momento')));
      A.etiqueta(e, A.V((C / 2 + L / 2) / 2, -0.5, B / 2), sub('σ', 'u', ' = ' + fmt(R.ult.su, 'presion')), 'abajo');
      A.etiqueta(e, A.V((C / 2 + L / 2) / 2, h, B / 2), sub('K', d, ' = ' + fmt(F.K, 'longitud')));
      if (!z.enX) g.rotation.y = -Math.PI / 2;
      e.dir = z.enX ? A.V(0.9, 0.5, 1.35) : A.V(1.35, 0.5, -0.9);
      return e;
    },
    // 6. Sección crítica a cortante a d de la cara de la columna
    seccion(THREE, R, f, m) {
      const z = enDireccion(THREE, R, m, f.dir), { A, e, g, L, B, C, h, d } = z; z.m = m;
      const xs = Math.min(C / 2 + R.d, L / 2);
      if (L / 2 > xs) A.ligar(e, 'area', ...presionBajo(z, xs, L / 2, 0.4));
      A.ligar(e, 'seccion', A.planoX(g, xs, -0.1, h + 0.25, -B / 2 - 0.1, B / 2 + 0.1));
      A.etiqueta(e, A.V((C / 2 + xs) / 2, h + 0.05, B / 2), 'd = ' + fmt(R.d, 'longitud'));
      A.etiqueta(e, A.V((xs + L / 2) / 2, -0.45, B / 2), sub('V', 'u' + d, ' = ' + fmt(z.enX ? R.cu.x.Vu : R.cu.y.Vu, 'fuerza')), 'abajo');
      if (!z.enX) g.rotation.y = -Math.PI / 2;
      e.dir = z.enX ? A.V(0.9, 0.5, 1.35) : A.V(1.35, 0.5, -0.9);
      return e;
    },
    // 7. Diagrama de momento del voladizo como una cinta bajo la zapata
    momento(THREE, R, f, m) {
      const z = enDireccion(THREE, R, m, f.dir), { A, e, g, L, B, C, h, d } = z;
      const F = z.enX ? R.fx : R.fy, prof = L * 0.28, s = new THREE.Shape();
      s.moveTo(C / 2, 0);
      for (let i = 0; i <= 24; i++) { const k = i / 24; s.lineTo(C / 2 + (L / 2 - C / 2) * k, -prof * Math.pow(1 - k, 2)); }
      s.lineTo(L / 2, 0);
      const cinta = A.pieza(g, new THREE.ShapeGeometry(s), m.cielo(0.7), false);
      cinta.position.set(0, -0.08, B / 2 + 0.02);
      A.ligar(e, 'diagrama', cinta);
      A.ligar(e, 'seccion', A.planoX(g, C / 2, -prof - 0.1, h + 0.2, -B / 2 - 0.1, B / 2 + 0.1));
      A.etiqueta(e, A.V(C / 2, -prof - 0.1, B / 2), sub('M', 'u' + d, ' = ' + fmt(F.Mu, 'momento')), 'abajo');
      if (!z.enX) g.rotation.y = -Math.PI / 2;
      e.dir = z.enX ? A.V(0.55, 0.25, 1.4) : A.V(1.4, 0.25, -0.55);
      return e;
    },
    // 8. Áreas A1 (la columna) y A2 (en la cara superior, limitada a la zapata)
    aplastamiento(THREE, R, f, m) {
      const z = aislada(THREE, R, m, { colH: 0.25 }), { A, e, g, h, c } = z, ap = R.ap;
      const a2x = Math.min(ap.a2x, R.Lx), a2y = Math.min(ap.a2y, R.Ly);
      const a2 = A.caja(g, -a2x / 2, a2x / 2, h, h + 0.01, -a2y / 2, a2y / 2, m.cielo(0.55), false);
      A.ligar(e, 'perimetro', a2);
      A.etiqueta(e, A.V(-a2x / 2 + 0.1, h + 0.02, a2y / 2 - 0.1), sub('A', '2'));
      A.etiqueta(e, A.V(0, h + Math.max(R.Lx, R.Ly) * 0.25 * 1.05, 0), sub('A', '1', ' (columna)'));
      e.dir = A.V(0.8, 1.2, 1.1);
      void c;
      return e;
    },
    // 9. Pirámide 1:2 bajo la columna dentro de la zapata (zapata en vidrio para verla)
    piramide(THREE, R, f, m) {
      const z = aislada(THREE, R, m, { colH: 0.3, zapataVidrio: true }), { A, e, g, h, c } = z, ap = R.ap;
      const bx = Math.min(ap.a2x, R.Lx) / 2, bz = Math.min(ap.a2y, R.Ly) / 2;
      const geo = new THREE.BoxGeometry(1, h, 1), pos = geo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const arriba = pos.getY(i) > 0, sx = Math.sign(pos.getX(i)), sz = Math.sign(pos.getZ(i));
        pos.setXYZ(i, sx * (arriba ? c.Cx / 2 : bx), pos.getY(i), sz * (arriba ? c.Cy / 2 : bz));
      }
      geo.computeVertexNormals();
      const pir = A.pieza(g, geo, m.cielo(0.6)); pir.position.y = h / 2;
      A.ligar(e, 'perimetro', pir);
      A.etiqueta(e, A.V(0, h + 0.02, c.Cy / 2), sub('A', '1'));
      A.etiqueta(e, A.V(bx, 0, bz), sub('A', '2', ' (base 1:2)'), 'abajo');
      e.dir = A.V(1, 0.45, 1.3);
      return e;
    },
  };

  // ---------------------------------------------------------------- zapata combinada (x a lo largo de L, centrada)
  function combinada(THREE, R, m) {
    const A = ayudas(THREE, m), e = nueva(THREE), g = e.grupo, h = R.h, colH = R.B * 0.55;
    const zap = A.caja(g, -R.L / 2, R.L / 2, 0, h, -R.B / 2, R.B / 2, m.concreto());
    A.ligar(e, 'zapata', zap);
    const cols = R.cols.map((c) => {
      const x = c.x - R.L / 2, p = A.caja(g, x - c.c1 / 2, x + c.c1 / 2, h, h + colH, -c.c2 / 2, c.c2 / 2, m.columna());
      A.ligar(e, 'columna', p);
      return { c, x, p };
    });
    return { A, e, g, h, colTop: h + colH, cols };
  }

  Object.assign(ESC, {
    'comb-cargas'(THREE, R, f, m) {
      const z = combinada(THREE, R, m), { A, e, g, colTop } = z, s = f.ult ? 'u' : 's';
      z.cols.forEach(({ c, x }) => {
        A.ligar(e, 'carga', ...A.flecha(g, A.V(x, colTop + 1.2, 0), A.V(x, colTop + 0.03, 0), 0.04));
        A.etiqueta(e, A.V(x, colTop + 1.25, 0), sub('P', s, ' = ' + fmt(f.ult ? c.Pu : c.Ps, 'fuerza')));
      });
      const marca = A.pieza(g, new THREE.ConeGeometry(0.12, 0.25, 16), m.tinta(), false);
      marca.rotation.x = Math.PI; marca.position.set(R.xbar - R.L / 2, -0.15, R.B / 2);
      A.ligar(e, 'xbar', marca);
      A.etiqueta(e, A.V(R.xbar - R.L / 2, -0.3, R.B / 2), 'x̄ = ' + fmt(R.xbar, 'longitud'), 'abajo');
      e.dir = A.V(0.35, 0.55, 1.4);
      return e;
    },
    'comb-presion'(THREE, R, f, m) {
      const z = combinada(THREE, R, m), { A, e, g, colTop } = z;
      z.cols.forEach(({ c, x }) => {
        A.ligar(e, 'carga', ...A.flecha(g, A.V(x, colTop + 1.0, 0), A.V(x, colTop + 0.03, 0), 0.04));
        A.etiqueta(e, A.V(x, colTop + 1.05, 0), sub('P', 'u', ' = ' + fmt(c.Pu, 'fuerza')));
      });
      // superficie de presión bajo la zapata: su profundidad crece con q (de q1 a q2)
      const wmax = Math.max(R.q.q1, R.q.q2), hq = (q) => 0.9 * q / wmax, x0 = -R.L / 2, x1 = R.L / 2, zb = R.B / 2;
      const pos = [x0, -hq(R.q.q1), -zb, x1, -hq(R.q.q2), -zb, x1, -hq(R.q.q2), zb, x0, -hq(R.q.q1), -zb, x1, -hq(R.q.q2), zb, x0, -hq(R.q.q1), zb];
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      const sup = A.pieza(g, geo, m.cielo(0.55), false);
      const fl = [];
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 2; j++) {
        const x = x0 + R.L * (0.05 + 0.9 * i / 8), q = R.q.q1 + (R.q.q2 - R.q.q1) * (x - x0) / R.L, zz = -zb + R.B * (0.2 + 0.6 * j / 2);
        fl.push(...A.flecha(g, A.V(x, -hq(q), zz), A.V(x, -0.02, zz), 0.02, m.tinta()));
      }
      A.ligar(e, 'presion', sup, ...fl);
      A.etiqueta(e, A.V(x0, -hq(R.q.q1), zb), sub('q', 'u1', ' = ' + fmt(R.q.q1, 'presion')), 'abajo');
      A.etiqueta(e, A.V(x1, -hq(R.q.q2), zb), sub('q', 'u2', ' = ' + fmt(R.q.q2, 'presion')), 'abajo');
      e.dir = A.V(0.4, 0.35, 1.4);
      return e;
    },
    'comb-vm'(THREE, R, f, m) {
      const z = combinada(THREE, R, m), { A, e, g, h } = z;
      const cinta = (vals, y0, alto, zc) => {
        const max = Math.max(...vals.map(Math.abs)) || 1, s = new THREE.Shape();
        s.moveTo(R.lon.xs[0] - R.L / 2, 0);
        R.lon.xs.forEach((x, j) => s.lineTo(x - R.L / 2, vals[j] * alto / max));
        s.lineTo(R.lon.xs[R.lon.xs.length - 1] - R.L / 2, 0);
        const p = A.pieza(g, new THREE.ShapeGeometry(s), m.cielo(0.7), false);
        p.position.set(0, y0, zc);
        return p;
      };
      const yV = h + R.B * 0.55 + 0.9;
      const v = cinta(R.lon.V, yV, 0.8, 0), mm = cinta(R.lon.M.map((x) => -x), -1.0, 0.8, R.B / 2 + 0.05);
      A.ligar(e, 'diagrama', v, mm);
      A.etiqueta(e, A.V(-R.L / 2, yV + 0.85, 0), sub('V', 'u', ' (' + UN().u('fuerza') + ')'));
      A.etiqueta(e, A.V(-R.L / 2, -1.0, R.B / 2), sub('M', 'u', ' (' + UN().u('momento') + ')'), 'abajo');
      e.dir = A.V(0.25, 0.25, 1.4);
      return e;
    },
    'comb-punz'(THREE, R, f, m) {
      const z = combinada(THREE, R, m), { A, e, g, h } = z, i = f.i || 0, c = R.cols[i], pz = R.pz[i], d = R.d;
      const x = c.x - R.L / 2, izq = c.x - c.c1 / 2 - Math.min(c.x - c.c1 / 2, d / 2) - R.L / 2;
      // perímetro crítico como paredes translúcidas de altura d (3 lados en la columna del borde)
      const paredes = [], x0 = izq, x1 = izq + pz.dx, z0 = -pz.dy / 2, z1 = pz.dy / 2, y0 = h - d, y1 = h;
      paredes.push(A.caja(g, x0, x1, y0, y1, z0 - 0.01, z0 + 0.01, m.cielo(0.55), false), A.caja(g, x0, x1, y0, y1, z1 - 0.01, z1 + 0.01, m.cielo(0.55), false),
        A.caja(g, x1 - 0.01, x1 + 0.01, y0, y1, z0, z1, m.cielo(0.55), false));
      if (pz.lados === 4) paredes.push(A.caja(g, x0 - 0.01, x0 + 0.01, y0, y1, z0, z1, m.cielo(0.55), false));
      A.ligar(e, 'perimetro', ...paredes);
      z.e.ligas.zapata.forEach((p) => { p.material = p.userData.mat0 = m.vidrio(); }); // la zapata en vidrio para ver el perímetro
      A.etiqueta(e, A.V((x0 + x1) / 2, h + 0.02, z1), sub('b', 'o', ' = ' + fmt(pz.bo, 'longitud') + ' (' + pz.lados + ' lados)'));
      e.mira = A.V(x, h * 0.6, 0);
      e.zoom = 0.62;
      e.dir = A.V(0.8, 0.9, 1.2);
      return e;
    },
  });

  global.Mini3D.ESCENAS = ESC;
})(window);

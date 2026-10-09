/* Maqueta 3D de RomiCalc: un bloque de territorio cortado (con sus estratos) con un edificio aporticado de 3 pisos en
 * obra gris, una vía en terraplén que cruza un río por un puente de dos luces (una de losa maciza y otra de vigas I y
 * losa, con pila central) y una quebrada que pasa por un box culvert de doble celda. La usan la intro, la portada y
 * "¿Qué quieres calcular?". Cada pieza lleva userData { id (el de js/tipos/elementos.js o null), etapa de obra, nivel
 * para el despiece, parte }. Unidades: metros de maqueta (no a escala real). Con { simple: true }, sin aristas, sin
 * sombras ni piezas pequeñas (celulares y equipos lentos).
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- texturas hechas en código (canvas)
  function textura(THREE, w, h, pintar, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    pintar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  function grano(ctx, w, h, base, var_) {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const d = (Math.random() - 0.5) * var_;
      img.data[i] += d; img.data[i + 1] += d; img.data[i + 2] += d;
    }
    ctx.putImageData(img, 0, 0);
  }

  function crear(THREE, op) {
    const simple = !!(op && op.simple);
    const raiz = new THREE.Group();
    const piezas = {}, todas = [];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    // ---------------------------------------------------------------- materiales (realista sobrio: grises y tierra)
    const tConcreto = simple ? null : textura(THREE, 128, 128, (c, w, h) => grano(c, w, h, '#c8c5bd', 18), [2, 2]);
    const tLadrillo = simple ? null : textura(THREE, 256, 128, (c, w, h) => {
      c.fillStyle = '#cfc6b8'; c.fillRect(0, 0, w, h);
      for (let f = 0; f < 8; f++) for (let k = -1; k < 5; k++) {
        const x = k * 64 + (f % 2 ? 32 : 0), y = f * 16;
        c.fillStyle = `hsl(${16 + Math.random() * 6}, ${42 + Math.random() * 10}%, ${40 + Math.random() * 8}%)`;
        c.fillRect(x + 2, y + 2, 60, 12);
      }
    }, [2, 2]);
    const tAgua = simple ? null : textura(THREE, 128, 128, (c, w, h) => {
      c.fillStyle = '#4a6f86'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(220,235,245,0.35)'; c.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 3, x + 16, y); c.stroke(); }
    }, [1, 6]);
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
    const M = {
      concreto: std({ color: tConcreto ? 0xd6d2ca : 0xb9b5ad, map: tConcreto }),
      concretoViejo: std({ color: 0xa8a39a, map: tConcreto }),
      ladrillo: std({ color: tLadrillo ? 0xffffff : 0xa45a3c, map: tLadrillo }),
      caseton: std({ color: 0xe8e4dc }),
      asfalto: std({ color: 0x2c2e31, roughness: 0.95 }),
      lineaB: std({ color: 0xf2f2f2 }), lineaA: std({ color: 0xe0b23a }),
      acero: std({ color: 0x8b9199, metalness: 0.8, roughness: 0.35 }),
      neopreno: std({ color: 0x1f2022 }),
      relleno: std({ color: 0x847e6e }),
      agua: new THREE.MeshStandardMaterial({ color: tAgua ? 0xffffff : 0x4a6f86, map: tAgua, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }),
      estrato: [std({ color: 0x7d7a66 }), std({ color: 0x6b5f50 }), std({ color: 0x4d463f })],
      azul: std({ color: 0x2a5db0, emissive: 0x2a5db0, emissiveIntensity: 0.45, roughness: 0.5 }),
    };
    const arista = new THREE.LineBasicMaterial({ color: 0x3d3f43, transparent: true, opacity: 0.35 });

    // ---------------------------------------------------------------- fábrica de piezas
    function agregar(m, id, etapa, nivel, parte, conArista) {
      m.userData = { id: id || null, etapa, nivel: nivel || 0, parte: parte || '', mat0: m.material };
      if (!simple) { m.castShadow = true; m.receiveShadow = true; if (conArista !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), arista)); }
      raiz.add(m); todas.push(m);
      if (id) (piezas[id] = piezas[id] || []).push(m);
      return m;
    }
    // caja por sus límites (x0..x1, y0..y1, z0..z1)
    function caja(x0, x1, y0, y1, z0, z1, mat, id, etapa, nivel, parte, conArista) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      return agregar(m, id, etapa, nivel, parte, conArista);
    }
    // muro delgado entre dos puntos en planta, de y0 a y1
    function muro(ax, az, bx, bz, y0, y1, e, mat, id, etapa, nivel, parte) {
      const L = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.BoxGeometry(L, y1 - y0, e), mat);
      m.position.set((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
      m.rotation.y = -Math.atan2(bz - az, bx - ax);
      return agregar(m, id, etapa, nivel, parte);
    }
    // varias copias de una geometría (InstancedMesh): varillas, postes, demarcación
    function copias(geo, mat, posiciones, id, etapa, nivel, parte) {
      const m = new THREE.InstancedMesh(geo, mat, posiciones.length);
      const o = new THREE.Object3D();
      posiciones.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
      return agregar(m, id, etapa, nivel, parte, false);
    }

    // ---------------------------------------------------------------- 0. terreno cortado con estratos, río y quebrada
    const ZB = 6; // el bloque va de z = −6 a 6 y de x = −9 a 9
    const RIO = [4, 7], QUE = [1.4, 2.6]; // la quebrada pasa entre el edificio y el río
    const ESTR = [[0, -0.5], [-0.5, -1.6], [-1.6, -3]];
    const tramos = [[-9, QUE[0], 0], [QUE[0], QUE[1], -0.8], [QUE[1], RIO[0], 0], [RIO[0], RIO[1], -1.2], [RIO[1], 9, 0]];
    tramos.forEach(([x0, x1, fondo]) => ESTR.forEach(([a, b], i) => {
      const top = Math.min(a, fondo);
      if (top > b) caja(x0, x1, b, top, -ZB, ZB, M.estrato[i], null, 0, 0, 'terreno', false);
    }));
    caja(RIO[0], RIO[1], -1.21, -0.95, -ZB, ZB, M.agua, null, 0, 0, 'agua', false);
    caja(QUE[0], QUE[1], -0.81, -0.62, -ZB, ZB, M.agua, null, 0, 0, 'agua', false);

    // ---------------------------------------------------------------- edificio: pórtico 3 × 2 vanos, 3 pisos
    const CX = [-5.5, -3.5, -1.5, 0.5], CZ = [1.55, 3.55, 5.55], PISOS = [1.3, 2.6, 3.9];
    const eL = 0.14, hV = 0.32, bV = 0.2, bC = 0.26, yZ = -0.4;
    const cols = CX.flatMap((x) => CZ.map((z) => ({ x, z })));
    cols.forEach((c) => {
      caja(c.x - 0.45, c.x + 0.45, -0.7, yZ, c.z - 0.45, c.z + 0.45, M.concreto, 'zapatas', 1, 0, 'zapata');
    });
    // vigas de amarre entre zapatas (la fila del frente queda en el corte del bloque)
    CZ.forEach((z) => CX.slice(0, -1).forEach((x, i) => caja(x + bC / 2, CX[i + 1] - bC / 2, yZ, yZ + 0.25, z - 0.1, z + 0.1, M.concreto, 'zapatas', 1, 0, 'amarre')));
    CX.forEach((x) => CZ.slice(0, -1).forEach((z, i) => caja(x - 0.1, x + 0.1, yZ, yZ + 0.25, z + bC / 2, CZ[i + 1] - bC / 2, M.concreto, 'zapatas', 1, 0, 'amarre')));
    PISOS.forEach((yT, k) => {
      const y0 = k ? PISOS[k - 1] : yZ, et = 2 + k * 2;
      cols.forEach((c) => caja(c.x - bC / 2, c.x + bC / 2, y0, yT - eL, c.z - bC / 2, c.z + bC / 2, M.concreto, 'columnas', et, k + 1, 'columna'));
      const yb0 = yT - eL - hV, yb1 = yT - eL;
      CZ.forEach((z) => CX.slice(0, -1).forEach((x, i) => caja(x + bC / 2, CX[i + 1] - bC / 2, yb0, yb1, z - bV / 2, z + bV / 2, M.concreto, 'vigas', et + 1, k + 1, 'viga')));
      CX.forEach((x) => CZ.slice(0, -1).forEach((z, i) => caja(x - bV / 2, x + bV / 2, yb0, yb1, z + bC / 2, CZ[i + 1] - bC / 2, M.concreto, 'vigas', et + 1, k + 1, 'viga')));
      const ult = k === PISOS.length - 1;
      // losa con voladizo; en la cubierta el último vano sigue en obra: nervios y casetones a la vista (losa aligerada)
      caja(CX[0] - 0.3, ult ? CX[2] : CX[3] + 0.3, yT - eL, yT, CZ[0] - 0.3, CZ[2] + 0.3, M.concreto, 'losas', et + 1, k + 1, 'losa');
      if (ult) {
        for (let z = CZ[0] + 0.35; z < CZ[2] - 0.2; z += 0.5) {
          caja(CX[2], CX[3], yT - eL - 0.05, yT - 0.04, z - 0.05, z + 0.05, M.concreto, 'losas', et + 1, k + 1, 'nervio');
          if (!simple && z + 0.5 < CZ[2] - 0.2) caja(CX[2] + 0.05, CX[3] - 0.05, yT - eL - 0.05, yT - 0.06, z + 0.07, z + 0.43, M.caseton, 'losas', et + 1, k + 1, 'caseton');
        }
      }
    });
    // varillas que salen de las columnas en la cubierta (la obra sigue)
    if (!simple) {
      const gV = new THREE.CylinderGeometry(0.014, 0.014, 0.45, 6);
      const pos = [];
      cols.forEach((c) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => pos.push([c.x + a * 0.08, PISOS[2] + 0.22, c.z + b * 0.08])));
      copias(gV, M.acero, pos, null, 7, 3, 'arranque');
    }
    // mampostería: atrás y a la izquierda en el primer piso, atrás en parte del segundo
    const muroL = (ax, az, bx, bz, piso, nivel) => {
      const y0 = piso ? PISOS[piso - 1] : 0, y1 = PISOS[piso] - eL - hV;
      return muro(ax, az, bx, bz, y0, y1, 0.12, M.ladrillo, null, 3 + piso * 2, nivel, 'ladrillo');
    };
    CX.slice(0, -1).forEach((x, i) => muroL(x + bC / 2, CZ[0], CX[i + 1] - bC / 2, CZ[0], 0, 1));
    CZ.slice(0, -1).forEach((z, i) => muroL(CX[0], z + bC / 2, CX[0], CZ[i + 1] - bC / 2, 0, 1));
    CX.slice(0, 2).forEach((x, i) => muroL(x + bC / 2, CZ[0], CX[i + 1] - bC / 2, CZ[0], 1, 2));
    // escalera de un tramo entre el primer y el segundo nivel, y otra entre el segundo y el tercero
    [[0, 3.75, 1], [1, 5.35, -1]].forEach(([piso, z0, dir]) => {
      const y0 = piso ? PISOS[piso - 1] : 0, sube = PISOS[piso] - y0, n = 8;
      for (let i = 0; i < n; i++) {
        const za = z0 + dir * i * 0.2, zb = za + dir * 0.2;
        caja(-1.1, -0.35, y0, y0 + (i + 1) * sube / n, Math.min(za, zb), Math.max(za, zb), M.concretoViejo, null, 3 + piso * 2, piso + 1, 'escalera', i % 2 === 0);
      }
    });

    // ---------------------------------------------------------------- vía en terraplén (a lo largo de x, en z = −2.5)
    const ZV = -2.5, A = 1.2, H = 0.35; // media calzada y altura del terraplén
    function terraplen(x0, x1) {
      const s = new THREE.Shape();
      s.moveTo(-(ZV - A - 0.6), 0); s.lineTo(-(ZV - A), H); s.lineTo(-(ZV + A), H); s.lineTo(-(ZV + A + 0.6), 0); s.lineTo(-(ZV - A - 0.6), 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false });
      g.rotateY(Math.PI / 2); g.translate(x0, 0, 0);
      agregar(new THREE.Mesh(g, M.relleno), null, 10, 1, 'terraplen', false);
      caja(x0, x1, H, H + 0.02, ZV - A + 0.1, ZV + A - 0.1, M.asfalto, null, 10, 1, 'carpeta', false);
    }
    terraplen(-9, RIO[0] + 0.15);
    terraplen(RIO[1] - 0.15, 9);
    // demarcación: línea central amarilla a trazos y bordes blancos
    if (!simple) {
      const gT = new THREE.BoxGeometry(0.35, 0.01, 0.05), tr = [];
      for (let x = -8.8; x < 8.8; x += 0.7) tr.push([x, H + 0.03, ZV]);
      copias(gT, M.lineaA, tr, null, 10, 1, 'demarcacion');
      [ZV - A + 0.2, ZV + A - 0.2].forEach((z) => caja(-9, 9, H + 0.02, H + 0.035, z - 0.025, z + 0.025, M.lineaB, null, 10, 1, 'demarcacion', false));
    }

    // ---------------------------------------------------------------- puente de dos luces sobre el río
    const z0 = ZV - A - 0.2, z1 = ZV + A + 0.2, xP = (RIO[0] + RIO[1]) / 2;
    // estribos (muro frontal y espaldar) con aletas a 45° que contienen el terraplén
    [[RIO[0], 1], [RIO[1], -1]].forEach(([xb, s]) => {
      const xa = xb + s * 0.3, top = s > 0 ? 0 : -0.45;
      caja(Math.min(xb, xa), Math.max(xb, xa), -1.2, top, z0, z1, M.concretoViejo, null, 8, 0, 'estribo');
      caja(Math.min(xb, xb + s * 0.12), Math.max(xb, xb + s * 0.12), top, H, z0, z1, M.concretoViejo, null, 8, 0, 'espaldar');
      [[z0, -1], [z1, 1]].forEach(([zz, sz]) => muro(xb, zz, xb - s * 0.8, zz + sz * 0.8, -0.2, H + 0.1, 0.12, M.concretoViejo, null, 8, 0, 'aleta'));
    });
    // pila central con su cabezal escalonado (la luz de losa apoya más alto que la de vigas)
    caja(xP - 0.15, xP + 0.15, -1.2, -0.6, ZV - 1.0, ZV + 1.0, M.concretoViejo, null, 8, 0, 'pila');
    caja(xP - 0.25, xP + 0.25, -0.6, -0.45, z0 + 0.1, z1 - 0.1, M.concretoViejo, null, 8, 0, 'cabezal');
    caja(xP - 0.25, xP, -0.45, 0, z0 + 0.1, z1 - 0.1, M.concretoViejo, null, 8, 0, 'cabezal');
    // neoprenos
    if (!simple) [RIO[0] + 0.2, xP - 0.12].forEach((x) => [-1, 0, 1].forEach((k) => caja(x - 0.06, x + 0.06, x < xP ? 0 : 0, 0.03, ZV + k * 0.8 - 0.1, ZV + k * 0.8 + 0.1, M.neopreno, null, 9, 0, 'neopreno', false)));
    // luz 1: losa maciza
    caja(RIO[0] + 0.12, xP, 0.03, 0.3, z0, z1, M.concreto, 'puente-losa', 9, 1, 'losa');
    caja(RIO[0] + 0.12, xP, 0.3, H, ZV - A + 0.1, ZV + A - 0.1, M.asfalto, 'puente-losa', 9, 1, 'carpeta', false);
    // luz 2: tres vigas I con diafragmas y su losa
    const sI = new THREE.Shape();
    [[-0.18, 0], [0.18, 0], [0.18, 0.08], [0.05, 0.12], [0.05, 0.42], [0.14, 0.46], [0.14, 0.53], [-0.14, 0.53], [-0.14, 0.46], [-0.05, 0.42], [-0.05, 0.12], [-0.18, 0.08], [-0.18, 0]].forEach(([a, b], i) => (i ? sI.lineTo(a, b) : sI.moveTo(a, b)));
    const xi0 = xP + 0.05, xi1 = RIO[1] - 0.05;
    [-0.8, 0, 0.8].forEach((k) => {
      const g = new THREE.ExtrudeGeometry(sI, { depth: xi1 - xi0, bevelEnabled: false });
      g.rotateY(Math.PI / 2); g.translate(xi0, -0.45, ZV + k);
      agregar(new THREE.Mesh(g, M.concreto), 'puente-viga', 9, 1, 'viga-i');
    });
    [xi0 + 0.05, (xi0 + xi1) / 2, xi1 - 0.05].forEach((x) => caja(x - 0.05, x + 0.05, -0.3, 0.05, ZV - 0.75, ZV + 0.75, M.concreto, 'puente-viga', 9, 1, 'diafragma'));
    caja(xP, RIO[1] - 0.12, 0.08, 0.3, z0, z1, M.concreto, 'puente-viga', 9, 1, 'losa');
    caja(xP, RIO[1] - 0.12, 0.3, H, ZV - A + 0.1, ZV + A - 0.1, M.asfalto, 'puente-viga', 9, 1, 'carpeta', false);
    // bordillos y barandas a lo largo del puente
    const xB0 = RIO[0] + 0.12, xB1 = RIO[1] - 0.12;
    [[z0, z0 + 0.2], [z1 - 0.2, z1]].forEach(([a, b]) => caja(xB0, xB1, 0.3, 0.45, a, b, M.concreto, null, 10, 1, 'bordillo'));
    const postes = [];
    for (let x = xB0 + 0.1; x < xB1; x += 0.45) [z0 + 0.1, z1 - 0.1].forEach((z) => postes.push([x, 0.62, z]));
    if (!simple) copias(new THREE.BoxGeometry(0.05, 0.34, 0.05), M.acero, postes, null, 10, 1, 'baranda');
    [z0 + 0.1, z1 - 0.1].forEach((z) => [0.66, 0.78].forEach((y) => caja(xB0, xB1, y - 0.02, y + 0.02, z - 0.03, z + 0.03, M.acero, null, 10, 1, 'baranda', false)));

    // ---------------------------------------------------------------- box culvert de doble celda bajo el terraplén
    const bxC = (QUE[0] + QUE[1]) / 2, bx0 = bxC - 0.7, bx1 = bxC + 0.7, by0 = -0.8, by1 = 0.15, e = 0.12, bz0 = ZV - A - 0.6, bz1 = ZV + A + 0.6;
    caja(bx0, bx1, by0, by0 + e, bz0, bz1, M.concreto, 'box-culvert', 8, 0, 'solera');
    caja(bx0, bx1, by1 - e, by1, bz0, bz1, M.concreto, 'box-culvert', 8, 0, 'losa');
    [bx0, bxC - e / 2, bx1 - e].forEach((x) => caja(x, x + e, by0 + e, by1 - e, bz0, bz1, M.concreto, 'box-culvert', 8, 0, 'muro'));
    // cabezales en la entrada y la salida, y aletas abiertas hacia la quebrada
    [[bz0, -1], [bz1, 1]].forEach(([zc, s]) => {
      caja(bx0 - 0.15, bx1 + 0.15, by1, H + 0.1, Math.min(zc, zc + s * e), Math.max(zc, zc + s * e), M.concreto, 'box-culvert', 8, 0, 'cabezal');
      muro(bx0, zc, bx0 - 0.35, zc + s * 0.7, by0, 0.1, e, M.concreto, 'box-culvert', 8, 0, 'aleta');
      muro(bx1, zc, bx1 + 0.35, zc + s * 0.7, by0, 0.1, e, M.concreto, 'box-culvert', 8, 0, 'aleta');
    });

    // ---------------------------------------------------------------- caminos de la carga (hasta el suelo)
    const yS = -1.6, bajar = (c, y) => [V(c.x, y, c.z), V(c.x, yZ, c.z), V(c.x, yS, c.z)];
    const vecino = (v, lista) => (v === lista[lista.length - 1] ? v - 1 : v + 1);
    const caminos = {
      losas: cols.map((c) => [V(vecino(c.x, CX), PISOS[2], vecino(c.z, CZ)), V(vecino(c.x, CX), PISOS[2] - eL - hV / 2, c.z), ...bajar(c, PISOS[2] - eL - hV / 2)]),
      vigas: cols.map((c) => [V(vecino(c.x, CX), PISOS[1] - eL - hV / 2, c.z), ...bajar(c, PISOS[1] - eL - hV / 2)]),
      columnas: cols.map((c) => bajar(c, PISOS[2])),
      zapatas: cols.flatMap((c) => [-0.45, 0, 0.45].map((d) => [V(c.x, yZ, c.z), V(c.x + d, yS, c.z + d * 0.5)])),
      'puente-losa': [ZV - 0.8, ZV + 0.8].flatMap((z) => [[V((RIO[0] + xP) / 2, H, z), V(RIO[0] + 0.15, 0, z), V(RIO[0] + 0.15, -1.2, z), V(RIO[0] + 0.15, -2.2, z)],
        [V((RIO[0] + xP) / 2, H, z), V(xP - 0.1, 0, z), V(xP, -1.2, z), V(xP, -2.2, z)]]),
      'puente-viga': [-0.8, 0, 0.8].flatMap((k) => [[V((xP + RIO[1]) / 2, H, ZV + k), V((xP + RIO[1]) / 2, 0.08, ZV + k), V(xP + 0.1, -0.45, ZV + k), V(xP, -1.2, ZV + k), V(xP, -2.2, ZV + k)],
        [V((xP + RIO[1]) / 2, H, ZV + k), V((xP + RIO[1]) / 2, 0.08, ZV + k), V(RIO[1] - 0.1, -0.45, ZV + k), V(RIO[1] - 0.1, -1.2, ZV + k), V(RIO[1] - 0.1, -2.2, ZV + k)]]),
      'box-culvert': [bx0 + e / 2, bxC, bx1 - e / 2].map((x) => [V(bxC, H + 0.4, ZV), V(bxC, by1, ZV), V(x, by1, ZV), V(x, by0, ZV), V(x, yS, ZV)]),
    };
    // a dónde mira la cámara para cada elemento
    const focos = {
      losas: { mira: V(-2.5, 3.2, 3.5), dist: 9 }, vigas: { mira: V(-2.5, 2.2, 3.5), dist: 9 }, columnas: { mira: V(-2.5, 1.6, 3.5), dist: 10 },
      zapatas: { mira: V(-2.5, -0.4, 3.5), dist: 11 }, 'puente-losa': { mira: V((RIO[0] + xP) / 2, -0.3, ZV), dist: 10 }, 'puente-viga': { mira: V((xP + RIO[1]) / 2, -0.4, ZV), dist: 10 },
      'box-culvert': { mira: V(bxC, -0.4, ZV), dist: 9 },
    };

    // ---------------------------------------------------------------- resaltar y animar el agua
    // Rayos X: lo que tapa al elemento elegido se vuelve transparente (el terreno a las zapatas; el terraplén al box culvert)
    const RAYOS = { zapatas: M.estrato, 'box-culvert': [...M.estrato, M.relleno, M.asfalto] };
    function resaltar(id) {
      todas.forEach((m) => { m.material = m.userData.id && m.userData.id === id ? M.azul : m.userData.mat0; });
      const rx = RAYOS[id] || [];
      [...M.estrato, M.relleno, M.asfalto].forEach((mt) => {
        const si = rx.includes(mt);
        mt.transparent = si; mt.opacity = si ? 0.28 : 1; mt.depthWrite = !si; mt.needsUpdate = true;
      });
    }
    function actualizar(t) { if (tAgua) tAgua.offset.y = -t * 0.05; }

    return { raiz, piezas, todas, caminos, focos, materiales: M, resaltar, actualizar,
      limites: { centro: V(0, 0.4, 0), radio: 11 } };
  }

  function luces(THREE, scene, renderer) {
    // Luz de día: cielo y tierra, y un sol con sombras suaves ajustadas a la maqueta
    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x5a5048, 0.8));
    const sol = new THREE.DirectionalLight(0xfff6ea, 1.6);
    sol.position.set(8, 14, 10);
    if (renderer.shadowMap.enabled) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(2048, 2048);
      Object.assign(sol.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 2, far: 40 });
      sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02;
    }
    scene.add(sol);
    // Sombra de contacto falsa bajo el bloque (un degradado), para que no flote
    const lienzo = document.createElement('canvas'); lienzo.width = lienzo.height = 128;
    const cx = lienzo.getContext('2d'), gr = cx.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    const sombra = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzo), transparent: true, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = -3.05; scene.add(sombra);
  }

  global.Maqueta3D = { crear, luces };
})(window);

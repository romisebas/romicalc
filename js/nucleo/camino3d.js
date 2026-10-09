/* Camino de las cargas en 3D ("¿Qué quieres calcular?"): un edificio (zapatas, columnas, vigas y losa)
 * y un puente (losa, vigas, estribos) con un box culvert. Al pasar el ratón o tocar un elemento se ilumina
 * en azul y unos puntos bajan por donde viaja su carga hasta el suelo. Los id son los de js/tipos/elementos.js.
 * Solo dibuja mientras la página está visible; sin animaciones, los puntos quedan quietos.
 */
(function (global) {
  'use strict';
  const AZUL = 0x2a5db0, CIELO = 0x8db8f2, BASE = 0x3a3f46, ARISTA = 0x8c8c8c;
  let api = null, sel = 'vigas', alElegir = null;

  function montar(cont, cb) {
    alElegir = cb || null;
    const THREE = global.THREE;
    if (api || !THREE || !global.Escena3D || !cont) return api;
    const { renderer, scene } = global.Escena3D.crear(cont, { exposicion: 1.05 });
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(1.4, 4.8, 12.6);
    const ctl = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(ctl, { enableZoom: false, enablePan: false, enableDamping: true, minPolarAngle: 0.7, maxPolarAngle: 1.4, autoRotateSpeed: 0.35 });
    ctl.target.set(0.9, 0.55, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x30343a, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 1.8); sol.position.set(4, 9, 6); scene.add(sol);

    // ------------------------------------------------------------ piezas
    const piezas = {}; // id → mallas que se iluminan juntas
    const elegibles = [];
    function caja(id, w, h, d, x, y, z, op) {
      const mat = new THREE.MeshStandardMaterial({ color: (op && op.color) || BASE, roughness: 0.75, metalness: 0.05, transparent: true, opacity: (op && op.opacidad) || 0.92 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      if (!op || !op.sinAristas) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: ARISTA, transparent: true, opacity: 0.6 })));
      scene.add(m);
      if (id) { m.userData.id = id; (piezas[id] = piezas[id] || []).push(m); elegibles.push(m); }
      return m;
    }

    // Edificio: dos vanos (6 columnas sobre zapatas), vigas en los dos sentidos y una losa
    const bx = -3.4, Sx = 1.6, Sz = 2.0, yb = 2.45, yl = 2.74, yf = -0.3, ys = -0.85;
    const cols = [-1, 0, 1].flatMap((i) => [-1, 1].map((k) => ({ x: bx + i * Sx, z: k * Sz / 2 })));
    caja(null, 7.2, 0.8, 4.6, bx, -0.4, 0, { color: 0x1b1b1b, opacidad: 0.35, sinAristas: true });
    cols.forEach((c) => {
      caja('zapatas', 0.9, 0.3, 0.9, c.x, -0.45, c.z);
      caja('columnas', 0.28, 2.9, 0.28, c.x, 1.15, c.z);
    });
    [-Sz / 2, Sz / 2].forEach((z) => caja('vigas', 2 * Sx, 0.3, 0.24, bx, yb, z));
    [-1, 0, 1].forEach((i) => caja('vigas', 0.24, 0.3, Sz, bx + i * Sx, yb, 0));
    caja('losas', 2 * Sx + 0.7, 0.14, Sz + 0.7, bx, yl - 0.07, 0);

    // Puente: estribos en las orillas, losa de tablero y tres vigas debajo; agua en el cauce
    const px = 3.8, ex = 1.9, ex2 = 5.7, yt = 1.06, yv = 0.67, vz = [-0.8, 0, 0.8];
    caja(null, 1.6, 0.8, 4.6, 1.2, -0.4, 0, { color: 0x1b1b1b, opacidad: 0.35, sinAristas: true });
    caja(null, 1.6, 0.8, 4.6, 6.4, -0.4, 0, { color: 0x1b1b1b, opacidad: 0.35, sinAristas: true });
    caja(null, 3.6, 0.05, 3.2, px, -0.55, 0, { color: 0x13315c, opacidad: 0.55, sinAristas: true });
    [ex, ex2].forEach((x) => caja(null, 0.5, 1.3, 2.6, x, 0.2, 0));
    caja('puente-losa', 4.4, 0.22, 2.6, px, yt - 0.11, 0);
    vz.forEach((z) => caja('puente-viga', 3.8, 0.34, 0.22, px, yv, z));

    // Box culvert: un cajón hueco bajo un terraplén, delante del puente
    const cx = 6.4, cz = 2.2, cyb = -0.5, cyt = 0.4;
    caja('box-culvert', 1.4, 0.16, 1.4, cx, cyt, cz); caja('box-culvert', 1.4, 0.16, 1.4, cx, cyb, cz);
    caja('box-culvert', 0.16, 0.74, 1.4, cx - 0.62, (cyt + cyb) / 2, cz); caja('box-culvert', 0.16, 0.74, 1.4, cx + 0.62, (cyt + cyb) / 2, cz);

    // ------------------------------------------------------------ caminos de la carga (polilíneas hacia el suelo)
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const abajo = (c, y0) => [V(c.x, y0, c.z), V(c.x, yf, c.z), V(c.x, ys, c.z)];
    const CAMINOS = {
      losas: cols.map((c) => [V(bx, yl, 0), V(bx, yb, c.z), ...abajo(c, yb)]),
      vigas: cols.map((c) => [V(bx, yb, c.z), ...abajo(c, yb)]),
      columnas: cols.map((c) => abajo(c, yb)),
      zapatas: cols.flatMap((c) => [-0.45, 0, 0.45].map((d) => [V(c.x, yf, c.z), V(c.x + d, ys, c.z)])),
      'puente-losa': [ex, ex2].flatMap((x) => [-0.8, 0.8].map((z) => [V(px, yt, z), V(x, yt, z), V(x, -0.6, z)])),
      'puente-viga': [ex, ex2].flatMap((x) => vz.map((z) => [V(px, yt, z), V(px, yv, z), V(x, yv, z), V(x, -0.6, z)])),
      'box-culvert': [-0.62, 0.62].map((d) => [V(cx, cyt + 0.5, cz), V(cx, cyt, cz), V(cx + d, cyt, cz), V(cx + d, cyb - 0.3, cz)]),
    };
    const POR_CAMINO = 9;
    const puntos = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: CIELO, size: 0.17, transparent: true, opacity: 0.95, depthTest: false }));
    puntos.renderOrder = 2;
    scene.add(puntos);
    let tramos = [];
    function armarCamino(id) {
      tramos = (CAMINOS[id] || []).map((todos) => {
        const pts = todos.filter((p, i) => !i || p.distanceToSquared(todos[i - 1]) > 1e-6); // sin tramos de largo cero
        const largos = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
        return { pts, largos, total: largos.reduce((a, b) => a + b, 0) };
      });
      puntos.geometry.dispose();
      puntos.geometry = new THREE.BufferGeometry();
      puntos.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(tramos.length * POR_CAMINO * 3), 3));
    }
    function moverPuntos(t) {
      const pos = puntos.geometry.getAttribute('position');
      if (!pos) return;
      let n = 0;
      tramos.forEach((c) => {
        for (let k = 0; k < POR_CAMINO; k++) {
          let d = (((t * 0.45 + k / POR_CAMINO) % 1) * c.total), i = 0;
          while (i < c.largos.length - 1 && d > c.largos[i]) { d -= c.largos[i]; i++; }
          const p = c.pts[i].clone().lerp(c.pts[i + 1], Math.min(1, d / c.largos[i]));
          pos.setXYZ(n++, p.x, p.y, p.z);
        }
      });
      pos.needsUpdate = true;
    }

    // ------------------------------------------------------------ elegir e iluminar
    function pintarSel() {
      Object.keys(piezas).forEach((id) => piezas[id].forEach((m) => {
        const si = id === sel;
        m.material.color.setHex(si ? AZUL : BASE);
        m.material.emissive.setHex(si ? AZUL : 0x000000);
        m.material.emissiveIntensity = si ? 0.35 : 0;
        m.material.opacity = si ? 1 : 0.92;
        m.children[0].material.color.setHex(si ? CIELO : ARISTA);
      }));
      armarCamino(sel);
      moverPuntos(0);
    }
    function elegir(id) {
      if (!id || id === sel && api) return;
      sel = id;
      pintarSel();
      if (alElegir) alElegir(id);
    }

    const rayo = new THREE.Raycaster(), raton = new THREE.Vector2();
    function tocado(ev) {
      const r = renderer.domElement.getBoundingClientRect();
      raton.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
      rayo.setFromCamera(raton, camera);
      const hit = rayo.intersectObjects(elegibles, false)[0];
      return hit ? hit.object.userData.id : null;
    }
    renderer.domElement.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      const id = tocado(ev);
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
      if (id) elegir(id);
    });
    renderer.domElement.addEventListener('click', (ev) => { const id = tocado(ev); if (id) elegir(id); });

    // ------------------------------------------------------------ tamaño y cuadro
    const tam = () => {
      const w = cont.clientWidth, h = cont.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = 12.6 * Math.max(1, 1.9 / camera.aspect); // en pantallas angostas se aleja para que quepan los dos
      camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);
    pintarSel();

    let t = 0, previo = performance.now();
    function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      const dt = Math.min(ahora - previo, 64) / 1000;
      previo = ahora;
      if (document.hidden || !cont.offsetParent || !cont.clientWidth) return;
      if (renderer.domElement.width !== Math.round(cont.clientWidth * renderer.getPixelRatio())) tam();
      const quieto = global.Mov && global.Mov.reducido();
      ctl.autoRotate = !quieto;
      if (!quieto) { t += dt; moverPuntos(t); }
      ctl.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);

    api = { elegir };
    return api;
  }

  global.Camino3D = {
    montar,
    elegir(id) { if (api) api.elegir(id); else sel = id; },
    elegido() { return sel; },
  };
})(window);

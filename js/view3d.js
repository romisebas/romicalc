/* Vista 3D interactiva (Three.js r128, local en vendor/).
 * Ejes: X del plano → X de three; Y del plano → −Z de three; altura → Y de three.
 */
(function (global) {
  'use strict';

  let renderer, scene, camera, controls, grupo, contenedor, primera = true;
  const COLOR = {
    concreto: 0xb9b4a8, borde: 0x5d5a52, acero: 0xb4441f, aceroMal: 0xd12f2f,
    dovela: 0x8a3317, perimetro: 0x2f6db5, mal: 0xd12f2f,
  };

  function disponible() { return typeof global.THREE !== 'undefined'; }

  function init(el) {
    contenedor = el;
    if (!disponible()) {
      el.innerHTML = '<p class="vacio">No se pudo cargar Three.js (vendor/three.min.js). La vista 3D no está disponible.</p>';
      return false;
    }
    const THREE = global.THREE;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.85));
    const sol = new THREE.DirectionalLight(0xffffff, 0.75);
    sol.position.set(4, 8, 5);
    scene.add(sol);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.addEventListener('change', render);
    const ro = new ResizeObserver(redimensionar);
    ro.observe(el);
    redimensionar();
    return true;
  }

  function redimensionar() {
    if (!renderer) return;
    const w = contenedor.clientWidth || 400, h = contenedor.clientHeight || 300;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }

  function render() { if (renderer) renderer.render(scene, camera); }

  function liberar(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  function caja(THREE, w, h, d, mat, bordeColor) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: bordeColor }));
    m.add(e);
    return m;
  }

  // Barra recta entre dos puntos (cilindro)
  function barra(THREE, a, b, radio, mat) {
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const largo = va.distanceTo(vb);
    const g = new THREE.CylinderGeometry(radio, radio, largo, 10);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(va.clone().add(vb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return m;
  }

  function bucle(THREE, pts, color, y) {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], y, -p[1])));
    return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color }));
  }

  function update(R) {
    if (!renderer) return;
    const THREE = global.THREE;
    if (grupo) { scene.remove(grupo); liberar(grupo); }
    grupo = new THREE.Group();
    const { Lx, Ly, h, d, r } = R;
    const { Cx, Cy } = R.inp.columna;
    const altoCol = Math.max(1.0, h * 2);

    const matConcreto = new THREE.MeshStandardMaterial({ color: COLOR.concreto, transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.9 });
    const zap = caja(THREE, Lx, h, Ly, matConcreto, COLOR.borde);
    zap.position.set(0, h / 2, 0);
    grupo.add(zap);
    const matCol = new THREE.MeshStandardMaterial({ color: COLOR.concreto, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.9 });
    const col = caja(THREE, Cx, altoCol, Cy, matCol, COLOR.borde);
    col.position.set(0, h + altoCol / 2, 0);
    grupo.add(col);

    // Parrilla inferior: X abajo, Y encima
    const sx = R.acero.selX, sy = R.acero.selY;
    const rx = sx.db / 2000, ry = sy.db / 2000;
    const matX = new THREE.MeshStandardMaterial({ color: sx.estado === 'mal' ? COLOR.aceroMal : COLOR.acero, roughness: 0.55, metalness: 0.35 });
    const matY = new THREE.MeshStandardMaterial({ color: sy.estado === 'mal' ? COLOR.aceroMal : COLOR.acero, roughness: 0.55, metalness: 0.35 });
    const yX = r + rx, yY = r + 2 * rx + ry;
    const gancho = (rb) => Math.min(h - r - 0.03, 12 * rb * 2);
    global.Dibujo.posicionesParrilla(Ly, r, sx).forEach((py) => {
      const z = -py, x1 = -Lx / 2 + r, x2 = Lx / 2 - r, gh = gancho(rx);
      grupo.add(barra(THREE, [x1, yX, z], [x2, yX, z], rx, matX));
      grupo.add(barra(THREE, [x1, yX, z], [x1, yX + gh, z], rx, matX));
      grupo.add(barra(THREE, [x2, yX, z], [x2, yX + gh, z], rx, matX));
    });
    global.Dibujo.posicionesParrilla(Lx, r, sy).forEach((px) => {
      const z1 = -(-Ly / 2 + r), z2 = -(Ly / 2 - r), gh = gancho(ry);
      grupo.add(barra(THREE, [px, yY, z1], [px, yY, z2], ry, matY));
      grupo.add(barra(THREE, [px, yY, z1], [px, yY + gh, z1], ry, matY));
      grupo.add(barra(THREE, [px, yY, z2], [px, yY + gh, z2], ry, matY));
    });

    // Dovelas con gancho de 90° hacia el centro de la columna
    const rc = R.ld.db / 2000;
    const matD = new THREE.MeshStandardMaterial({ color: R.ld.ok ? COLOR.dovela : COLOR.mal, roughness: 0.5, metalness: 0.35 });
    const yApoyo = r + 2 * rx + 2 * ry + rc;
    const lg = 12 * rc * 2;
    global.Dibujo.barrasColumna(Cx, Cy, R.inp.columna.nBarras, 0.05).forEach((p) => {
      const x = p[0], z = -p[1];
      grupo.add(barra(THREE, [x, yApoyo, z], [x, h + altoCol - 0.02, z], rc, matD));
      const n = Math.hypot(x, z) || 1;
      grupo.add(barra(THREE, [x, yApoyo, z], [x - x / n * lg, yApoyo, z - z / n * lg], rc, matD));
    });
    // Estribos de la columna (solo como referencia visual)
    const ex = Cx / 2 - 0.035, ez = Cy / 2 - 0.035;
    for (let i = 0; i < 4; i++) {
      grupo.add(bucle(THREE, [[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez]], COLOR.dovela, h + 0.1 + i * (altoCol - 0.2) / 3));
    }

    // Perímetro crítico de punzonamiento sobre la cara superior
    const hx = (Cx + d) / 2, hy = (Cy + d) / 2;
    grupo.add(bucle(THREE, [[hx, hy], [-hx, hy], [-hx, -hy], [hx, -hy]], R.pz.ok ? COLOR.perimetro : COLOR.mal, h + 0.002));

    // Rejilla del terreno de apoyo
    const tam = Math.ceil(Math.max(Lx, Ly) + 1.5);
    const grid = new THREE.GridHelper(tam, tam * 4, 0x9c968a, 0xcfc9bc);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grupo.add(grid);

    scene.add(grupo);
    if (primera) { encuadrar(R); primera = false; }
    render();
  }

  function encuadrar(R) {
    if (!renderer) return;
    const dist = Math.max(R.Lx, R.Ly, 1.5) * 2.1;
    camera.position.set(dist * 0.85, dist * 0.75, dist * 0.95);
    controls.target.set(0, R.h * 0.8, 0);
    controls.update();
    render();
  }

  function snapshot() {
    if (!renderer) return null;
    render();
    return renderer.domElement.toDataURL('image/png');
  }

  global.Vista3D = { init, update, encuadrar, snapshot, disponible };
})(window);

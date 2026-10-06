/* Vista 3D interactiva (Three.js r128, local en vendor/).
 * Ejes: X del plano → X de three; Y del plano → −Z de three; altura → Y de three.
 */
(function (global) {
  'use strict';

  let renderer, scene, camera, controls, grupo, contenedor, primera = true, vuelo = null;
  const COLOR = { concreto: 0xb3b8bd, borde: 0x56606b, acero: 0xc2502a, mal: 0xd1342b, dovela: 0x8f3a1c, perimetro: 0x2f6db5, grid1: 0x8d96a0, grid2: 0xc9cfd5 };

  function init(el) {
    contenedor = el;
    if (typeof global.THREE === 'undefined') {
      el.insertAdjacentHTML('beforeend', '<p class="vacio">No se pudo cargar Three.js (vendor/three.min.js). La vista 3D no está disponible.</p>');
      return false;
    }
    const THREE = global.THREE;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8690, 0.85));
    const sol = new THREE.DirectionalLight(0xffffff, 0.75);
    sol.position.set(4, 8, 5);
    scene.add(sol);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.addEventListener('change', render);
    controls.addEventListener('start', () => { if (vuelo) { vuelo.cancelar(); vuelo = null; } });
    // La amortiguación necesita cuadros mientras el usuario arrastra o la inercia continúa.
    let hasta = 0, corriendo = false;
    controls.addEventListener('start', () => { hasta = Infinity; if (!corriendo) { corriendo = true; bucle(); } });
    controls.addEventListener('end', () => { hasta = performance.now() + 700; });
    function bucle() {
      controls.update(); render();
      if (performance.now() < hasta) requestAnimationFrame(bucle); else corriendo = false;
    }
    new ResizeObserver(redimensionar).observe(el);
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
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function caja(THREE, w, h, d, mat) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: COLOR.borde })));
    return m;
  }

  function barra(THREE, a, b, radio, mat, lados) {
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, va.distanceTo(vb), lados || 10), mat);
    m.position.copy(va.clone().add(vb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    return m;
  }

  function bucleLinea(THREE, pts, color, y) {
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

    const matConcreto = () => new THREE.MeshStandardMaterial({ color: COLOR.concreto, transparent: true, opacity: 0.26, depthWrite: false, roughness: 0.9 });
    const zap = caja(THREE, Lx, h, Ly, matConcreto());
    zap.position.set(0, h / 2, 0);
    grupo.add(zap);
    const col = caja(THREE, Cx, altoCol, Cy, matConcreto());
    col.position.set(0, h + altoCol / 2, 0);
    grupo.add(col);

    // Refuerzo inferior: capa X abajo, capa Y encima (barras o malla)
    const rd = global.Dibujo.refuerzoDibujo(R);
    const mat = (mal) => new THREE.MeshStandardMaterial({ color: mal ? COLOR.mal : COLOR.acero, roughness: 0.55, metalness: 0.35 });
    const matX = mat(rd.X.mal), matY = mat(rd.Y.mal);
    const rx = rd.X.db / 2000, ry = rd.Y.db / 2000;
    const lados = rd.malla ? 6 : 10;
    for (let capa = 0; capa < rd.capas; capa++) {
      const base = r + capa * 2 * (rx + ry);
      const yX = base + rx, yY = base + 2 * rx + ry;
      const gh = (rad) => (rd.malla ? 0 : Math.min(h - r - 0.03, 24 * rad));
      global.Dibujo.posicionesParrilla(Ly, r, rd.X).forEach((py) => {
        const z = -py, x1 = -Lx / 2 + r, x2 = Lx / 2 - r;
        grupo.add(barra(THREE, [x1, yX, z], [x2, yX, z], rx, matX, lados));
        if (gh(rx)) { grupo.add(barra(THREE, [x1, yX, z], [x1, yX + gh(rx), z], rx, matX)); grupo.add(barra(THREE, [x2, yX, z], [x2, yX + gh(rx), z], rx, matX)); }
      });
      global.Dibujo.posicionesParrilla(Lx, r, rd.Y).forEach((px) => {
        const z1 = Ly / 2 - r, z2 = -(Ly / 2 - r);
        grupo.add(barra(THREE, [px, yY, z1], [px, yY, z2], ry, matY, lados));
        if (gh(ry)) { grupo.add(barra(THREE, [px, yY, z1], [px, yY + gh(ry), z1], ry, matY)); grupo.add(barra(THREE, [px, yY, z2], [px, yY + gh(ry), z2], ry, matY)); }
      });
    }

    // Dovelas con gancho de 90° hacia el centro de la columna
    const rc = R.ld.db / 2000;
    const matD = new THREE.MeshStandardMaterial({ color: R.ld.ok ? COLOR.dovela : COLOR.mal, roughness: 0.5, metalness: 0.35 });
    const yApoyo = r + rd.capas * 2 * (rx + ry) + rc;
    const lg = 24 * rc;
    global.Dibujo.barrasColumna(Cx, Cy, R.inp.columna.nBarras, 0.05).forEach((p) => {
      const x = p[0], z = -p[1];
      grupo.add(barra(THREE, [x, yApoyo, z], [x, h + altoCol - 0.02, z], rc, matD));
      const nrm = Math.hypot(x, z) || 1;
      grupo.add(barra(THREE, [x, yApoyo, z], [x - x / nrm * lg, yApoyo, z - z / nrm * lg], rc, matD));
    });
    const ex = Cx / 2 - 0.035, ez = Cy / 2 - 0.035;
    for (let i = 0; i < 4; i++) grupo.add(bucleLinea(THREE, [[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez]], COLOR.dovela, h + 0.1 + i * (altoCol - 0.2) / 3));

    const hx = (Cx + d) / 2, hy = (Cy + d) / 2;
    grupo.add(bucleLinea(THREE, [[hx, hy], [-hx, hy], [-hx, -hy], [hx, -hy]], R.pz.ok ? COLOR.perimetro : COLOR.mal, h + 0.002));

    const tam = Math.ceil(Math.max(Lx, Ly) + 1.5);
    const grid = new THREE.GridHelper(tam, tam * 4, COLOR.grid1, COLOR.grid2);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grupo.add(grid);

    scene.add(grupo);
    if (primera) { encuadrar(R, false); primera = false; }
    render();
  }

  // Lleva la cámara a la vista inicial; con animar = true, vuela suavemente desde donde está.
  function encuadrar(R, animar) {
    if (!renderer) return;
    const THREE = global.THREE;
    const dist = Math.max(R.Lx, R.Ly, 1.5) * 2.1;
    const destino = new THREE.Vector3(dist * 0.85, dist * 0.75, dist * 0.95);
    const foco = new THREE.Vector3(0, R.h * 0.8, 0);
    if (vuelo) vuelo.cancelar();
    if (!animar) {
      camera.position.copy(destino); controls.target.copy(foco); controls.update(); render(); return;
    }
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    vuelo = global.Mov.tween(700, (e) => {
      camera.position.lerpVectors(p0, destino, e);
      controls.target.lerpVectors(t0, foco, e);
      controls.update();
      render();
    }, () => { vuelo = null; });
  }

  function snapshot() { if (!renderer) return null; render(); return renderer.domElement.toDataURL('image/png'); }

  global.Vista3D = { init, update, encuadrar, snapshot };
})(window);

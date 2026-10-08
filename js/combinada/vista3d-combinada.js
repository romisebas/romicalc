/* Vista 3D de la zapata combinada (beta 1.2): zapata larga, dos columnas y el acero superior,
 * inferior y transversal. Concreto translúcido para ver el armado; se gira con el mouse (OrbitControls).
 * Solo dibuja mientras el contenedor se ve; con calidad baja usa menos segmentos.
 */
(function (global) {
  'use strict';
  let cont = null, renderer = null, scene = null, camera = null, controls = null, grupo = null, q = null;

  function montar(el) {
    const THREE = global.THREE;
    if (cont || !THREE || !el) return !!cont;
    cont = el;
    const e = global.Escena3D.crear(cont, { exposicion: 1.0 });
    renderer = e.renderer; scene = e.scene; q = e.calidad;
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.2));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(4, 8, 6); scene.add(sol);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const cuadro = () => {
      requestAnimationFrame(cuadro);
      if (!grupo || !cont.offsetParent || document.hidden) return;
      const w = cont.clientWidth, h = cont.clientHeight;
      if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      controls.update();
      renderer.render(scene, camera);
    };
    requestAnimationFrame(cuadro);
    return true;
  }

  function liberar(o) { o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }

  // Barra recta entre dos puntos (cilindro)
  function barra(THREE, mat, a, b, radio) {
    const v = new THREE.Vector3().subVectors(b, a), largo = v.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, q && q.alta ? 10 : 6), mat);
    m.position.copy(a).addScaledVector(v, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
    return m;
  }

  function mostrar(R) {
    const THREE = global.THREE;
    if (!cont || !THREE || !R) return;
    if (grupo) { scene.remove(grupo); liberar(grupo); }
    grupo = new THREE.Group();
    const RF = global.Refuerzo, L = R.L, B = R.B, h = R.h, r = R.inp.zapata.r;
    const concreto = new THREE.MeshStandardMaterial({ color: 0xb9b6b0, roughness: 0.9, transparent: true, opacity: 0.32, depthWrite: false });
    const columna = new THREE.MeshStandardMaterial({ color: 0x9c9993, roughness: 0.85 });
    const acero = new THREE.MeshStandardMaterial({ color: 0x6b7480, metalness: 0.8, roughness: 0.35 });
    const aceroSup = new THREE.MeshStandardMaterial({ color: 0x4f7cb3, metalness: 0.6, roughness: 0.4 });
    // Origen en el centro de la zapata; x a lo largo, z a lo ancho, y hacia arriba
    const X = (x) => x - L / 2, Z = (z) => z - B / 2;
    const zap = new THREE.Mesh(new THREE.BoxGeometry(L, h, B), concreto);
    zap.position.y = h / 2; grupo.add(zap);
    R.cols.forEach((c) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(c.c1, 1.0, c.c2), columna);
      m.position.set(X(c.x), h + 0.5, 0); grupo.add(m);
    });
    const rad = (n) => RF.BARS[n].db / 2000;
    const fila = (sel, y, mat, x0, x1) => {
      for (let j = 0; j < sel.n; j++) {
        const z = r + (B - 2 * r) * (sel.n > 1 ? j / (sel.n - 1) : 0.5);
        grupo.add(barra(THREE, mat, new THREE.Vector3(X(x0), y, Z(z)), new THREE.Vector3(X(x1), y, Z(z)), rad(sel.barra)));
      }
    };
    // Longitudinal inferior y superior (la superior cortada como en el despiece)
    fila(R.fl.inf.sel, r, acero, r, L - r);
    const PI = R.lon.puntos.PI, ld = R.ld.sup / 1000;
    const xa = PI.length === 2 ? Math.max(r, PI[0] - ld) : r, xb = PI.length === 2 ? Math.min(L - r, PI[1] + ld) : L - r;
    fila(R.fl.sup.sel, h - r, aceroSup, xa, xb);
    // Transversales: franjas bajo cada columna y acero mínimo entre ellas
    const transv = (x0, x1, sel) => {
      if (!sel) return;
      for (let j = 0; j < sel.n; j++) {
        const x = x0 + (x1 - x0) * (sel.n > 1 ? j / (sel.n - 1) : 0.5);
        grupo.add(barra(THREE, acero, new THREE.Vector3(X(x), r + 0.03, Z(r)), new THREE.Vector3(X(x), r + 0.03, Z(B - r)), rad(sel.barra)));
      }
    };
    R.tr.forEach((t) => transv(Math.max(r, t.x0), Math.min(L - r, t.x1), t.sel));
    if (R.entre.sel) transv(R.tr[0].x1, R.tr[1].x0, R.entre.sel);
    scene.add(grupo);
    const D = Math.max(L, B) * 1.25;
    camera.position.set(D * 0.55, D * 0.6, D * 0.85);
    controls.target.set(0, h / 2, 0);
    controls.update();
  }

  global.Vista3DCombinada = { montar, mostrar };
})(window);

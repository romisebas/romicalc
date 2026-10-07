/* Escultura de vidrio de la portada (v1.1): zapata y columna de vidrio con el acero real por dentro.
 * Vidrio con transmisión y luz de entorno (en equipos lentos, vidrio translúcido simple), acero metálico,
 * sombra suave en el piso y un leve paralaje que sigue al mouse. Gira despacio; quieta sin animaciones.
 * Solo dibuja mientras la portada está visible. Colores de --vidrio y --tinta (tema claro u oscuro).
 */
(function (global) {
  'use strict';

  function montar(cont) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D || !cont || cont.firstChild) return;
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.1 });
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(4.6, 3.1, 5.2);
    camera.lookAt(0, 0.55, 0);

    const llave = new THREE.DirectionalLight(0xffffff, 2.4); llave.position.set(3, 7, 4);
    llave.castShadow = renderer.shadowMap.enabled;
    llave.shadow.mapSize.set(1024, 1024); llave.shadow.radius = 6;
    Object.assign(llave.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
    scene.add(llave);
    const contra = new THREE.PointLight(0xffffff, 14, 14, 2); contra.position.set(-3, 2, -3); scene.add(contra);

    const pieza = new THREE.Group();
    const Lx = 2.4, Ly = 2.0, h = 0.5, Cx = 0.5, Cy = 0.4, altoCol = 1.3, ex = 0.18;

    // Vidrio: transmisión real en equipos rápidos; translúcido simple en los lentos
    const matVidrio = calidad.alta
      ? new THREE.MeshPhysicalMaterial({ roughness: 0.02, metalness: 0, transmission: 1, thickness: 0.08, ior: 1.25, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 0.8 })
      : new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.25, roughness: 0.06, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const matArista = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
    const matAcero = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.3 });
    const bloque = (w, alto, d, x, y, z) => {
      const g = new THREE.BoxGeometry(w, alto, d);
      const m = new THREE.Mesh(g, matVidrio); m.position.set(x, y, z); m.castShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), matArista));
      pieza.add(m);
    };
    bloque(Lx, h, Ly, 0, h / 2, 0);
    bloque(Cx, altoCol, Cy, ex, h + altoCol / 2, 0);

    // Parrilla y dovelas como barras metálicas (una sola malla instanciada por tipo)
    const r = 0.08, yb = r + 0.02, s = 0.2, radio = 0.014;
    const barraX = new THREE.CylinderGeometry(radio, radio, Lx - 2 * r, 8); barraX.rotateZ(Math.PI / 2);
    const barraY = new THREE.CylinderGeometry(radio, radio, Ly - 2 * r, 8); barraY.rotateX(Math.PI / 2);
    const nX = Math.floor((Ly - 2 * r) / s + 1e-6) + 1, nY = Math.floor((Lx - 2 * r) / s + 1e-6) + 1;
    const ix = new THREE.InstancedMesh(barraX, matAcero, nX), iy = new THREE.InstancedMesh(barraY, matAcero, nY);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nX; i++) { m4.makeTranslation(0, yb, -Ly / 2 + r + i * s); ix.setMatrixAt(i, m4); }
    for (let j = 0; j < nY; j++) { m4.makeTranslation(-Lx / 2 + r + j * s, yb + 2 * radio, 0); iy.setMatrixAt(j, m4); }
    pieza.add(ix, iy);
    const dov = new THREE.CylinderGeometry(radio * 1.2, radio * 1.2, h + altoCol * 0.75 - yb, 8);
    const idv = new THREE.InstancedMesh(dov, matAcero, 4);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], k) => {
      m4.makeTranslation(ex + sx * (Cx / 2 - 0.06), yb + (h + altoCol * 0.75 - yb) / 2, sz * (Cy / 2 - 0.06)); idv.setMatrixAt(k, m4);
    });
    pieza.add(idv);
    pieza.position.y = -0.1;
    scene.add(pieza);

    // Sombra suave sobre un piso invisible
    if (renderer.shadowMap.enabled) {
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.35 }));
      piso.rotation.x = -Math.PI / 2; piso.position.y = -0.12; piso.receiveShadow = true; scene.add(piso);
    }

    function colores() {
      const cs = getComputedStyle(cont);
      const vidrio = new THREE.Color(cs.getPropertyValue('--vidrio').trim() || '#8fa9cc');
      const tinta = new THREE.Color(cs.getPropertyValue('--tinta').trim() || '#ffffff');
      matVidrio.color = vidrio;
      matArista.color = tinta;
      contra.color = vidrio;
    }
    colores();
    new MutationObserver(colores).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const tam = () => {
      const w = cont.clientWidth, alto = cont.clientHeight;
      if (!w || !alto) return;
      renderer.setSize(w, alto, false);
      camera.aspect = w / alto;
      camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    // Paralaje: la escultura se inclina un poco hacia el mouse
    const objetivo = { x: 0, y: 0 }, actual = { x: 0, y: 0 };
    addEventListener('pointermove', (e) => { objetivo.x = (e.clientX / innerWidth - 0.5) * 0.35; objetivo.y = (e.clientY / innerHeight - 0.5) * 0.18; }, { passive: true });

    let t0 = performance.now(), giro = -0.5;
    function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      if (document.hidden || !cont.offsetParent) { t0 = ahora; return; } // portada oculta: no se dibuja
      if (!cont.clientWidth) return;
      if (renderer.domElement.width !== Math.round(cont.clientWidth * renderer.getPixelRatio())) tam();
      const quieto = global.Mov && global.Mov.reducido();
      if (!quieto) {
        const dt = Math.min(ahora - t0, 64) / 1000;
        giro += dt * 0.18;
        actual.x += (objetivo.x - actual.x) * 0.06; actual.y += (objetivo.y - actual.y) * 0.06;
        pieza.position.y = -0.1 + Math.sin(ahora / 1600) * 0.04;
      }
      pieza.rotation.set(actual.y, giro + actual.x, 0);
      t0 = ahora;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);
  }

  global.Escultura = { montar };
})(window);

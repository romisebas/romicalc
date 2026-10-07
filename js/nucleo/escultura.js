/* Escultura de vidrio de la portada (v3.2): zapata y columna translúcidas con su acero visible por dentro.
 * Gira despacio; con animaciones desactivadas queda quieta. Solo dibuja mientras la portada está visible.
 * Colores tomados de --vidrio y --tinta para seguir el tema claro u oscuro.
 */
(function (global) {
  'use strict';

  function montar(cont) {
    const THREE = global.THREE;
    if (!THREE || !cont || cont.firstChild) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    cont.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(4.6, 3.1, 5.2);
    camera.lookAt(0, 0.55, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const llave = new THREE.DirectionalLight(0xffffff, 1.1); llave.position.set(3, 6, 4); scene.add(llave);
    const contra = new THREE.PointLight(0xffffff, 1.4, 20); contra.position.set(-3, 2, -3); scene.add(contra);

    // Vidrio
    const matVidrio = new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.22, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const matArista = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 });
    const matAcero = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
    const pieza = new THREE.Group();
    const Lx = 2.4, Ly = 2.0, h = 0.5, Cx = 0.5, Cy = 0.4, altoCol = 1.3, ex = 0.18;
    const bloque = (w, alto, d, x, y, z) => {
      const g = new THREE.BoxGeometry(w, alto, d);
      const m = new THREE.Mesh(g, matVidrio); m.position.set(x, y, z);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), matArista));
      pieza.add(m);
    };
    bloque(Lx, h, Ly, 0, h / 2, 0);
    bloque(Cx, altoCol, Cy, ex, h + altoCol / 2, 0);

    // Parrilla inferior y dovelas, visibles a través del vidrio
    const pts = [];
    const r = 0.08, yb = r + 0.02, s = 0.2;
    for (let z = -Ly / 2 + r; z <= Ly / 2 - r + 1e-6; z += s) pts.push(-Lx / 2 + r, yb, z, Lx / 2 - r, yb, z);
    for (let x = -Lx / 2 + r; x <= Lx / 2 - r + 1e-6; x += s) pts.push(x, yb + 0.03, -Ly / 2 + r, x, yb + 0.03, Ly / 2 - r);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      const x = ex + sx * (Cx / 2 - 0.06), z = sz * (Cy / 2 - 0.06);
      pts.push(x, yb, z, x, h + altoCol * 0.75, z);
    });
    const gAcero = new THREE.BufferGeometry();
    gAcero.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    pieza.add(new THREE.LineSegments(gAcero, matAcero));
    pieza.position.y = -0.1;
    scene.add(pieza);

    function colores() {
      const cs = getComputedStyle(cont);
      const vidrio = new THREE.Color(cs.getPropertyValue('--vidrio').trim() || '#8fa9cc');
      const tinta = new THREE.Color(cs.getPropertyValue('--tinta').trim() || '#ffffff');
      matVidrio.color = vidrio;
      matArista.color = tinta;
      matAcero.color = tinta;
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

    let t0 = performance.now();
    function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      if (document.hidden || !cont.offsetParent) { t0 = ahora; return; } // portada oculta: no se dibuja
      if (!cont.clientWidth) return;
      if (renderer.domElement.width !== Math.round(cont.clientWidth * renderer.getPixelRatio())) tam();
      const quieto = global.Mov && global.Mov.reducido();
      if (!quieto) {
        const dt = Math.min(ahora - t0, 64) / 1000;
        pieza.rotation.y += dt * 0.18;
        pieza.position.y = -0.1 + Math.sin(ahora / 1600) * 0.04;
      }
      t0 = ahora;
      renderer.render(scene, camera);
    }
    pieza.rotation.y = -0.5;
    requestAnimationFrame(cuadro);
  }

  global.Escultura = { montar };
})(window);

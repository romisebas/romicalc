/* Portada (v1.1): "despiece flotante" de una zapata.
 * Las piezas flotan separadas: bloque de concreto, parrilla de acero, canasto de la columna
 * (dovelas con gancho y estribos) y columna. Al acercar el cursor a "Diseñar" se juntan y forman
 * la zapata armada (Escultura.armar(true)); al alejarlo se vuelven a separar. En pantallas táctiles
 * se arman y se separan solas cada pocos segundos. Quieta (armada a medias) sin animaciones.
 * Solo dibuja mientras la portada está visible.
 */
(function (global) {
  'use strict';
  let objetivo = 0, armado = 0;

  function montar(cont) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D || !cont || cont.firstChild) return;
    const { renderer, scene } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.05 });
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(5.4, 4.2, 6.2);
    camera.lookAt(0, 1.1, 0);

    const llave = new THREE.DirectionalLight(0xffffff, 2.6); llave.position.set(4, 8, 5);
    llave.castShadow = renderer.shadowMap.enabled;
    llave.shadow.mapSize.set(1024, 1024); llave.shadow.radius = 6;
    Object.assign(llave.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
    scene.add(llave);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404650, 0.8));

    const Lx = 2.4, Ly = 2.0, h = 0.5, Cx = 0.5, Cy = 0.4, altoCol = 1.4, r = 0.08;
    const matConcreto = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.85, metalness: 0 });
    const matCol = new THREE.MeshStandardMaterial({ color: 0xa9adb2, roughness: 0.8, metalness: 0 });
    const matAcero = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.3 });
    const matArista = new THREE.LineBasicMaterial({ color: 0x2b2f35, transparent: true, opacity: 0.5 });
    const conAristas = (m) => { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), matArista)); m.castShadow = true; m.receiveShadow = true; return m; };

    // Piezas: cada una con su altura armada (y0) y su separación en el despiece (dy)
    const piezas = [];
    const pieza = (obj, y0, dy, giro) => { obj.position.y = y0; scene.add(obj); piezas.push({ obj, y0, dy, giro: giro || 0 }); return obj; };

    pieza(conAristas(new THREE.Mesh(new THREE.BoxGeometry(Lx, h, Ly), matConcreto)), h / 2, 0);

    const parrilla = new THREE.Group();
    const rb = 0.016, s = 0.2;
    const gX = new THREE.CylinderGeometry(rb, rb, Lx - 2 * r, 8); gX.rotateZ(Math.PI / 2);
    const gY = new THREE.CylinderGeometry(rb, rb, Ly - 2 * r, 8); gY.rotateX(Math.PI / 2);
    for (let z = -Ly / 2 + r; z <= Ly / 2 - r + 1e-6; z += s) { const m = new THREE.Mesh(gX, matAcero); m.position.z = z; m.castShadow = true; parrilla.add(m); }
    for (let x = -Lx / 2 + r; x <= Lx / 2 - r + 1e-6; x += s) { const m = new THREE.Mesh(gY, matAcero); m.position.set(x, 2 * rb, 0); m.castShadow = true; parrilla.add(m); }
    pieza(parrilla, r, 0.75, 0.15);

    const canasto = new THREE.Group();
    const alto = altoCol + h - 0.15;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      const x = sx * (Cx / 2 - 0.06), z = sz * (Cy / 2 - 0.06);
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, alto, 8), matAcero); v.position.set(x, alto / 2, z); canasto.add(v);
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), matAcero);
      g.rotation.z = -sx * Math.PI / 2; g.position.set(x + sx * 0.14, 0, z); canasto.add(g);
    });
    for (let i = 0; i < 7; i++) {
      const ex = Cx / 2 - 0.04, ez = Cy / 2 - 0.04, y = h + 0.1 + i * (altoCol - 0.2) / 6;
      const camino = new THREE.CurvePath();
      const P = [[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez], [ex, ez]].map((p) => new THREE.Vector3(p[0], 0, p[1]));
      for (let k = 0; k < 4; k++) camino.add(new THREE.LineCurve3(P[k], P[k + 1]));
      const e = new THREE.Mesh(new THREE.TubeGeometry(camino, 24, 0.009, 6, true), matAcero); e.position.y = y; canasto.add(e);
    }
    canasto.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    pieza(canasto, r + 0.04, 1.45, -0.2);

    pieza(conAristas(new THREE.Mesh(new THREE.BoxGeometry(Cx, altoCol, Cy), matCol)), h + altoCol / 2, 2.25, 0.25);

    if (renderer.shadowMap.enabled) {
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.32 }));
      piso.rotation.x = -Math.PI / 2; piso.position.y = -0.01; piso.receiveShadow = true; scene.add(piso);
    }

    const tam = () => {
      const w = cont.clientWidth, a = cont.clientHeight;
      if (!w || !a) return;
      renderer.setSize(w, a, false);
      camera.aspect = w / a; camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    // En pantallas táctiles (sin cursor) se arma y se separa sola
    const tactil = global.matchMedia && global.matchMedia('(hover: none)').matches;
    if (tactil) setInterval(() => { objetivo = objetivo ? 0 : 1; }, 3500);

    let t0 = performance.now(), giro = -0.5;
    function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      if (document.hidden || !cont.offsetParent) { t0 = ahora; return; }
      if (!cont.clientWidth) return;
      if (renderer.domElement.width !== Math.round(cont.clientWidth * renderer.getPixelRatio())) tam();
      const quieto = global.Mov && global.Mov.reducido();
      const dt = Math.min(ahora - t0, 64) / 1000;
      t0 = ahora;
      if (quieto) armado = 0.5;
      else {
        armado += (objetivo - armado) * Math.min(1, dt * 5);
        giro += dt * 0.16;
      }
      const flota = quieto ? 0 : Math.sin(ahora / 900);
      const sep = 1 - armado;
      piezas.forEach((p, i) => {
        p.obj.position.y = p.y0 + p.dy * sep + (i ? flota * 0.05 * sep * (1 + i * 0.3) : 0);
        p.obj.rotation.y = giro + p.giro * sep;
      });
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);
  }

  function armar(si) { objetivo = si ? 1 : 0; }
  function estado() { return { armado, objetivo }; }

  global.Escultura = { montar, armar, estado };
})(window);

/* Portada (RomiCalc): maqueta de vidrio de una estructura, un pórtico con losa sobre zapatas y un puente de losa.
 * Las piezas flotan separadas por capas (zapatas, columnas, vigas, losa; estribos y tablero) y al acercar el cursor a
 * "Diseñar" se juntan (Escultura.armar(true)); al alejarlo se vuelven a separar. Las zapatas brillan en el azul de la
 * marca porque son lo que ya se calcula. En pantallas táctiles se arma y se separa sola cada pocos segundos.
 * Quieta (armada a medias) sin animaciones. Solo dibuja mientras la portada está visible.
 */
(function (global) {
  'use strict';
  let objetivo = 0, armado = 0;

  function montar(cont) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D || !cont || cont.firstChild) return;
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.05 });
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(4.4, 3.3, 5.6);
    camera.lookAt(0.3, 0.75, 0);

    const llave = new THREE.DirectionalLight(0xffffff, 2.6); llave.position.set(4, 8, 5);
    llave.castShadow = renderer.shadowMap.enabled;
    llave.shadow.mapSize.set(1024, 1024); llave.shadow.radius = 6;
    Object.assign(llave.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
    scene.add(llave);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404650, 0.8));

    // Vidrio: con tarjeta gráfica, transmisión real; en equipos lentos, un translúcido simple
    const vidrio = calidad.alta
      ? new THREE.MeshPhysicalMaterial({ color: 0xe8eef6, roughness: 0.12, metalness: 0, transmission: 0.85, thickness: 0.4, ior: 1.4, transparent: true })
      : new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.6 });
    const azul = new THREE.MeshStandardMaterial({ color: 0x2a5db0, emissive: 0x2a5db0, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.1 });
    const arista = new THREE.LineBasicMaterial({ color: 0x8c96a3, transparent: true, opacity: 0.7 });
    const aristaAzul = new THREE.LineBasicMaterial({ color: 0x8db8f2 });

    // Piezas: cada grupo con su altura armada (y0), su separación en el despiece (dy) y un giro propio
    const piezas = [];
    function capa(dy, giro) { const g = new THREE.Group(); scene.add(g); piezas.push({ obj: g, y0: 0, dy, giro: giro || 0 }); return g; }
    function caja(g, w, h, d, x, y, z, mat) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || vidrio);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), mat === azul ? aristaAzul : arista));
      g.add(m);
    }

    // Pórtico de dos vanos: 6 zapatas y columnas, vigas en los dos sentidos y la losa
    const xs = [-1.9, -1.0, -0.1], zs = [-0.5, 0.5], hz = 0.15, alto = 1.25, hv = 0.14;
    const zap = capa(0), col = capa(0.45, 0.12), vig = capa(0.9, -0.1), los = capa(1.35, 0.15);
    xs.forEach((x) => zs.forEach((z) => {
      caja(zap, 0.46, hz, 0.46, x, hz / 2, z, azul);
      caja(col, 0.13, alto, 0.13, x, hz + alto / 2, z);
    }));
    const yv = hz + alto - hv / 2;
    zs.forEach((z) => caja(vig, 1.94, hv, 0.12, -1.0, yv, z));
    xs.forEach((x) => caja(vig, 0.12, hv, 1.12, x, yv, 0));
    caja(los, 2.2, 0.07, 1.4, -1.0, hz + alto + 0.035, 0);

    // Puente de losa: dos estribos y el tablero
    const est = capa(0, 0), tab = capa(0.8, -0.12);
    [0.75, 2.45].forEach((x) => caja(est, 0.24, 0.62, 0.95, x, 0.31, 0));
    caja(tab, 2.05, 0.1, 0.95, 1.6, 0.67, 0);

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

    let t0 = performance.now(), giro = -0.35;
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
        giro += dt * 0.12;
      }
      const flota = quieto ? 0 : Math.sin(ahora / 900);
      const sep = 1 - armado;
      const c = Math.cos(giro), s = Math.sin(giro); // gira alrededor del centro de la maqueta (x = 0.3)
      piezas.forEach((p, i) => {
        p.obj.position.set(0.3 - 0.3 * c, p.y0 + p.dy * sep + (p.dy ? flota * 0.04 * sep * (1 + i * 0.25) : 0), 0.3 * s);
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

/* Animación de inicio en 3D: una zapata se arma paso a paso.
 * Excavación → parrilla en X → parrilla en Y → dovelas → vaciado del concreto → columna y estribos.
 * Con { suave: true } la cámara queda quieta y los elementos solo crecen o aparecen (sin vuelos).
 */
(function (global) {
  'use strict';

  const DUR = 5.2; // segundos
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fase = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (k) => 1 - Math.pow(1 - k, 3);
  const eInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  let vivo = null;

  function colores() {
    const cs = getComputedStyle(document.documentElement);
    const c = (n, d) => (cs.getPropertyValue(n).trim() || d);
    return { acero: c('--acero', '#1d1d1d'), concreto: c('--vidrio', '#8fa9cc'), borde: c('--concreto-borde', '#56606b'), linea: c('--linea-fuerte', '#b3bcc5'), tinta: c('--tinta', '#1b232c') };
  }

  function reproducir(cont, opciones) {
    const THREE = global.THREE;
    if (!THREE) return Promise.resolve();
    const suave = !!(opciones && opciones.suave);
    const col = colores();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    cont.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7882, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 0.8);
    sol.position.set(4, 7, 5);
    scene.add(sol);

    const tam = () => {
      const w = cont.clientWidth || innerWidth, h = cont.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    const Lx = 2.4, Ly = 2.0, h = 0.5, r = 0.075, Cx = 0.5, Cy = 0.4, altoCol = 1.5;
    const matAcero = new THREE.MeshStandardMaterial({ color: col.acero, roughness: 0.45, metalness: 0.4 });

    // Terreno con la excavación
    const grid = new THREE.GridHelper(8, 32, new THREE.Color(col.linea), new THREE.Color(col.linea));
    grid.material.transparent = true; grid.material.opacity = 0.0;
    scene.add(grid);
    const fosa = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Lx + 0.5, 0.6, Ly + 0.5)),
      new THREE.LineBasicMaterial({ color: col.borde, transparent: true, opacity: 0 }));
    fosa.position.set(0, 0.3 - 0.6 + 0.6, 0);
    scene.add(fosa);

    // Barra con origen en un extremo, para que pueda "crecer"
    function barra(largo, radio) {
      const g = new THREE.CylinderGeometry(radio, radio, largo, 8);
      g.translate(0, largo / 2, 0);
      return new THREE.Mesh(g, matAcero);
    }
    const rb = 0.016;
    const barrasX = [], barrasY = [];
    const nX = 12, nY = 14;
    for (let i = 0; i < nX; i++) {
      const b = barra(Lx - 2 * r, rb);
      b.rotation.z = -Math.PI / 2;
      b.position.set(-(Lx / 2 - r), r + rb, -(Ly / 2 - r) + i * (Ly - 2 * r) / (nX - 1));
      b.scale.y = 0.0001;
      scene.add(b); barrasX.push(b);
    }
    for (let i = 0; i < nY; i++) {
      const b = barra(Ly - 2 * r, rb);
      b.rotation.x = Math.PI / 2;
      b.position.set(-(Lx / 2 - r) + i * (Lx - 2 * r) / (nY - 1), r + 3 * rb, -(Ly / 2 - r));
      b.scale.y = 0.0001;
      scene.add(b); barrasY.push(b);
    }

    // Dovelas con gancho de 90° hacia el centro
    const dovelas = new THREE.Group();
    const ax = Cx / 2 - 0.05, ay = Cy / 2 - 0.05, rd = 0.02;
    [[ax, ay], [-ax, ay], [-ax, -ay], [ax, -ay], [0, ay], [0, -ay], [ax, 0], [-ax, 0]].forEach(([x, z]) => {
      const v = barra(h + altoCol - r - 0.1, rd);
      v.position.set(x, r + 0.05, z);
      dovelas.add(v);
      const n = Math.hypot(x, z) || 1;
      const g = barra(0.22, rd);
      g.position.set(x, r + 0.05, z);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-x / n, 0, -z / n));
      dovelas.add(g);
    });
    dovelas.position.y = suave ? 0 : 1.6;
    dovelas.visible = false;
    scene.add(dovelas);

    // Concreto de la zapata: crece desde el fondo
    const gZ = new THREE.BoxGeometry(Lx, h, Ly); gZ.translate(0, h / 2, 0);
    const matZ = new THREE.MeshStandardMaterial({ color: col.concreto, roughness: 0.1, transparent: true, opacity: 0, depthWrite: false });
    const zap = new THREE.Mesh(gZ, matZ);
    const bordeZ = new THREE.LineSegments(new THREE.EdgesGeometry(gZ), new THREE.LineBasicMaterial({ color: col.borde, transparent: true, opacity: 0 }));
    zap.add(bordeZ);
    zap.scale.y = 0.001;
    scene.add(zap);

    // Columna: crece hacia arriba; estribos aparecen en secuencia
    const gC = new THREE.BoxGeometry(Cx, altoCol, Cy); gC.translate(0, altoCol / 2, 0);
    const matC = new THREE.MeshStandardMaterial({ color: col.concreto, roughness: 0.1, transparent: true, opacity: 0.25, depthWrite: false });
    const colm = new THREE.Mesh(gC, matC);
    colm.add(new THREE.LineSegments(new THREE.EdgesGeometry(gC), new THREE.LineBasicMaterial({ color: col.borde })));
    colm.position.y = h;
    colm.scale.y = 0.001;
    colm.visible = false;
    scene.add(colm);
    const estribos = [];
    for (let i = 0; i < 6; i++) {
      const ex = Cx / 2 - 0.035, ez = Cy / 2 - 0.035, y = h + 0.12 + i * (altoCol - 0.25) / 5;
      const g = new THREE.BufferGeometry().setFromPoints([[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez]].map((p) => new THREE.Vector3(p[0], y, p[1])));
      const l = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: col.acero }));
      l.visible = false;
      scene.add(l); estribos.push(l);
    }

    const foco = new THREE.Vector3(0, 0.55, 0);
    function camara(t) {
      if (suave) { const a = Math.max(1, 1.25 / camera.aspect); camera.position.set(4.2 * a, 3.4 * a, 4.6 * a); camera.lookAt(foco); return; }
      const k = eInOut(fase(t, 0, DUR));
      const ang = 0.35 + k * 1.15;                 // giro alrededor de la zapata
      // se acerca y al final se aleja; en pantallas verticales la cámara retrocede para que quepa la zapata
      const ajuste = Math.max(1, 1.25 / camera.aspect);
      const radio = (4.6 - 1.0 * Math.sin(k * Math.PI) + fase(t, 4.3, DUR) * 1.2) * ajuste;
      const alto = 2.6 + 1.2 * k;
      camera.position.set(Math.cos(ang) * radio, alto, Math.sin(ang) * radio);
      camera.lookAt(foco);
    }

    function estado(t) {
      const a = eOut(fase(t, 0, 0.7));
      grid.material.opacity = 0.45 * a;
      fosa.material.opacity = 0.8 * a * (1 - fase(t, 2.7, 3.4));
      barrasX.forEach((b, i) => { b.scale.y = Math.max(0.0001, eOut(fase(t, 0.6 + i * 0.06, 1.0 + i * 0.06))); });
      barrasY.forEach((b, i) => { b.scale.y = Math.max(0.0001, eOut(fase(t, 1.3 + i * 0.05, 1.7 + i * 0.05))); });
      const kd = fase(t, 2.1, 2.7);
      dovelas.visible = kd > 0;
      if (!suave) dovelas.position.y = 1.6 * (1 - eOut(kd));
      const kz = eOut(fase(t, 2.7, 3.5));
      zap.scale.y = Math.max(0.001, kz);
      matZ.opacity = 0.1 + 0.18 * kz; // vidrio: el acero se ve por dentro
      bordeZ.material.opacity = kz;
      const kc = eOut(fase(t, 3.4, 4.2));
      colm.visible = kc > 0;
      colm.scale.y = Math.max(0.001, kc);
      estribos.forEach((e, i) => { e.visible = t > 3.5 + i * 0.12; });
      camara(t);
    }

    return new Promise((fin) => {
      const t0 = performance.now();
      let parar = false;
      vivo = { saltar() { parar = true; } };
      const cuadro = (ahora) => {
        const t = (ahora - t0) / 1000;
        estado(Math.min(t, DUR));
        renderer.render(scene, camera);
        if (!parar && t < DUR) { requestAnimationFrame(cuadro); return; }
        // limpieza
        removeEventListener('resize', tam);
        scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        renderer.dispose();
        renderer.domElement.remove();
        vivo = null;
        fin();
      };
      requestAnimationFrame(cuadro);
    });
  }

  function saltar() { if (vivo) vivo.saltar(); }

  global.Intro3D = { reproducir, saltar, DUR };
})(window);

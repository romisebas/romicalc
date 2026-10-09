/* Camino de las cargas en 3D ("¿Qué quieres calcular?") sobre la maqueta compartida (js/nucleo/maqueta3d.js).
 * Al pasar el ratón por un elemento se ilumina en azul y unos puntos bajan por donde viaja su carga hasta el suelo.
 * Al tocarlo, o al pasar por su tarjeta, la cámara viaja hasta él; "Ver todo" vuelve a la vista completa.
 * Solo dibuja mientras la página está visible; sin animaciones, los puntos quedan quietos y se dibuja solo si algo cambia.
 */
(function (global) {
  'use strict';
  const CIELO = 0x8db8f2;
  let api = null, sel = 'vigas', alElegir = null;

  function montar(cont, cb) {
    alElegir = cb || null;
    const THREE = global.THREE;
    if (api || !THREE || !global.Escena3D || !global.Maqueta3D || !cont) return api;
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.0, entorno: 0.6 });
    const simple = !calidad.alta;
    const maqueta = global.Maqueta3D.crear(THREE, { simple });
    scene.add(maqueta.raiz);

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

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
    const ctl = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(ctl, { enableZoom: false, enablePan: false, enableDamping: true, minPolarAngle: 0.5, maxPolarAngle: 1.45, autoRotateSpeed: 0.3 });
    const GENERAL = { mira: maqueta.limites.centro.clone(), dist: 21 };
    let vista = GENERAL;
    ctl.target.copy(GENERAL.mira);
    camera.position.copy(GENERAL.mira).add(new THREE.Vector3(1, 0.78, 1.15).normalize().multiplyScalar(GENERAL.dist));

    // ------------------------------------------------------------ puntos que bajan por el camino de la carga
    const POR = 8;
    const puntos = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: CIELO, size: 0.16, transparent: true, depthTest: false }));
    puntos.renderOrder = 2; scene.add(puntos);
    let tramos = [];
    function armarCamino(id) {
      tramos = (maqueta.caminos[id] || []).map((todos) => {
        const pts = todos.filter((p, i) => !i || p.distanceToSquared(todos[i - 1]) > 1e-6); // sin tramos de largo cero
        const l = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
        return { pts, l, total: l.reduce((a, b) => a + b, 0) };
      });
      puntos.geometry.dispose();
      puntos.geometry = new THREE.BufferGeometry();
      puntos.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(tramos.length * POR * 3), 3));
    }
    function moverPuntos(t) {
      const pos = puntos.geometry.getAttribute('position');
      let n = 0;
      tramos.forEach((c) => {
        for (let k = 0; k < POR; k++) {
          let d = ((t * 0.35 + k / POR) % 1) * c.total, i = 0;
          while (i < c.l.length - 1 && d > c.l[i]) { d -= c.l[i]; i++; }
          const p = c.pts[i].clone().lerp(c.pts[i + 1], Math.min(1, d / c.l[i]));
          pos.setXYZ(n++, p.x, p.y, p.z);
        }
      });
      pos.needsUpdate = true;
    }

    // ------------------------------------------------------------ elegir, iluminar y enfocar
    let sucio = true; // sin animaciones solo se dibuja cuando algo cambia
    function pintarSel() { maqueta.resaltar(sel); armarCamino(sel); moverPuntos(0); sucio = true; }
    function elegir(id, enfocar) {
      if (!id) return;
      if (enfocar && maqueta.focos[id]) { vista = maqueta.focos[id]; sucio = true; }
      if (id === sel) return;
      sel = id;
      pintarSel();
      if (alElegir) alElegir(id);
    }
    function verTodo() { vista = GENERAL; sucio = true; }

    const rayo = new THREE.Raycaster(), raton = new THREE.Vector2();
    const elegibles = maqueta.todas.filter((m) => m.userData.id);
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
      if (id) elegir(id, false);
    });
    renderer.domElement.addEventListener('click', (ev) => { const id = tocado(ev); if (id) elegir(id, true); });
    ctl.addEventListener('change', () => { sucio = true; });

    // ------------------------------------------------------------ tamaño y cuadro
    const tam = () => {
      sucio = true;
      const w = cont.clientWidth, h = cont.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);
    pintarSel();

    const dir = new THREE.Vector3();
    let t = 0, previo = performance.now();
    function cuadro(ahora) {
      requestAnimationFrame(cuadro);
      const dt = Math.min(ahora - previo, 64) / 1000;
      previo = ahora;
      if (document.hidden || !cont.offsetParent || !cont.clientWidth) return;
      if (renderer.domElement.width !== Math.round(cont.clientWidth * renderer.getPixelRatio())) tam();
      const quieto = global.Mov && global.Mov.reducido();
      ctl.autoRotate = !quieto && vista === GENERAL;
      // La cámara viaja hacia el elemento elegido sin perder el ángulo desde el que se mira
      const k = quieto ? 1 : Math.min(1, dt * 3);
      const lejos = vista.dist * Math.max(1, 1.6 / camera.aspect); // en pantallas angostas se aleja para que quepa
      dir.copy(camera.position).sub(ctl.target);
      const d = dir.length();
      if (ctl.target.distanceToSquared(vista.mira) > 1e-4 || Math.abs(d - lejos) > 1e-3) {
        ctl.target.lerp(vista.mira, k);
        camera.position.copy(ctl.target).add(dir.setLength(d + (lejos - d) * k));
        sucio = true;
      }
      if (!quieto) { t += dt; moverPuntos(t); maqueta.actualizar(t); sucio = true; }
      ctl.update();
      if (!sucio) return;
      sucio = false;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);

    api = { elegir, verTodo };
    return api;
  }

  global.Camino3D = {
    montar,
    elegir(id, enfocar) { if (api) api.elegir(id, enfocar); else sel = id; },
    verTodo() { if (api) api.verTodo(); },
    elegido() { return sel; },
  };
})(window);

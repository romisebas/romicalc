/* Mini-3D de las figuras de la memoria (diapositivas): un solo renderizador para todas, que se mueve a la diapositiva
 * visible. Quieto: la cámara queda en la vista que mejor muestra la pieza; se puede arrastrar para mirarla y al soltar
 * vuelve suave a su posición. Solo dibuja cuando algo cambia. Etiquetas en HTML encima (nítidas, con subíndices).
 * Las piezas ligadas a una ecuación se iluminan en azul, y al pasar el ratón por ellas avisan para resaltar la ecuación.
 * Sin WebGL, en equipos lentos o con las animaciones desactivadas no se usa: la diapositiva queda con el SVG técnico.
 * Las escenas de cada figura están en js/nucleo/mini3d-figuras.js (Mini3D.ESCENAS).
 */
(function (global) {
  'use strict';
  const AZUL = 0x2a5db0;
  let base = null; // { THREE, renderer, camera, ctl, env, ray } compartido
  let actual = null; // la figura que está a la vista

  // Para las pruebas automáticas (WebGL por software): window.__m3dForzar = true obliga a usar el 3D
  function disponible() {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D) return false;
    if (global.__m3dForzar) return true;
    return !(global.Mov && global.Mov.reducido()) && global.Escena3D.calidad().alta;
  }

  function iniciar() {
    if (base) return base;
    const THREE = global.THREE;
    const tmp = document.createElement('div');
    const { renderer, scene } = global.Escena3D.crear(tmp, { sombras: true, exposicion: 1.05, entorno: 0.9 });
    renderer.setClearColor(0xffffff, 0);
    const camera = new THREE.PerspectiveCamera(30, 1.4, 0.05, 200);
    const ctl = new THREE.OrbitControls(camera, renderer.domElement);
    Object.assign(ctl, { enableZoom: false, enablePan: false, enableDamping: false, rotateSpeed: 0.6 });
    ctl.addEventListener('change', () => dibujar());
    ctl.addEventListener('start', () => { if (actual) actual.volviendo = false; });
    ctl.addEventListener('end', () => volver());
    renderer.domElement.className = 'm3d-lienzo';
    base = { THREE, renderer, camera, ctl, env: scene.environment, ray: new THREE.Raycaster(), raton: new THREE.Vector2() };
    renderer.domElement.addEventListener('pointermove', tocar);
    renderer.domElement.addEventListener('pointerleave', () => { if (actual && actual.ligaSobre) { actual.onLiga(actual.ligaSobre, false); actual.ligaSobre = null; } });
    return base;
  }

  // Materiales de la escena (cada pieza con el suyo para poder iluminarla sola)
  function materiales(THREE) {
    return {
      concreto: () => new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.85 }),
      vidrio: () => new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false }),
      columna: () => new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.8 }),
      tinta: () => new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.6 }),
      acero: () => new THREE.MeshStandardMaterial({ color: 0x6f757d, metalness: 0.7, roughness: 0.35 }),
      cielo: (op) => new THREE.MeshStandardMaterial({ color: 0x8db8f2, roughness: 0.5, transparent: true, opacity: op || 0.55, depthWrite: false, side: THREE.DoubleSide }),
      plano: () => new THREE.MeshBasicMaterial({ color: 0x1d1d1d, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
      azul: () => new THREE.MeshStandardMaterial({ color: AZUL, emissive: AZUL, emissiveIntensity: 0.45, roughness: 0.5, transparent: true, opacity: 0.9 }),
    };
  }

  // Monta la figura f ({ tipo, dir, ult } o f.m3d) en el <figure> de la diapositiva. Devuelve { resaltar } o null.
  function montar(fig, f, R, onLiga) {
    const t = f && (f.m3d || f);
    const crearEscena = t && global.Mini3D.ESCENAS[t.tipo];
    if (!crearEscena || !R || !disponible()) return null;
    const b = iniciar(), THREE = b.THREE;
    const scene = new THREE.Scene();
    scene.environment = b.env; scene.environmentIntensity = 0.7;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 1.2));
    const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(4, 9, 6); scene.add(sol);
    let e;
    try { e = crearEscena(THREE, R, t, materiales(THREE)); } catch (err) { return null; } // si una escena falla, queda el SVG
    scene.add(e.grupo);
    // Encuadre: la cámara mira el centro de la pieza desde la dirección de la escena, a la distancia que la hace caber
    const caja = new THREE.Box3().setFromObject(e.grupo), esfera = caja.getBoundingSphere(new THREE.Sphere());
    const mira = e.mira || esfera.center, dist = esfera.radius / Math.sin(15 * Math.PI / 180) * (e.zoom || 1);
    const casa = mira.clone().add((e.dir || new THREE.Vector3(1, 0.8, 1.2)).clone().normalize().multiplyScalar(dist));

    const capa = document.createElement('div'); capa.className = 'm3d';
    const etiquetas = (e.etiquetas || []).map((q) => {
      const el = document.createElement('span');
      el.className = 'm3d-etq' + (q.clase ? ' ' + q.clase : ''); el.innerHTML = q.html;
      capa.appendChild(el);
      return { el, p: q.p, ancla: q.clase === 'abajo' ? ' translate(-50%, 35%)' : ' translate(-50%, -130%)' };
    });
    fig.classList.add('con-3d');
    fig.appendChild(capa);
    capa.prepend(b.renderer.domElement);
    if (actual && actual.ro) actual.ro.disconnect();
    actual = { fig, capa, scene, e, mira, casa, etiquetas, onLiga: onLiga || (() => {}), ligaSobre: null, volviendo: false };
    // si la diapositiva aún no tiene tamaño (pestaña oculta), se dibuja cuando lo tenga
    if (global.ResizeObserver) { actual.ro = new ResizeObserver(() => { tam(); dibujar(); }); actual.ro.observe(capa); }
    b.ctl.target.copy(mira); b.camera.position.copy(casa); b.ctl.update();
    tam(); dibujar();
    return {
      resaltar(liga, si) {
        if (!actual || actual.fig !== fig) return;
        (e.ligas[liga] || []).forEach((m) => { m.material = si ? (m.userData.azul = m.userData.azul || materiales(THREE).azul()) : m.userData.mat0; });
        dibujar();
      },
    };
  }

  function tam() {
    if (!actual) return;
    const w = actual.capa.clientWidth || 400, h = Math.round(w * 0.7);
    base.renderer.setSize(w, h, false);
    base.camera.aspect = w / h; base.camera.updateProjectionMatrix();
  }

  function dibujar() {
    if (!actual || !actual.capa.isConnected) return;
    base.renderer.render(actual.scene, base.camera);
    const w = actual.capa.clientWidth, h = Math.round(w * 0.7), v = new base.THREE.Vector3();
    actual.etiquetas.forEach((q) => {
      v.copy(q.p).project(base.camera);
      q.el.style.transform = 'translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px)' + q.ancla;
    });
  }

  // Al soltar, la cámara vuelve suave a su posición
  function volver() {
    if (!actual) return;
    const a = actual, desde = base.camera.position.clone(), t0 = performance.now();
    a.volviendo = true;
    const paso = (ahora) => {
      if (!a.volviendo || actual !== a) return;
      const k = Math.min(1, (ahora - t0) / 600), e = 1 - Math.pow(1 - k, 3);
      base.camera.position.lerpVectors(desde, a.casa, e); base.camera.lookAt(a.mira); base.ctl.target.copy(a.mira);
      dibujar();
      if (k < 1) requestAnimationFrame(paso); else a.volviendo = false;
    };
    requestAnimationFrame(paso);
  }

  // Al pasar el ratón por una pieza ligada, se resalta su ecuación
  function tocar(ev) {
    if (!actual || ev.buttons) return;
    const r = base.renderer.domElement.getBoundingClientRect();
    base.raton.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
    base.ray.setFromCamera(base.raton, base.camera);
    const ligadas = [].concat(...Object.values(actual.e.ligas || {}));
    const hit = base.ray.intersectObjects(ligadas, false)[0];
    const liga = hit ? Object.keys(actual.e.ligas).find((k) => actual.e.ligas[k].includes(hit.object)) : null;
    if (liga === actual.ligaSobre) return;
    if (actual.ligaSobre) actual.onLiga(actual.ligaSobre, false);
    actual.ligaSobre = liga;
    if (liga) actual.onLiga(liga, true);
    base.renderer.domElement.style.cursor = liga ? 'pointer' : 'grab';
  }

  addEventListener('resize', () => { if (actual) { tam(); dibujar(); } });

  global.Mini3D = { ESCENAS: {}, disponible, montar, activo: () => !!(actual && actual.capa.isConnected) };
})(window);

/* Vista 3D de la zapata combinada (beta 1.2, mejorada con las skills de three.js).
 * - Concreto translúcido con sombra suave sobre el terreno y luz de entorno.
 * - Acero por grupos (superior, inferior, franjas, entre franjas, dovelas) en mallas instanciadas;
 *   al pasar el mouse una barra resalta su grupo y aparece su marca (raycasting).
 * - Botones para mostrar u ocultar cada grupo, la presión del suelo y los diagramas V y M como cintas.
 * - "Separar": despiece animado que levanta parrillas y dovelas (como la portada).
 * - La cámara conserva el giro del usuario al editar; solo se reencuadra si cambia mucho la zapata.
 */
(function (global) {
  'use strict';

  let cont = null, barra = null, renderer = null, scene = null, camera = null, controls = null, q = null;
  let raiz = null, grupos = {}, tip = null, clave = '', sep = 0, sepObjetivo = 0, sucio = true, Rult = null, resaltado = null;
  const visibles = { concreto: true, sup: true, inf: true, trans: true, dovelas: true, presion: true, diagramas: false };
  const COLOR = { sup: 0x4f7cb3, inf: 0x8a9099, trans: 0xb08a4a, dovelas: 0x6c8a5a };
  const BOTONES = [['concreto', 'Concreto'], ['sup', 'Superior'], ['inf', 'Inferior'], ['trans', 'Transversal'], ['dovelas', 'Dovelas'], ['presion', 'Presión'], ['diagramas', 'Diagramas V y M']];
  // Altura a la que sube cada grupo con "Separar"
  const SUBE = { concreto: 0, inf: 0.25, trans: 0.55, sup: 1.0, dovelas: 1.5, presion: -0.4, diagramas: 0 };

  function montar(el, barraEl) {
    const THREE = global.THREE;
    if (cont) return true;
    if (!THREE || !el) return false;
    cont = el; barra = barraEl;
    const e = global.Escena3D.crear(cont, { exposicion: 1.0, sombras: true });
    renderer = e.renderer; scene = e.scene; q = e.calidad;
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.1));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4);
    sol.position.set(5, 10, 7);
    if (q.sombras) {
      sol.castShadow = true;
      sol.shadow.mapSize.set(1024, 1024);
      Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
      sol.shadow.bias = -0.0004;
    }
    scene.add(sol);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.addEventListener('change', () => { sucio = true; });
    tip = document.createElement('div');
    tip.className = 'tip-planta tip-3d';
    tip.hidden = true;
    cont.appendChild(tip);
    conectarRaton();
    if (barra) pintarBarra();
    const cuadro = () => {
      requestAnimationFrame(cuadro);
      if (!raiz || !cont.offsetParent || document.hidden) return;
      const w = cont.clientWidth, h = cont.clientHeight;
      if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); sucio = true;
      }
      // Despiece: cada grupo se acerca a su altura con una curva suave
      if (Math.abs(sep - sepObjetivo) > 1e-3) {
        sep += (sepObjetivo - sep) * (global.Mov && global.Mov.reducido() ? 1 : 0.14);
        Object.keys(grupos).forEach((k) => { grupos[k].position.y = SUBE[k] * sep; });
        sucio = true;
      }
      controls.update();
      if (!sucio) return;
      sucio = false;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(cuadro);
    return true;
  }

  function pintarBarra() {
    barra.innerHTML = '<div class="seg seg-sm v3d-capas" role="group" aria-label="Capas del 3D">' +
      BOTONES.map(([k, t]) => '<button type="button" data-capa3d="' + k + '" aria-pressed="' + String(visibles[k]) + '"><span class="v3d-muestra" style="--c:' + (COLOR[k] ? '#' + COLOR[k].toString(16).padStart(6, '0') : 'var(--tinta-3)') + '"></span>' + t + '</button>').join('') +
      '</div><div class="v3d-acciones"><button type="button" class="btn btn-mini" data-separar aria-pressed="false">Separar</button><button type="button" class="btn btn-mini" data-encuadrar3d>Encuadrar</button></div>';
    barra.addEventListener('click', (e) => {
      const c = e.target.closest('[data-capa3d]'), s = e.target.closest('[data-separar]');
      if (c) { const k = c.dataset.capa3d; visibles[k] = !visibles[k]; c.setAttribute('aria-pressed', String(visibles[k])); aplicarVisibles(); }
      if (s) { sepObjetivo = sepObjetivo ? 0 : 1; s.setAttribute('aria-pressed', String(!!sepObjetivo)); }
      if (e.target.closest('[data-encuadrar3d]') && Rult) encuadrar(Rult);
    });
  }

  function aplicarVisibles() {
    Object.keys(grupos).forEach((k) => { grupos[k].visible = visibles[k] !== false; });
    sucio = true;
  }

  // Raycasting: la barra bajo el mouse resalta su grupo y muestra su marca
  function conectarRaton() {
    const THREE = global.THREE, ray = new THREE.Raycaster(), m = new THREE.Vector2();
    let ultimo = 0;
    renderer.domElement.addEventListener('pointermove', (ev) => {
      const ahora = performance.now();
      if (ahora - ultimo < 40 || !raiz) return; // como máximo 25 lecturas por segundo
      ultimo = ahora;
      const r = renderer.domElement.getBoundingClientRect();
      m.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(m, camera);
      const acero = Object.keys(grupos).filter((k) => COLOR[k] && grupos[k].visible).map((k) => grupos[k]);
      const hit = ray.intersectObjects(acero, true)[0];
      const g = hit ? hit.object.userData.grupo : null;
      if (g !== resaltado) {
        resaltar(g);
        renderer.domElement.style.cursor = g ? 'pointer' : 'grab';
      }
      if (hit) {
        tip.textContent = hit.object.userData.etq || '';
        tip.hidden = false;
        tip.style.transform = 'translate(' + Math.round(ev.clientX - r.left + 14) + 'px,' + Math.round(ev.clientY - r.top + 14) + 'px)';
      } else tip.hidden = true;
    });
    renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  // Resalta las barras de un grupo (y apaga el anterior, si sigue existiendo)
  function resaltar(g) {
    const tono = (k, hex) => { if (k && grupos[k]) grupos[k].traverse((o) => { if (o.material && o.material.emissive) o.material.emissive.setHex(hex); }); };
    tono(resaltado, 0x000000);
    tono(g, 0x334466);
    resaltado = g && grupos[g] ? g : null;
    sucio = true;
  }

  function liberar(o) { o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }

  // Barras de un grupo en una sola malla instanciada: cada barra va de a hasta b
  function barras(THREE, lista, radio, color, grupo, etq) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, q && q.alta ? 10 : 6);
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.38 });
    const malla = new THREE.InstancedMesh(geo, mat, Math.max(1, lista.length));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    lista.forEach(([a, b], i) => {
      const v = new THREE.Vector3().subVectors(b, a), largo = v.length();
      Q.setFromUnitVectors(Y, v.clone().normalize());
      S.set(radio, largo, radio);
      P.copy(a).addScaledVector(v, 0.5);
      M.compose(P, Q, S);
      malla.setMatrixAt(i, M);
    });
    malla.count = lista.length;
    malla.castShadow = !!(q && q.sombras);
    malla.userData = { grupo, etq };
    return malla;
  }

  function construir(R) {
    const THREE = global.THREE, RF = global.Refuerzo, L = R.L, B = R.B, h = R.h, r = R.inp.zapata.r;
    const X = (x) => x - L / 2, Z = (z) => z - B / 2, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const rad = (n) => RF.BARS[n].db / 2000 * 1.6; // un poco más gruesas para que se lean
    const nuevo = (k) => { const g = new THREE.Group(); g.name = k; grupos[k] = g; raiz.add(g); return g; };

    // Concreto y columnas
    const gc = nuevo('concreto');
    const concreto = new THREE.MeshStandardMaterial({ color: 0xc9c5bd, roughness: 0.92, transparent: true, opacity: 0.28, depthWrite: false });
    const zap = new THREE.Mesh(new THREE.BoxGeometry(L, h, B), concreto);
    zap.position.y = h / 2; gc.add(zap);
    const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(zap.geometry), new THREE.LineBasicMaterial({ color: 0x55585e }));
    aristas.position.copy(zap.position); gc.add(aristas);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xa7a39c, roughness: 0.85 });
    R.cols.forEach((c) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(c.c1, 1.1, c.c2), colMat);
      m.position.set(X(c.x), h + 0.55, 0); m.castShadow = !!q.sombras; gc.add(m);
    });

    // Longitudinales (superior cortada como en el despiece)
    const fila = (sel, y, x0, x1) => {
      const l = [];
      for (let j = 0; j < sel.n; j++) { const z = r + (B - 2 * r) * (sel.n > 1 ? j / (sel.n - 1) : 0.5); l.push([V3(X(x0), y, Z(z)), V3(X(x1), y, Z(z))]); }
      return l;
    };
    const PI = R.lon.puntos.PI, ld = R.ld.sup / 1000;
    const xa = PI.length === 2 ? Math.max(r, PI[0] - ld) : r, xb = PI.length === 2 ? Math.min(L - r, PI[1] + ld) : L - r;
    if (R.fl.sup.sel.n) nuevo('sup').add(barras(THREE, fila(R.fl.sup.sel, h - r, xa, xb), rad(R.fl.sup.sel.barra), COLOR.sup, 'sup', 'L1 · Superior: ' + R.fl.sup.sel.resumen));
    if (R.fl.inf.sel.n) nuevo('inf').add(barras(THREE, fila(R.fl.inf.sel, r, r, L - r), rad(R.fl.inf.sel.barra), COLOR.inf, 'inf', 'L2 · Inferior: ' + R.fl.inf.sel.resumen));

    // Transversales: franjas y acero entre ellas, repartido en todos los tramos fuera de las franjas
    const gt = nuevo('trans'), yT = r + 0.035;
    const transv = (x0, x1, sel, n, etq) => {
      if (!sel || !n || x1 - x0 <= 0) return;
      const l = [];
      for (let j = 0; j < n; j++) { const x = x0 + (x1 - x0) * (n > 1 ? j / (n - 1) : 0.5); l.push([V3(X(x), yT, Z(r)), V3(X(x), yT, Z(B - r))]); }
      gt.add(barras(THREE, l, rad(sel.barra), COLOR.trans, 'trans', etq));
    };
    R.tr.forEach((t, i) => transv(Math.max(r, t.x0), Math.min(L - r, t.x1), t.sel, t.sel.n, 'T' + (i + 1) + ' · Franja ' + (i ? 'interior' : 'exterior') + ': ' + t.sel.resumen));
    if (R.entre.sel) {
      const tramos = [[r, R.tr[0].x0], [R.tr[0].x1, R.tr[1].x0], [R.tr[1].x1, L - r]].filter(([a, b]) => b - a > 0.05);
      const total = tramos.reduce((s, [a, b]) => s + b - a, 0);
      tramos.forEach(([a, b]) => transv(a, b, R.entre.sel, Math.max(1, Math.round(R.entre.sel.n * (b - a) / total)), 'T3 · Entre franjas: ' + R.entre.sel.resumen));
    }

    // Dovelas con su gancho sobre la parrilla inferior
    const gd = nuevo('dovelas');
    R.cols.forEach((c, i) => {
      const col = R.inp.columnas[i], n = col.nBarras, l = [], rr = 0.05;
      for (let j = 0; j < n; j++) {
        const t = j / n * Math.PI * 2, x = X(c.x) + Math.cos(t) * (c.c1 / 2 - rr), z = Math.sin(t) * (c.c2 / 2 - rr);
        l.push([V3(x, r + 0.06, z), V3(x, h + 0.9, z)]);
        l.push([V3(x, r + 0.06, z), V3(x + Math.cos(t) * 0.25, r + 0.06, z + Math.sin(t) * 0.25)]);
      }
      gd.add(barras(THREE, l, rad(col.barra), COLOR.dovelas, 'dovelas', 'D' + (i + 1) + ' · Dovelas: ' + n + ' #' + col.barra));
    });

    // Presión de servicio bajo la zapata, con la escala de color de la planta
    const gp = nuevo('presion'), sv = global.DibujoCombinada.servicioLineal(R), seg = 24;
    const geo = new THREE.PlaneGeometry(L, B, seg, 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colores = [], c3 = new THREE.Color(), smax = Math.max(sv.en(0), sv.en(L), 1e-9);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + L / 2, s = sv.en(x);
      pos.setY(i, -0.08 - 0.6 * s / smax);
      c3.set(global.DibujoCombinada.tono(s, sv.lim)); colores.push(c3.r, c3.g, c3.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    gp.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.85 })));

    // Diagramas V y M como cintas sobre los bordes largos
    const gv = nuevo('diagramas');
    const cinta = (vals, z, color, escala) => {
      const forma = new THREE.Shape();
      forma.moveTo(X(R.lon.xs[0]), 0);
      R.lon.xs.forEach((x, j) => forma.lineTo(X(x), vals[j] * escala));
      forma.lineTo(X(R.lon.xs[R.lon.xs.length - 1]), 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false }));
      m.position.set(0, h + 0.9, z);
      gv.add(m);
    };
    const Vmax = Math.max.apply(null, R.lon.V.map(Math.abs)) || 1, Mmax = Math.max.apply(null, R.lon.M.map(Math.abs)) || 1;
    cinta(R.lon.V, B / 2 + 0.15, 0x2b7fff, 0.45 / Vmax);
    cinta(R.lon.M.map((x) => -x), -B / 2 - 0.15, 0xd08a2b, 0.45 / Mmax);

    // Terreno que recibe la sombra
    if (q.sombras) {
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(L * 3, B * 4), new THREE.ShadowMaterial({ opacity: 0.22 }));
      piso.rotation.x = -Math.PI / 2; piso.position.y = -0.002; piso.receiveShadow = true;
      raiz.add(piso);
    }
  }

  function encuadrar(R) {
    const D = Math.max(R.L, R.B) * 1.25;
    camera.position.set(D * 0.55, D * 0.62, D * 0.9);
    controls.target.set(0, R.h / 2, 0);
    controls.update();
    sucio = true;
  }

  function mostrar(R) {
    const THREE = global.THREE;
    if (!cont || !THREE || !R) return;
    // Todo lo que cambia el dibujo: dimensiones, barras elegidas, cortes (ld), presiones y su límite
    const sel = (s) => (s ? [s.barra, s.n] : null);
    const firma = JSON.stringify([R.L, R.B, R.h, R.inp.zapata.r, R.inp.geometria, R.inp.columnas, sel(R.fl.sup.sel), sel(R.fl.inf.sel),
      R.tr.map((t) => [t.x0, t.x1, sel(t.sel)]), sel(R.entre.sel), R.ld.sup, R.lon.puntos.PI, R.q.q1, R.q.q2, global.DibujoCombinada.servicioLineal(R).lim]);
    if (firma === clave) return;
    const anterior = clave ? JSON.parse(clave) : null;
    clave = firma;
    if (raiz) { scene.remove(raiz); liberar(raiz); }
    raiz = new THREE.Group(); grupos = {}; resaltado = null;
    scene.add(raiz);
    construir(R);
    Object.keys(grupos).forEach((k) => { grupos[k].position.y = SUBE[k] * sep; });
    aplicarVisibles();
    // Se reencuadra solo la primera vez o si la zapata cambia más de un 25 %
    if (!anterior || Math.abs(anterior[0] - R.L) / R.L > 0.25 || Math.abs(anterior[1] - R.B) / R.B > 0.25) encuadrar(R);
    Rult = R;
    sucio = true;
  }

  global.Vista3DCombinada = {
    montar, mostrar, grupos: () => Object.keys(grupos),
    camara: () => (camera ? camera.position.toArray().map((x) => +x.toFixed(3)) : null),
    etiquetas: () => { const l = []; if (raiz) raiz.traverse((o) => { if (o.userData && o.userData.etq) l.push(o.userData.etq); }); return l; },
    resaltar, // para pruebas
    fijarCamara: (p) => { if (camera) { camera.position.fromArray(p); sucio = true; } }, // para pruebas
  };
})(window);

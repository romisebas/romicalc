/* Vista del refuerzo elegido (v1.1): un 3D pequeño y un dibujo acotado.
 * Barra corrugada: tramo con corrugas transversales y dos nervios longitudinales; sección con db y área.
 * Malla electrosoldada: trozo de panel con alambres soldados; planta con separaciones y diámetros.
 * El 3D gira despacio solo mientras se ve (y queda quieto con las animaciones desactivadas).
 * Acero metálico con luz de entorno; la pieza nueva entra girando y se puede arrastrar para girarla.
 */
(function (global) {
  'use strict';
  // Una instancia por contenedor (la aislada y cada viñeta de la combinada tienen la suya)
  function crear(el) {
    let cont = null, renderer = null, scene = null, camera = null, grupo = null, clave = '', entrada = 0;
    let giro = 0, inclina = 0.25, vel = 0, arrastre = null;
    const ACERO = 0x6b7480;

    function montar(el) {
      const THREE = global.THREE;
      if (!THREE || !el) return;
      cont = el;
      const e = global.Escena3D.crear(cont, { exposicion: 1.05 });
      renderer = e.renderer; scene = e.scene;
      camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 1.4));
      const sol = new THREE.DirectionalLight(0xffffff, 2.4); sol.position.set(3, 5, 4); scene.add(sol);
      const contra = new THREE.DirectionalLight(0xc9d6ea, 1.0); contra.position.set(-4, -2, -3); scene.add(contra);
      // Arrastrar para girar (con inercia al soltar)
      const lienzo = renderer.domElement;
      lienzo.style.touchAction = 'pan-y'; lienzo.style.cursor = 'grab';
      lienzo.addEventListener('pointerdown', (ev) => { arrastre = { x: ev.clientX, y: ev.clientY }; vel = 0; lienzo.setPointerCapture(ev.pointerId); lienzo.style.cursor = 'grabbing'; });
      lienzo.addEventListener('pointermove', (ev) => {
        if (!arrastre) return;
        const dx = (ev.clientX - arrastre.x) / 120, dy = (ev.clientY - arrastre.y) / 160;
        giro += dx; vel = dx; inclina = Math.max(-0.6, Math.min(1.1, inclina + dy));
        arrastre = { x: ev.clientX, y: ev.clientY };
      });
      const soltar = () => { arrastre = null; lienzo.style.cursor = 'grab'; };
      lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
      let t0 = performance.now();
      const cuadro = (t) => {
        requestAnimationFrame(cuadro);
        if (!grupo || !cont.offsetParent || document.hidden) { t0 = t; return; }
        const w = cont.clientWidth, h = cont.clientHeight;
        if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) || renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())) {
          renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        }
        const dt = Math.min(t - t0, 64) / 1000, quieto = global.Mov && global.Mov.reducido();
        if (!arrastre) { giro += quieto ? vel : vel + dt * 0.35; vel *= 0.92; }
        // Entrada: la pieza nueva llega girando y crece con un leve rebote
        const k = quieto ? 1 : Math.min(1, (t - entrada) / 700), c = 1.70158;
        const s = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
        grupo.scale.setScalar(0.4 + 0.6 * s);
        grupo.rotation.set(inclina, giro - (1 - k) * 2.4, 0);
        t0 = t;
        renderer.render(scene, camera);
      };
      requestAnimationFrame(cuadro);
    }

    function liberar(o) { o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }

    // Tramo de barra corrugada (unidades: 1 = 10 mm)
    function barra3d(THREE, e) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: ACERO, metalness: 0.9, roughness: 0.3 });
      const r = e.db / 20, L = 6;
      const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 32), mat);
      nucleo.rotation.z = Math.PI / 2; g.add(nucleo);
      // Corrugas: anillos inclinados a lo largo de la barra
      const paso = Math.max(0.28, r * 0.8);
      for (let x = -L / 2 + paso / 2; x < L / 2; x += paso) {
        const anillo = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 6, 28), mat);
        anillo.position.x = x; anillo.rotation.y = Math.PI / 2 + 0.35; g.add(anillo);
      }
      // Nervios longitudinales
      [-1, 1].forEach((s) => {
        const nervio = new THREE.Mesh(new THREE.BoxGeometry(L, r * 0.16, r * 0.16), mat);
        nervio.position.z = s * r; g.add(nervio);
      });
      camera.position.set(0, 1.6, 7.2); camera.lookAt(0, 0, 0);
      g.rotation.x = 0.25;
      return g;
    }

    // Trozo de malla: 4 × 4 alambres soldados (separaciones a escala)
    function malla3d(THREE, e) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: ACERO, metalness: 0.9, roughness: 0.32 });
      const k = 1 / 60; // 60 mm = 1 unidad
      const nL = 4, nT = 4, sL = e.sL * k, sT = e.sT * k;
      const anchoL = (nT - 1) * sT + sT * 0.8, anchoT = (nL - 1) * sL + sL * 0.8;
      for (let i = 0; i < nL; i++) {
        const z = (i - (nL - 1) / 2) * sL;
        const a = new THREE.Mesh(new THREE.CylinderGeometry(e.dL / 2 * k * 1.6, e.dL / 2 * k * 1.6, anchoL, 16), mat);
        a.rotation.z = Math.PI / 2; a.position.set(0, 0, z); g.add(a);
      }
      for (let j = 0; j < nT; j++) {
        const x = (j - (nT - 1) / 2) * sT;
        const a = new THREE.Mesh(new THREE.CylinderGeometry(e.dT / 2 * k * 1.6, e.dT / 2 * k * 1.6, anchoT, 16), mat);
        a.rotation.x = Math.PI / 2; a.position.set(x, (e.dL + e.dT) / 2 * k * 1.6, 0); g.add(a);
      }
      const lado = Math.max(anchoL, anchoT);
      camera.position.set(0, lado * 1.25, lado * 1.35); camera.lookAt(0, 0, 0);
      return g;
    }

    function mostrar(e) {
      const c = JSON.stringify(e);
      if (c === clave || !renderer) return;
      clave = c;
      const THREE = global.THREE;
      if (grupo) { scene.remove(grupo); liberar(grupo); }
      grupo = e.tipo === 'malla' ? malla3d(THREE, e) : barra3d(THREE, e);
      scene.add(grupo);
      entrada = performance.now();
      renderer.render(scene, camera);
    }

    montar(el);
    return { mostrar };
  }

  // Dibujo acotado
  function svg2d(e) {
    const t = (x, y, s, cls, anc) => '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anc ? ' text-anchor="' + anc + '"' : '') + '>' + s + '</text>';
    let s = '';
    if (e.tipo === 'malla') {
      const nT = 4, nL = 3;
      const k = Math.min(230 / ((nT - 1) * e.sT), 140 / ((nL - 1) * e.sL)), x0 = 40, y0 = 36; // cabe con sus cotas
      const ancho = (nT - 1) * e.sT * k, alto = (nL - 1) * e.sL * k;
      for (let i = 0; i < nL; i++) s += '<line class="alambre" x1="' + (x0 - 12) + '" y1="' + (y0 + i * e.sL * k) + '" x2="' + (x0 + ancho + 12) + '" y2="' + (y0 + i * e.sL * k) + '" stroke-width="' + Math.max(2, e.dL * 0.8) + '"/>';
      for (let j = 0; j < nT; j++) s += '<line class="alambre" x1="' + (x0 + j * e.sT * k) + '" y1="' + (y0 - 12) + '" x2="' + (x0 + j * e.sT * k) + '" y2="' + (y0 + alto + 12) + '" stroke-width="' + Math.max(2, e.dT * 0.8) + '"/>';
      for (let i = 0; i < nL; i++) for (let j = 0; j < nT; j++) s += '<circle class="soldadura" cx="' + (x0 + j * e.sT * k) + '" cy="' + (y0 + i * e.sL * k) + '" r="3"/>';
      s += t(x0 + e.sT * k / 2, y0 + alto + 32, 'sT = ' + e.sT + ' mm', 'fig-etq', 'middle');
      s += t(x0 + ancho + 22, y0 + e.sL * k / 2 + 4, 'sL = ' + e.sL + ' mm', 'fig-etq');
      s += t(20, 236, e.ref + (e.capas > 1 ? ' (2 capas)' : '') + ' · alambres ' + e.dL + ' / ' + e.dT + ' mm · panel 6.00 × 2.35 m', 'etq-mini');
      return '<svg class="dibujo fig" viewBox="0 0 360 250" role="img" aria-label="Malla ' + e.ref + '">' + s + '</svg>';
    }
    const r = 20 + e.db * 1.6, cx = 70, cy = 110;
    s += '<circle class="barra-sec" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
    s += '<line class="fig-flecha" x1="' + (cx - r) + '" y1="' + (cy + r + 16) + '" x2="' + (cx + r) + '" y2="' + (cy + r + 16) + '"/>';
    s += t(cx, cy + r + 32, 'db = ' + e.db + ' mm', 'fig-etq', 'middle');
    s += t(cx, cy + 4, 'A = ' + e.A + ' cm²', 'etq-mini', 'middle');
    const x1 = 150, x2 = 340, h = Math.max(14, e.db * 1.1), y = cy - h / 2;
    s += '<rect class="barra-alz" x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="' + h + '" rx="' + h / 2 + '"/>';
    for (let x = x1 + 8; x < x2 - 4; x += Math.max(9, e.db * 0.7)) s += '<line class="corruga" x1="' + x + '" y1="' + (y - 1) + '" x2="' + (x + h * 0.45) + '" y2="' + (y + h + 1) + '"/>';
    s += t((x1 + x2) / 2, y - 12, 'Barra corrugada #' + e.barra, 'fig-etq', 'middle');
    s += t(20, 236, e.n + ' barras #' + e.barra + ' @ ' + e.sTxt + ' en ' + e.dir + ' · NSR-10 Tabla C.3.5.3-2', 'etq-mini');
    return '<svg class="dibujo fig" viewBox="0 0 360 250" role="img" aria-label="Barra #' + e.barra + '">' + s + '</svg>';
  }

  let defecto = null;
  global.Elemento = { crear, montar: (el) => { defecto = crear(el); }, mostrar: (e) => defecto && defecto.mostrar(e), svg2d };
})(window);

/* Intro 3D (v1.1): "De la tierra al logo".
 * 1 terreno: la cámara baja entre estratos de suelo y partículas flotantes.
 * 2 excavación: las partículas de la fosa salen disparadas; aparecen las líneas de replanteo.
 * 3 parrilla: las barras corrugadas crecen una a una (X y luego Y) y destellan en los cruces.
 * 4 columna: bajan las dovelas, se doblan sus ganchos y los estribos suben en espiral.
 * 5 vaciado: el concreto llena la zapata como vidrio líquido, con borde ondulado y luminoso.
 * 6 carga: baja la carga sobre la columna y el suelo responde con los anillos del bulbo de presiones.
 * 7 logo: la obra se pierde en la niebla y una varilla se dobla en la Z de ZapatAPP.
 * Con { suave: true } la cámara queda quieta (sin vuelos). La calidad se ajusta al equipo (Escena3D).
 */
(function (global) {
  'use strict';

  const DUR = 7.2;
  const FASES = [['terreno', 0], ['excavacion', 1.2], ['parrilla', 2.2], ['columna', 3.4], ['vaciado', 4.4], ['carga', 5.6], ['logo', 6.3]];
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fase = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (k) => 1 - Math.pow(1 - k, 3);
  const eIn = (k) => k * k * k;
  const eInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const rebote = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  // Trazo del logo (varilla en Z) en coordenadas 256 × 256, muestreado como polilínea
  const LOGO = [[102, 106], [66, 70], [60, 62], [62, 57], [74, 56], [200, 56], [56, 200], [182, 200], [194, 199], [196, 193], [190, 186], [154, 150]];

  let vivo = null;

  function reproducir(cont, opciones) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D) return Promise.resolve();
    const suave = !!(opciones && opciones.suave);
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { exposicion: 1.05, entorno: 0.9 });
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
    scene.add(camera);
    scene.fog = new THREE.Fog(0x000000, 6, 30);
    const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(4, 8, 5); scene.add(sol);
    const azul = new THREE.PointLight(0x6f8db5, 0, 8, 2); azul.position.set(0, -0.4, 0); scene.add(azul);

    const tam = () => {
      const w = cont.clientWidth || innerWidth, h = cont.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    const Lx = 2.4, Ly = 2.0, h = 0.5, Cx = 0.5, Cy = 0.4, altoCol = 1.5, Df = 1.5, r = 0.075;
    const obra = new THREE.Group(); scene.add(obra);

    // ---------------------------------------------------------------- 1. estratos y partículas
    const estratos = [];
    [[Df, 0x6b6157], [0.7, 0x4f4a44], [-0.25, 0x3a3733]].forEach(([y, c]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = y; obra.add(m); estratos.push(m);
    });
    const N = calidad.particulas;
    const pos = new Float32Array(N * 3), base = new Float32Array(N * 3), vel = new Float32Array(N * 3), enFosa = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 9, y = -0.4 + Math.random() * (Df + 0.5), z = (Math.random() - 0.5) * 9;
      base.set([x, y, z], i * 3); pos.set([x, y, z], i * 3);
      enFosa[i] = Math.abs(x) < Lx / 2 + 0.3 && Math.abs(z) < Ly / 2 + 0.3 && y > -0.05 ? 1 : 0;
      const d = Math.hypot(x, z) || 1, v = 2.5 + Math.random() * 3;
      vel.set([x / d * v, 1.5 + Math.random() * 3.5, z / d * v], i * 3);
    }
    const gPart = new THREE.BufferGeometry(); gPart.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const matPart = new THREE.PointsMaterial({ color: 0xb7aa98, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
    const particulas = new THREE.Points(gPart, matPart); obra.add(particulas);

    // ---------------------------------------------------------------- 2. replanteo
    const lineasRep = [];
    const linea = (pts, dash) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p[0], 0.004, p[1])));
      const m = dash ? new THREE.LineDashedMaterial({ color: 0x9fb4d0, dashSize: 0.12, gapSize: 0.07, transparent: true, opacity: 0 }) : new THREE.LineBasicMaterial({ color: 0xdfe6ef, transparent: true, opacity: 0 });
      const l = new THREE.Line(g, m); if (dash) l.computeLineDistances(); obra.add(l); lineasRep.push(l);
    };
    linea([[-Lx / 2, -Ly / 2], [Lx / 2, -Ly / 2], [Lx / 2, Ly / 2], [-Lx / 2, Ly / 2], [-Lx / 2, -Ly / 2]]);
    linea([[-Lx / 2 - 0.8, 0], [Lx / 2 + 0.8, 0]], true);
    linea([[0, -Ly / 2 - 0.8], [0, Ly / 2 + 0.8]], true);
    linea([[-Lx / 2, Ly / 2 + 0.35], [Lx / 2, Ly / 2 + 0.35]]);                               // cota de Lx
    linea([[-Lx / 2, Ly / 2 + 0.27], [-Lx / 2, Ly / 2 + 0.43]]); linea([[Lx / 2, Ly / 2 + 0.27], [Lx / 2, Ly / 2 + 0.43]]);
    linea([[Lx / 2 + 0.35, -Ly / 2], [Lx / 2 + 0.35, Ly / 2]]);                               // cota de Ly
    linea([[Lx / 2 + 0.27, -Ly / 2], [Lx / 2 + 0.43, -Ly / 2]]); linea([[Lx / 2 + 0.27, Ly / 2], [Lx / 2 + 0.43, Ly / 2]]);

    // ---------------------------------------------------------------- 3. parrilla con corrugas
    const matAcero = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.32 });
    // Corrugas: el vértice se ensancha en anillos periódicos a lo largo de la barra
    matAcero.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n float corruga = smoothstep(0.55, 0.75, fract(position.y * 28.0)) * (1.0 - smoothstep(0.8, 1.0, fract(position.y * 28.0)));\n transformed.xz *= 1.0 + 0.32 * corruga;');
    };
    const barra = (largo, radio) => { const g = new THREE.CylinderGeometry(radio, radio, largo, 10, Math.max(8, Math.round(largo * 30))); g.translate(0, largo / 2, 0); return g; };
    const yb = r + 0.012;
    const sep = 0.18, barrasX = [], barrasY = [];
    for (let z = -Ly / 2 + r; z <= Ly / 2 - r + 1e-6; z += sep) {
      const m = new THREE.Mesh(barra(Lx - 2 * r, 0.011), matAcero);
      m.rotation.z = -Math.PI / 2; m.position.set(-Lx / 2 + r, yb, z); m.scale.y = 0.0001; obra.add(m); barrasX.push(m);
    }
    for (let x = -Lx / 2 + r; x <= Lx / 2 - r + 1e-6; x += sep) {
      const m = new THREE.Mesh(barra(Ly - 2 * r, 0.011), matAcero);
      m.rotation.x = Math.PI / 2; m.position.set(x, yb + 0.022, -Ly / 2 + r); m.scale.y = 0.0001; obra.add(m); barrasY.push(m);
    }
    // Destellos en los cruces
    const cruces = [];
    barrasY.forEach((by, j) => barrasX.forEach((bx, i) => cruces.push(by.position.x, yb + 0.012, bx.position.z, i, j)));
    const nCruces = cruces.length / 5;
    const posC = new Float32Array(nCruces * 3);
    for (let k = 0; k < nCruces; k++) posC.set([cruces[k * 5], cruces[k * 5 + 1], cruces[k * 5 + 2]], k * 3);
    const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(posC, 3));
    const matChispa = new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    obra.add(new THREE.Points(gC, matChispa));

    // ---------------------------------------------------------------- 4. columna: dovelas con gancho y estribos
    const dovelas = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]].forEach(([sx, sz]) => {
      const x = sx * (Cx / 2 - 0.05), z = sz * (Cy / 2 - 0.05);
      const g = new THREE.Group();
      const v = new THREE.Mesh(barra(altoCol + h - 0.12, 0.013), matAcero); g.add(v);
      const gancho = new THREE.Mesh(barra(0.3, 0.013), matAcero);
      if (sx) gancho.rotation.z = -sx * Math.PI / 2; else gancho.rotation.x = sz * Math.PI / 2; // gancho hacia afuera
      gancho.scale.y = 0.0001; g.add(gancho);
      g.position.set(x, yb + 0.03, z); g.userData = { x, gancho }; obra.add(g); dovelas.push(g);
    });
    const estribos = [];
    for (let i = 0; i < 7; i++) {
      const ex = Cx / 2 - 0.035, ez = Cy / 2 - 0.035, y = h + 0.12 + i * (altoCol - 0.3) / 6;
      const curva = new THREE.CurvePath();
      const P = [[ex, ez], [-ex, ez], [-ex, -ez], [ex, -ez], [ex, ez]].map((p) => new THREE.Vector3(p[0], 0, p[1]));
      for (let k = 0; k < 4; k++) curva.add(new THREE.LineCurve3(P[k], P[k + 1]));
      const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 32, 0.007, 6, true), matAcero);
      m.position.y = y; m.visible = false; obra.add(m); estribos.push(m);
    }

    // ---------------------------------------------------------------- 5. vaciado: vidrio líquido con borde ondulado
    const uni = { uNivel: { value: -1 }, uT: { value: 0 }, uBrillo: { value: 1 } };
    const vidrio = (nivel) => {
      const m = calidad.alta
        ? new THREE.MeshPhysicalMaterial({ color: 0x9fb7d6, metalness: 0, roughness: 0.08, transmission: 0.92, thickness: 0.4, ior: 1.45, transparent: true, opacity: 0.95 })
        : new THREE.MeshStandardMaterial({ color: 0x8fa9cc, metalness: 0, roughness: 0.15, transparent: true, opacity: 0.32, depthWrite: false });
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uNivel = nivel; sh.uniforms.uT = uni.uT; sh.uniforms.uBrillo = uni.uBrillo;
        sh.vertexShader = 'varying vec3 vPosM;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPosM = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vPosM;\nuniform float uNivel;\nuniform float uT;\nuniform float uBrillo;\n' +
          sh.fragmentShader.replace('#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\n float ola = uNivel + 0.03 * sin(vPosM.x * 9.0 + uT * 5.0) * cos(vPosM.z * 7.0 + uT * 3.0);\n if (vPosM.y > ola) discard;\n float borde = 1.0 - smoothstep(0.0, 0.05, ola - vPosM.y);')
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.42, 0.58, 0.86) * borde * uBrillo * 2.0;');
      };
      return m;
    };
    const nivelZ = { value: -1 }, nivelC = { value: -1 };
    const zap = new THREE.Mesh(new THREE.BoxGeometry(Lx, h, Ly), vidrio(nivelZ)); zap.position.y = h / 2; obra.add(zap);
    const aristasZ = new THREE.LineSegments(new THREE.EdgesGeometry(zap.geometry), new THREE.LineBasicMaterial({ color: 0xdfe6ef, transparent: true, opacity: 0 }));
    aristasZ.position.copy(zap.position); obra.add(aristasZ);
    const col = new THREE.Mesh(new THREE.BoxGeometry(Cx, altoCol, Cy), vidrio(nivelC)); col.position.y = h + altoCol / 2; obra.add(col);
    const aristasC = new THREE.LineSegments(new THREE.EdgesGeometry(col.geometry), new THREE.LineBasicMaterial({ color: 0xdfe6ef, transparent: true, opacity: 0 }));
    aristasC.position.copy(col.position); obra.add(aristasC);

    // ---------------------------------------------------------------- 6. carga y bulbo de presiones
    const flecha = new THREE.Group();
    const matFlecha = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6f8db5, emissiveIntensity: 1.2, metalness: 0.2, roughness: 0.4 });
    const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 16), matFlecha); tallo.position.y = 0.55; flecha.add(tallo);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 20), matFlecha); punta.rotation.x = Math.PI; punta.position.y = 0.11; flecha.add(punta);
    flecha.visible = false; obra.add(flecha);
    const anillos = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x8fb0dc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = Math.PI / 2; m.position.y = -0.02; obra.add(m); anillos.push(m);
    }
    const bulbo = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x6f8db5, transparent: true, opacity: 0, wireframe: true, depthWrite: false }));
    bulbo.position.y = -0.01; obra.add(bulbo);

    // ---------------------------------------------------------------- 7. varilla que se dobla en la Z del logo
    const k = 0.0036; // 256 unidades del logo → ~0.92 m
    const zPts = LOGO.map((p) => new THREE.Vector3((p[0] - 128) * k, -(p[1] - 128) * k, 0));
    const largoZ = zPts.reduce((s, p, i) => s + (i ? p.distanceTo(zPts[i - 1]) : 0), 0);
    let acum = 0;
    const rectas = zPts.map((p, i) => { if (i) acum += p.distanceTo(zPts[i - 1]); return new THREE.Vector3(-largoZ / 2 + acum, 0, 0); });
    const matLogo = new THREE.MeshStandardMaterial({ color: 0xe8edf3, metalness: 0.85, roughness: 0.25, emissive: 0x2a3a52, emissiveIntensity: 0.6, fog: false });
    const varilla = new THREE.Mesh(new THREE.BufferGeometry(), matLogo);
    varilla.position.set(0, 0, -2.9); varilla.visible = false; camera.add(varilla);
    function doblar(kk) {
      const pts = zPts.map((p, i) => rectas[i].clone().lerp(p, kk));
      const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2);
      varilla.geometry.dispose();
      varilla.geometry = new THREE.TubeGeometry(curva, 160, 0.045, 12, false);
    }

    // ---------------------------------------------------------------- cámara
    const foco = new THREE.Vector3(0, 0.55, 0);
    function camara(t) {
      const ajuste = Math.max(1, 1.25 / camera.aspect);
      if (suave) { camera.position.set(4.2 * ajuste, 3.4 * ajuste, 4.6 * ajuste); camera.lookAt(foco); return; }
      const kk = eInOut(fase(t, 0, 6.3));
      const ang = 0.2 + kk * 1.3;
      const radio = (5.2 - 1.0 * Math.sin(kk * Math.PI) + eIn(fase(t, 6.1, DUR)) * 4) * ajuste;
      const alto = 6.0 - 3.2 * eOut(fase(t, 0, 2.2)) + 0.6 * kk + eIn(fase(t, 6.1, DUR)) * 3;
      camera.position.set(Math.cos(ang) * radio, alto, Math.sin(ang) * radio);
      foco.y = 0.2 + 0.35 * fase(t, 2.2, 4.4);
      camera.lookAt(foco);
    }

    let faseActual = '';
    function estado(t, dt) {
      const f = FASES.filter((x) => t >= x[1]).pop()[0];
      if (f !== faseActual) { faseActual = f; cont.dataset.fase = f; }
      uni.uT.value = t;

      // 1. terreno
      const kEst = eOut(fase(t, 0, 0.9)) * (1 - fase(t, 1.4, 2.4));
      estratos.forEach((m, i) => { m.material.opacity = 0.16 * kEst * (1 - i * 0.2); });
      const kExc = fase(t, 1.2, 2.2);
      matPart.opacity = 0.75 * eOut(fase(t, 0, 0.8)) * (1 - fase(t, 2.0, 3.0));
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (enFosa[i] && kExc > 0) {
          const s = eOut(kExc) * 1.2;
          pos[o] = base[o] + vel[o] * s; pos[o + 1] = base[o + 1] + vel[o + 1] * s - 2.2 * s * s; pos[o + 2] = base[o + 2] + vel[o + 2] * s;
        } else pos[o + 1] = base[o + 1] + Math.sin(t * 1.3 + i) * 0.03;
      }
      gPart.attributes.position.needsUpdate = true;

      // 2. replanteo
      const kRep = eOut(fase(t, 1.6, 2.2)) * (1 - fase(t, 4.6, 5.4));
      lineasRep.forEach((l) => { l.material.opacity = 0.85 * kRep; });

      // 3. parrilla
      barrasX.forEach((b, i) => { b.scale.y = Math.max(0.0001, eOut(fase(t, 2.2 + i * 0.045, 2.55 + i * 0.045))); });
      barrasY.forEach((b, i) => { b.scale.y = Math.max(0.0001, eOut(fase(t, 2.75 + i * 0.04, 3.1 + i * 0.04))); });
      matChispa.opacity = Math.sin(Math.PI * fase(t, 2.95, 3.6)) * 0.9;

      // 4. columna
      dovelas.forEach((g, i) => {
        const kd = fase(t, 3.4 + i * 0.05, 3.85 + i * 0.05);
        g.visible = kd > 0;
        g.position.y = yb + 0.03 + (suave ? 0 : 2.4 * (1 - eOut(kd)));
        g.userData.gancho.scale.y = Math.max(0.0001, rebote(fase(t, 3.85 + i * 0.05, 4.1 + i * 0.05)));
      });
      estribos.forEach((e, i) => {
        const ke = fase(t, 3.9 + i * 0.06, 4.25 + i * 0.06);
        e.visible = ke > 0;
        e.rotation.y = (1 - eOut(ke)) * -Math.PI * 0.8;
        e.scale.setScalar(0.4 + 0.6 * eOut(ke));
      });

      // 5. vaciado
      const kz = eInOut(fase(t, 4.4, 5.1));
      nivelZ.value = -0.05 + kz * (h + 0.08);
      aristasZ.material.opacity = 0.7 * fase(t, 4.6, 5.1);
      const kc = eInOut(fase(t, 4.9, 5.6));
      nivelC.value = h - 0.05 + kc * (altoCol + 0.1);
      aristasC.material.opacity = 0.7 * fase(t, 5.1, 5.6);
      uni.uBrillo.value = 1 - fase(t, 5.6, 6.0);

      // 6. carga y bulbo
      const kf = fase(t, 5.6, 5.95);
      flecha.visible = kf > 0 && t < 6.6;
      flecha.position.y = h + altoCol + 0.02 + (1 - eIn(kf)) * 1.4;
      const golpe = fase(t, 5.95, 6.9);
      anillos.forEach((a, i) => {
        const ka = fase(t, 5.95 + i * 0.12, 6.75 + i * 0.12);
        a.scale.setScalar(0.4 + ka * (1.6 + i * 0.25));
        a.material.opacity = Math.sin(Math.PI * ka) * 0.85;
      });
      bulbo.scale.set(1.3 + golpe * 0.6, 1.1 * eOut(golpe) + 0.001, 1.1 + golpe * 0.5);
      bulbo.material.opacity = 0.35 * Math.sin(Math.PI * golpe);
      azul.intensity = 18 * Math.sin(Math.PI * golpe);

      // 7. logo: la obra se pierde en la niebla y la varilla se dobla en la Z
      const kNiebla = eIn(fase(t, 6.2, 7.0));
      scene.fog.near = 6 - 5.5 * kNiebla; scene.fog.far = 30 - 27 * kNiebla;
      const kl = fase(t, 6.3, 7.1);
      varilla.visible = kl > 0;
      if (kl > 0) {
        doblar(eInOut(clamp(kl * 1.15)));
        varilla.rotation.set(0.25 * (1 - kl), -0.6 * (1 - eOut(kl)), 0);
        varilla.position.z = -2.9 - 0.8 * (1 - eOut(kl));
      }
      camara(t);
    }

    // Compila todos los materiales antes de empezar: evita el tirón del primer cuadro de cada fase
    const ocultos = [];
    scene.traverse((o) => { if (o.visible === false) { ocultos.push(o); o.visible = true; } });
    doblar(1);
    renderer.compile(scene, camera);
    ocultos.forEach((o) => { o.visible = false; });

    return new Promise((fin) => {
      let previo = null, t = 0;
      let parar = false;
      vivo = { saltar() { parar = true; } };
      cont.dataset.fase = '';
      const cuadro = (ahora) => {
        // El reloj avanza a lo sumo 0.1 s por cuadro: en un equipo lento la intro se alarga un poco en vez de saltarse fases
        if (previo !== null) t += Math.min((ahora - previo) / 1000, 0.1);
        previo = ahora;
        estado(Math.min(t, DUR), 0);
        renderer.render(scene, camera);
        if (!parar && t < DUR) { requestAnimationFrame(cuadro); return; }
        // limpieza
        removeEventListener('resize', tam);
        scene.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        });
        if (scene.environment) scene.environment.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        cont.dataset.fase = 'fin';
        vivo = null;
        fin();
      };
      requestAnimationFrame(cuadro);
    });
  }

  function saltar() { if (vivo) vivo.saltar(); }

  global.Intro3D = { reproducir, saltar, DUR, FASES };
})(window);

/* Intro 3D (RomiCalc): "Del pórtico al logo".
 * 1 suelo: aparece la retícula del plano con sus ejes.
 * 2 zapatas: caen sobre el terreno y se iluminan en azul al llegar.
 * 3 columnas: crecen desde las zapatas.
 * 4 vigas: se extienden de columna a columna.
 * 5 losa: baja y se apoya sobre las vigas.
 * 6 carga: puntos de luz bajan por el camino de la carga hasta el suelo, que responde con ondas bajo las zapatas.
 * 7 logo: el pórtico se pierde en la niebla y las piezas de la R (barra, bola y pata) se arman sobre su bloque azul.
 * Con { suave: true } la cámara queda quieta (sin vuelos). La calidad se ajusta al equipo (Escena3D).
 */
(function (global) {
  'use strict';

  const DUR = 7.2;
  const FASES = [['suelo', 0], ['zapatas', 0.7], ['columnas', 1.8], ['vigas', 2.8], ['losa', 3.7], ['carga', 4.6], ['logo', 6.0]];
  const AZUL = 0x2a5db0, CIELO = 0x8db8f2;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const fase = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (k) => 1 - Math.pow(1 - k, 3);
  const eIn = (k) => k * k * k;
  const eInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const rebote = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  let vivo = null;

  function reproducir(cont, opciones) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D) return Promise.resolve();
    const suave = !!(opciones && opciones.suave);
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { exposicion: 1.05, entorno: 0.9 });
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
    scene.add(camera);
    scene.fog = new THREE.Fog(0x000000, 8, 34);
    const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(4, 8, 5); scene.add(sol);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x303640, 0.6));

    const tam = () => {
      const w = cont.clientWidth || innerWidth, h = cont.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    // ---------------------------------------------------------------- 1. suelo: retícula y ejes
    const reticula = new THREE.GridHelper(12, 24, CIELO, 0x2a3442);
    reticula.material.transparent = true; reticula.material.opacity = 0; reticula.material.depthWrite = false;
    scene.add(reticula);
    const ejes = [];
    const xs = [-1.6, 0, 1.6], zs = [-1, 1];
    const linea = (a, b) => {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]),
        new THREE.LineDashedMaterial({ color: CIELO, dashSize: 0.14, gapSize: 0.08, transparent: true, opacity: 0 }));
      l.computeLineDistances(); scene.add(l); ejes.push(l);
    };
    xs.forEach((x) => linea(new THREE.Vector3(x, 0.005, -2.2), new THREE.Vector3(x, 0.005, 2.2)));
    zs.forEach((z) => linea(new THREE.Vector3(-2.8, 0.005, z), new THREE.Vector3(2.8, 0.005, z)));

    // ---------------------------------------------------------------- 2–5. piezas del pórtico (vidrio con aristas)
    const vidrio = () => (calidad.alta
      ? new THREE.MeshPhysicalMaterial({ color: 0xc9d6e6, metalness: 0, roughness: 0.12, transmission: 0.8, thickness: 0.4, ior: 1.4, transparent: true, emissive: AZUL, emissiveIntensity: 0 })
      : new THREE.MeshStandardMaterial({ color: 0xb6c3d3, metalness: 0, roughness: 0.3, transparent: true, opacity: 0.55, emissive: AZUL, emissiveIntensity: 0 }));
    const piezas = [];
    function pieza(grupo, w, h, d, x, y, z, t0) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vidrio());
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xdfe6ef, transparent: true, opacity: 0.8 })));
      m.position.set(x, y, z); m.visible = false; scene.add(m);
      piezas.push({ m, grupo, x, y, z, t0 });
      return m;
    }
    const hz = 0.3, alto = 2.3, yv = hz + alto - 0.15;
    xs.forEach((x, i) => zs.forEach((z, j) => {
      pieza('zapatas', 0.9, hz, 0.9, x, hz / 2, z, 0.7 + (i * 2 + j) * 0.12);
      pieza('columnas', 0.26, alto, 0.26, x, hz + alto / 2, z, 1.8 + (i * 2 + j) * 0.1);
    }));
    zs.forEach((z, j) => [-0.8, 0.8].forEach((x, i) => pieza('vigas', 1.6, 0.3, 0.24, x, yv, z, 2.8 + (j * 2 + i) * 0.1)));
    xs.forEach((x, i) => pieza('vigas', 0.24, 0.3, 2, x, yv, 0, 3.2 + i * 0.1));
    pieza('losa', 3.9, 0.14, 2.7, 0, yv + 0.22, 0, 3.7);

    function moverPieza(p, t) {
      const k = fase(t, p.t0, p.t0 + 0.55);
      p.m.visible = k > 0;
      if (!k) return;
      const e = eOut(k);
      if (p.grupo === 'zapatas') p.m.position.y = p.y + (suave ? 0 : 2.4 * (1 - rebote(k)));
      else if (p.grupo === 'columnas') { p.m.scale.y = Math.max(0.001, e); p.m.position.y = hz + alto * e / 2; }
      else if (p.grupo === 'vigas') { if (p.m.geometry.parameters.width > 1) p.m.scale.x = Math.max(0.001, e); else p.m.scale.z = Math.max(0.001, e); }
      else p.m.position.y = p.y + (suave ? 0 : 1.6 * (1 - e));
      // Cada pieza se ilumina en azul al llegar y se apaga despacio
      p.m.material.emissiveIntensity = 0.9 * (1 - fase(t, p.t0 + 0.4, p.t0 + 1.2));
    }

    // ---------------------------------------------------------------- 6. carga: puntos que bajan hasta el suelo y ondas
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const caminos = [];
    xs.forEach((x) => zs.forEach((z) => caminos.push([V(x * 0.5, yv + 0.3, 0), V(x, yv, z), V(x, hz, z), V(x, -0.6, z)])));
    const POR = 10;
    const posP = new Float32Array(caminos.length * POR * 3);
    const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(posP, 3));
    const matP = new THREE.PointsMaterial({ color: CIELO, size: 0.13, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending });
    scene.add(new THREE.Points(gP, matP));
    const tramos = caminos.map((pts) => { const l = pts.slice(1).map((p, i) => p.distanceTo(pts[i])); return { pts, l, total: l.reduce((a, b) => a + b, 0) }; });
    function moverCarga(t) {
      let n = 0;
      tramos.forEach((c) => {
        for (let k = 0; k < POR; k++) {
          let d = ((t * 0.7 + k / POR) % 1) * c.total, i = 0;
          while (i < c.l.length - 1 && d > c.l[i]) { d -= c.l[i]; i++; }
          const p = c.pts[i].clone().lerp(c.pts[i + 1], Math.min(1, d / c.l[i]));
          posP.set([p.x, p.y, p.z], n++ * 3);
        }
      });
      gP.attributes.position.needsUpdate = true;
    }
    const ondas = [];
    xs.forEach((x) => zs.forEach((z) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.6, 48), new THREE.MeshBasicMaterial({ color: CIELO, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); scene.add(m); ondas.push(m);
    }));

    // ---------------------------------------------------------------- 7. el isotipo: bloque, barra, bola y pata
    const k = 0.0036; // 256 unidades del logo → ~0.92 m, a 2.9 m de la cámara
    const L = (x, y) => [(x - 128) * k, -(y - 128) * k];
    const plano = (pts, prof) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: false }); };
    function bloqueRedondo() {
      const [x0, y0] = L(32, 224), [x1, y1] = L(224, 32), r = 44 * k, s = new THREE.Shape();
      s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
      s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
      return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
    }
    const matLogo = (c) => new THREE.MeshBasicMaterial({ color: c, fog: false, toneMapped: false }); // colores planos, iguales a los del isotipo
    const logo = new THREE.Group(); logo.position.set(0, 0, -2.9); logo.visible = false; camera.add(logo);
    const bloque = new THREE.Mesh(bloqueRedondo(), matLogo(AZUL)); logo.add(bloque);
    const barra = new THREE.Mesh(plano([L(76, 184), L(108, 184), L(108, 72), L(76, 72)], 0.03), matLogo(0xffffff)); logo.add(barra);
    const pata = new THREE.Mesh(plano([L(114, 138), L(150, 138), L(186, 184), L(150, 184)], 0.03), matLogo(0xffffff)); logo.add(pata);
    const bola = new THREE.Mesh(new THREE.SphereGeometry(32 * k, 40, 24), matLogo(CIELO));
    const [bx, by] = L(144, 104); logo.add(bola);
    [barra, pata].forEach((m) => { m.position.z = 0.05; });

    // ---------------------------------------------------------------- cámara
    const foco = new THREE.Vector3(0, 1.2, 0);
    function camara(t) {
      const ajuste = Math.max(1, 1.25 / camera.aspect);
      if (suave) { camera.position.set(6.2 * ajuste, 4.6 * ajuste, 7 * ajuste); camera.lookAt(foco); return; }
      const kk = eInOut(fase(t, 0, 6.0));
      const ang = 0.35 + kk * 1.1;
      const radio = (8.4 - 1.2 * Math.sin(kk * Math.PI) + eIn(fase(t, 5.9, DUR)) * 5) * ajuste;
      const altura = 7.5 - 3.6 * eOut(fase(t, 0, 2.0)) + 0.8 * kk + eIn(fase(t, 5.9, DUR)) * 3;
      camera.position.set(Math.cos(ang) * radio, altura, Math.sin(ang) * radio);
      foco.y = 0.6 + 0.9 * fase(t, 1.8, 4.2);
      camera.lookAt(foco);
    }

    let faseActual = '';
    function estado(t) {
      const f = FASES.filter((x) => t >= x[1]).pop()[0];
      if (f !== faseActual) { faseActual = f; cont.dataset.fase = f; }

      const kSuelo = eOut(fase(t, 0, 0.8));
      reticula.material.opacity = 0.55 * kSuelo;
      ejes.forEach((l) => { l.material.opacity = 0.8 * kSuelo * (1 - fase(t, 4.4, 5.2)); });
      piezas.forEach((p) => moverPieza(p, t));

      const kCarga = fase(t, 4.6, 4.9) * (1 - fase(t, 5.9, 6.3));
      matP.opacity = kCarga;
      if (kCarga > 0) moverCarga(t - 4.6);
      ondas.forEach((o, i) => {
        const ko = fase(t, 5.0 + i * 0.05, 5.9 + i * 0.05);
        o.scale.setScalar(0.6 + ko * 1.6);
        o.material.opacity = Math.sin(Math.PI * ko) * 0.8;
      });

      // 7. la obra se pierde en la niebla y se arma el isotipo
      const kNiebla = eIn(fase(t, 5.9, 6.7));
      scene.fog.near = 8 - 7.5 * kNiebla; scene.fog.far = 34 - 31 * kNiebla;
      const kl = fase(t, 6.0, DUR);
      logo.visible = kl > 0;
      if (kl > 0) {
        bloque.scale.setScalar(Math.max(0.001, rebote(fase(t, 6.0, 6.4))));
        const kb = eOut(fase(t, 6.2, 6.6)), kp = eOut(fase(t, 6.5, 6.9)), kc = rebote(fase(t, 6.35, 6.8));
        barra.position.y = -0.5 * (1 - kb);
        pata.position.set(-0.3 * (1 - kp), 0.15 * (1 - kp), 0.05);
        bola.position.set(bx, by + 0.6 * (1 - kc), 0.06);
        [barra, pata, bola].forEach((m, i) => { m.visible = [kb, kp, fase(t, 6.35, 6.8)][i] > 0; });
        logo.rotation.y = -0.35 * (1 - eOut(kl));
      }
      camara(t);
    }

    // Compila todos los materiales antes de empezar: evita el tirón del primer cuadro de cada fase
    const ocultos = [];
    scene.traverse((o) => { if (o.visible === false) { ocultos.push(o); o.visible = true; } });
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
        estado(Math.min(t, DUR));
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

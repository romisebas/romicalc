/* Intro 3D (RomiCalc): "Una obra en 8 segundos", sobre la maqueta compartida (js/nucleo/maqueta3d.js).
 * suelo: el bloque de terreno sube con sus estratos, el río y la quebrada.
 * zapatas: caen las zapatas con sus vigas de amarre.
 * columnas, vigas, losa: el edificio se construye piso a piso (columnas que crecen, vigas y losa que bajan, escalera
 *   y ladrillo); cada pieza se ilumina en azul al llegar.
 * puente: estribos, pila y box culvert; después el tablero con sus vigas I y la vía con bordillos y barandas.
 * carga: puntos de luz bajan por el camino de la carga de cada estructura hasta el suelo.
 * logo: la obra se pierde en la niebla y las piezas de la R (barra, bola y pata) se arman sobre su bloque azul.
 * Con { suave: true } la cámara queda quieta (sin vuelos). La calidad se ajusta al equipo (Escena3D).
 */
(function (global) {
  'use strict';

  const DUR = 8.0;
  const T = (etapa) => 0.3 + etapa * 0.5; // momento en que llega cada etapa de obra de la maqueta
  const FASES = [['suelo', 0], ['zapatas', T(1)], ['columnas', T(2)], ['vigas', T(3)], ['losa', T(3) + 0.25], ['puente', T(8)], ['carga', 5.7], ['logo', 6.8]];
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
    if (!THREE || !global.Escena3D || !global.Maqueta3D) return Promise.resolve();
    const suave = !!(opciones && opciones.suave);
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.0, entorno: 0.6 });
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 120);
    scene.add(camera);
    scene.fog = new THREE.Fog(0x000000, 26, 60);
    const maqueta = global.Maqueta3D.crear(THREE, { simple: !calidad.alta });
    scene.add(maqueta.raiz);
    global.Maqueta3D.luces(THREE, scene, renderer);

    const tam = () => {
      const w = cont.clientWidth || innerWidth, h = cont.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    // ---------------------------------------------------------------- cómo llega cada pieza, según su etapa de obra
    const piezas = maqueta.todas.map((m, i) => {
      const u = m.userData, p = m.geometry.parameters || {};
      const modo = u.parte === 'terreno' || u.parte === 'agua' ? 'sube' : u.parte === 'columna' ? 'crece' : u.parte === 'zapata' ? 'cae' : 'baja';
      return { m, u, y0: m.position.y, alto: p.height || 0, modo, t0: T(u.etapa) + (i % 7) * 0.025 };
    });
    function mover(p, t) {
      const k = fase(t, p.t0, p.t0 + 0.5), m = p.m;
      m.visible = k > 0;
      if (!k) return;
      if (suave) { m.position.y = p.y0; m.scale.y = 1; }
      else if (p.modo === 'sube') m.position.y = p.y0 - 3 * (1 - eOut(k));
      else if (p.modo === 'crece') { const e = Math.max(0.001, eOut(k)); m.scale.y = e; m.position.y = p.y0 - p.alto * (1 - e) / 2; }
      else if (p.modo === 'cae') m.position.y = p.y0 + 2.5 * (1 - rebote(k));
      else m.position.y = p.y0 + 1.6 * (1 - eOut(k));
      // cada pieza de la obra llega iluminada en azul y vuelve a su material
      if (p.u.etapa > 0) m.material = t < p.t0 + 0.75 ? maqueta.materiales.azul : p.u.mat0;
    }

    // ---------------------------------------------------------------- carga: puntos que bajan por todas las estructuras
    const caminos = Object.values(maqueta.caminos).flat();
    const POR = 6;
    const posP = new Float32Array(caminos.length * POR * 3);
    const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(posP, 3));
    const matP = new THREE.PointsMaterial({ color: CIELO, size: 0.18, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending });
    const puntosCarga = new THREE.Points(gP, matP); puntosCarga.renderOrder = 2; scene.add(puntosCarga);
    const tramos = caminos.map((todos) => {
      const pts = todos.filter((q, i) => !i || q.distanceToSquared(todos[i - 1]) > 1e-6);
      const l = pts.slice(1).map((q, i) => q.distanceTo(pts[i]));
      return { pts, l, total: l.reduce((a, b) => a + b, 0) };
    });
    function moverCarga(t) {
      let n = 0;
      tramos.forEach((c) => {
        for (let k = 0; k < POR; k++) {
          let d = ((t * 0.6 + k / POR) % 1) * c.total, i = 0;
          while (i < c.l.length - 1 && d > c.l[i]) { d -= c.l[i]; i++; }
          const q = c.pts[i].clone().lerp(c.pts[i + 1], Math.min(1, d / c.l[i]));
          posP.set([q.x, q.y, q.z], n++ * 3);
        }
      });
      gP.attributes.position.needsUpdate = true;
    }

    // ---------------------------------------------------------------- el isotipo: bloque, barra, bola y pata
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

    // ---------------------------------------------------------------- cámara: del edificio en obra a la maqueta completa
    const EDIF = new THREE.Vector3(-2.5, 1.2, 3.5), TODO = maqueta.limites.centro.clone(), foco = new THREE.Vector3();
    function camara(t) {
      const ajuste = Math.max(1, 1.5 / camera.aspect);
      if (suave) { foco.copy(TODO); camera.position.set(11 * ajuste, 13 * ajuste, 16 * ajuste); camera.lookAt(foco); return; }
      const kk = eInOut(fase(t, 0.3, 5.8));
      foco.lerpVectors(EDIF, TODO, kk);
      const ang = 0.95 - 0.5 * kk;
      const radio = (12 + 9 * kk + eIn(fase(t, 6.6, DUR)) * 8) * ajuste;
      const altura = (9 - 2.5 * eOut(fase(t, 0, 1.6)) + 3 * kk) * ajuste;
      camera.position.set(foco.x + Math.sin(ang) * radio, foco.y + altura, foco.z + Math.cos(ang) * radio);
      camera.lookAt(foco);
    }

    let faseActual = '';
    function estado(t) {
      const f = FASES.filter((x) => t >= x[1]).pop()[0];
      if (f !== faseActual) { faseActual = f; cont.dataset.fase = f; }
      piezas.forEach((p) => mover(p, t));
      maqueta.actualizar(t);

      const kCarga = fase(t, 5.7, 6.0) * (1 - fase(t, 6.7, 7.0));
      matP.opacity = kCarga;
      if (kCarga > 0) moverCarga(t - 5.7);

      // la obra se pierde en la niebla y se arma el isotipo
      const kNiebla = eIn(fase(t, 6.6, 7.4));
      scene.fog.near = 26 - 25.5 * kNiebla; scene.fog.far = 60 - 57 * kNiebla;
      const kl = fase(t, 6.8, DUR);
      logo.visible = kl > 0;
      if (kl > 0) {
        bloque.scale.setScalar(Math.max(0.001, rebote(fase(t, 6.8, 7.2))));
        const kb = eOut(fase(t, 7.0, 7.4)), kp = eOut(fase(t, 7.3, 7.7)), kc = rebote(fase(t, 7.15, 7.6));
        barra.position.y = -0.5 * (1 - kb);
        pata.position.set(-0.3 * (1 - kp), 0.15 * (1 - kp), 0.05);
        bola.position.set(bx, by + 0.6 * (1 - kc), 0.06);
        [barra, pata, bola].forEach((m, i) => { m.visible = [kb, kp, fase(t, 7.15, 7.6)][i] > 0; });
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

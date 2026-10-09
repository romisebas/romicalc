/* Portada (RomiCalc): la maqueta compartida (js/nucleo/maqueta3d.js) en despiece. Los pisos del edificio, el tablero
 * del puente y la vía flotan separados por niveles; al acercar el cursor a "Diseñar" se juntan (Escultura.armar(true))
 * y al alejarlo se vuelven a separar. Las zapatas van en el azul de la marca porque son lo que ya se calcula y en el
 * despiece salen del terreno para verse. En pantallas táctiles se arma y se separa sola cada pocos segundos.
 * Quieta (armada a medias) sin animaciones. Solo dibuja mientras la portada está visible.
 */
(function (global) {
  'use strict';
  let objetivo = 0, armado = 0;

  function montar(cont) {
    const THREE = global.THREE;
    if (!THREE || !global.Escena3D || !global.Maqueta3D || !cont || cont.firstChild) return;
    const { renderer, scene, calidad } = global.Escena3D.crear(cont, { sombras: true, exposicion: 1.0, entorno: 0.6 });
    const maqueta = global.Maqueta3D.crear(THREE, { simple: !calidad.alta });
    scene.add(maqueta.raiz);
    global.Maqueta3D.luces(THREE, scene, renderer);
    maqueta.piezas.zapatas.forEach((m) => { m.material = maqueta.materiales.azul; });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
    const mira = new THREE.Vector3(0, 1.0, 0);

    // Separación de cada pieza en el despiece: su nivel (piso del edificio, tablero, vía); las zapatas suben medio nivel
    const PASO = 1.1;
    maqueta.todas.forEach((m) => {
      const u = m.userData;
      u.y0 = m.position.y;
      u.dy = (u.id === 'zapatas' ? 0.6 : u.nivel) * PASO;
    });

    const tam = () => {
      const w = cont.clientWidth, a = cont.clientHeight;
      if (!w || !a) return;
      renderer.setSize(w, a, false);
      camera.aspect = w / a;
      const d = 30 * Math.max(1, 1.5 / camera.aspect); // en pantallas angostas se aleja para que quepa
      camera.position.copy(mira).add(new THREE.Vector3(0, 0.62, 1).normalize().multiplyScalar(d));
      camera.lookAt(mira);
      camera.updateProjectionMatrix();
    };
    tam();
    addEventListener('resize', tam);

    // En pantallas táctiles (sin cursor) se arma y se separa sola
    const tactil = global.matchMedia && global.matchMedia('(hover: none)').matches;
    if (tactil) setInterval(() => { objetivo = objetivo ? 0 : 1; }, 3500);

    let t0 = performance.now(), giro = -0.6;
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
        giro += dt * 0.1;
        maqueta.actualizar(ahora / 1000);
      }
      const flota = quieto ? 0 : Math.sin(ahora / 900);
      const sep = 1 - armado;
      maqueta.todas.forEach((m) => {
        const u = m.userData;
        m.position.y = u.y0 + u.dy * sep + (u.dy ? flota * 0.06 * sep * (1 + u.nivel * 0.3) : 0);
      });
      maqueta.raiz.rotation.y = giro;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(cuadro);
  }

  function armar(si) { objetivo = si ? 1 : 0; }
  function estado() { return { armado, objetivo }; }

  global.Escultura = { montar, armar, estado };
})(window);

/* Escena 3D compartida (v1.1): renderizador con color sRGB, tono ACES y luz de entorno.
 * También decide la calidad según el equipo: en celulares y equipos lentos usa menos
 * partículas, sin sombras y pixel ratio 1, para que las animaciones vayan fluidas.
 */
(function (global) {
  'use strict';

  // WebGL por software (SwiftShader, llvmpipe…): no hay tarjeta gráfica y el vidrio con transmisión
  // o las sombras congelarían la página. Se detecta una sola vez.
  let software = null;
  function porSoftware() {
    if (software !== null) return software;
    software = false;
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const nombre = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : '';
      software = !gl || /swiftshader|llvmpipe|software|basic render/i.test(nombre);
      const perder = gl && gl.getExtension('WEBGL_lose_context');
      if (perder) perder.loseContext();
    } catch (e) { software = true; }
    return software;
  }

  function calidad() {
    const tactil = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    const lento = tactil || porSoftware() || (navigator.hardwareConcurrency || 4) <= 4;
    return { alta: !lento, pixel: lento ? 1 : Math.min(global.devicePixelRatio || 1, 2), particulas: lento ? 700 : 2400, sombras: !lento };
  }

  function crear(cont, op) {
    const THREE = global.THREE;
    const o = op || {};
    const q = calidad();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preservar });
    renderer.setPixelRatio(q.pixel);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposicion || 1;
    if (o.sombras && q.sombras) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    cont.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // Luz de entorno (estudio neutro): da reflejos creíbles al acero y al vidrio
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = o.entorno == null ? 1 : o.entorno;
    pm.dispose();
    return { renderer, scene, calidad: q };
  }

  global.Escena3D = { crear, calidad };
})(window);

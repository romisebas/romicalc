/* Mesa de la zapata combinada (beta 1.2): una sola pantalla, sin asistente.
 * Las columnas se arrastran sobre una regla; el centroide, el largo, la presión y los diagramas
 * de cortante y momento cambian en vivo. Guarda el proyecto en los recientes.
 */
(function (global) {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const T = () => global.Tipos.combinada;
  let el = null, estado = null, id = null, R = null, falt = [], tGuardar = null;

  const FLECHA_IZQ = '<span class="bv-volver-circ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></span>';

  // Mezcla los datos guardados sobre la forma vacía (las columnas se mezclan una por una)
  function normalizar(d) {
    const base = T().clone(T().VACIO);
    (function mezclar(b, o) {
      Object.keys(b).forEach((k) => {
        if (o == null || !(k in o)) return;
        if (Array.isArray(b[k])) b[k].forEach((x, i) => mezclar(x, o[k] && o[k][i]));
        else if (b[k] && typeof b[k] === 'object') mezclar(b[k], o[k]);
        else b[k] = o[k];
      });
    })(base, d);
    return base;
  }

  function montar() {
    if (el) return;
    el = $('#mesa');
    el.innerHTML =
      '<header class="mesa-barra">' +
        '<button type="button" class="bv-volver-ico" id="mesa-inicio">' + FLECHA_IZQ + 'Inicio</button>' +
        '<div class="mesa-titulo"><p class="bv-eti">Zapata combinada</p><h1 class="mesa-h1" id="mesa-nombre">Nueva zapata</h1></div>' +
        '<p class="mesa-dim">L = <b class="num" id="mesa-L">—</b> · B = <b class="num" id="mesa-B">—</b></p>' +
        '<button type="button" class="btn btn-quieto" id="mesa-ejemplo">Cargar ejemplo del documento</button>' +
      '</header>' +
      '<section class="mesa-lienzo" id="mesa-lienzo" aria-label="Alzado de la zapata"></section>';
    $('#mesa-inicio').addEventListener('click', cerrar);
    $('#mesa-ejemplo').addEventListener('click', () => { estado = T().clone(T().EJEMPLO); cambio(); });
  }

  function recalcular() {
    const listo = T().preparar(estado);
    falt = T().faltantes(listo);
    R = null;
    if (!falt.length) { try { R = T().calcular(listo); } catch (ex) { R = null; } }
  }

  function pintar() {
    const U = global.Unidades;
    $('#mesa-nombre').textContent = estado.proyecto.nombre || 'Nueva zapata';
    $('#mesa-L').textContent = R ? U.fmt(R.L, 'longitud') : '—';
    $('#mesa-B').textContent = R ? U.fmt(R.B, 'longitud') : '—';
  }

  function guardar() {
    clearTimeout(tGuardar);
    if (id) global.Proyectos.guardar(id, estado, R ? (R.todoOk ? 'cumple' : 'no-cumple') : 'incompleto');
  }

  function cambio() {
    recalcular();
    pintar();
    clearTimeout(tGuardar);
    tGuardar = setTimeout(guardar, 400);
  }

  function abrir(datos, pid, conCarga) {
    montar();
    estado = normalizar(datos);
    id = pid || global.Proyectos.nuevoId();
    document.body.classList.remove('en-bienvenida', 'en-portada');
    $('#bienvenida').hidden = true;
    $('#app').hidden = true;
    el.hidden = false;
    window.scrollTo(0, 0);
    recalcular();
    pintar();
    guardar();
    if (R && conCarga) global.Cargando.mostrar('Abriendo proyecto', R);
  }

  function cerrar() {
    guardar();
    el.hidden = true;
    global.App.volverAOpciones();
  }

  global.Mesa = { abrir, cerrar, estado: () => estado, resultado: () => R };
})(window);

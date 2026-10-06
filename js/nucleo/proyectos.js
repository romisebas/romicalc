/* Proyectos recientes guardados en el navegador (hasta 12).
 * Cada proyecto: { id, nombre, elemento, tipo, fecha (ISO), estado: 'cumple'|'no-cumple'|'incompleto', datos }.
 */
(function (global) {
  'use strict';

  const CLAVE = 'dz-proyectos-v3';
  const CLAVE_V2 = 'diseno-zapatas-v2';
  const MAX = 12;

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; }
  }
  function escribir(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX))); return true; } catch (e) { return false; }
  }

  // Trae el último trabajo de la v2 como un proyecto reciente, una sola vez.
  function migrar() {
    try {
      if (localStorage.getItem(CLAVE) !== null) return;
      const v2 = localStorage.getItem(CLAVE_V2);
      if (!v2) { escribir([]); return; }
      const datos = JSON.parse(v2);
      escribir([{ id: nuevoId(), nombre: (datos.proyecto && datos.proyecto.nombre) || 'Proyecto anterior', elemento: (datos.proyecto && datos.proyecto.elemento) || '',
        tipo: datos.tipo || 'aislada-momento', fecha: new Date().toISOString(), estado: 'incompleto', datos }]);
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function nuevoId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function listar() { return leer().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); }
  function obtener(id) { return leer().find((p) => p.id === id) || null; }

  function guardar(id, datos, estado) {
    const lista = leer().filter((p) => p.id !== id);
    lista.unshift({ id, nombre: datos.proyecto.nombre || '', elemento: datos.proyecto.elemento || '', tipo: datos.tipo || 'aislada-momento',
      fecha: new Date().toISOString(), estado, datos });
    return escribir(lista);
  }

  function borrar(id) { escribir(leer().filter((p) => p.id !== id)); }

  global.Proyectos = { migrar, nuevoId, listar, obtener, guardar, borrar };
})(window);

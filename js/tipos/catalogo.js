/* Catálogo de tipos de zapata. Cada tipo disponible registra su módulo en window.Tipos.
 * Solo se muestran los que ya calculan; los íconos de los que vienen quedan en el historial de git (beta 1.2). */
(function (global) {
  'use strict';
  global.CatalogoZapatas = [
    { id: 'aislada-momento', ico: '<path d="M8 34h32v6H8z"/><path d="M21 14h6v20h-6z"/><path class="ic-mov" d="M15 12a10 10 0 0 1 6-5M33 12a10 10 0 0 0-6-5"/>', nombre: 'Aislada con momento', desc: 'Carga axial y momento biaxial', disponible: true },
    { id: 'combinada', ico: '<path d="M4 34h40v6H4z"/><path d="M10 14h6v20h-6zM32 14h6v20h-6z"/>', nombre: 'Combinada', desc: 'Dos columnas sobre una zapata', disponible: true },
  ];
})(window);

/* Catálogo de tipos de zapata. Cada tipo disponible registra su módulo en window.Tipos. */
(function (global) {
  'use strict';
  global.CatalogoZapatas = [
    { id: 'aislada-momento', ico: '<path d="M8 34h32v6H8z"/><path d="M21 14h6v20h-6z"/><path class="ic-mov" d="M15 12a10 10 0 0 1 6-5M33 12a10 10 0 0 0-6-5"/>', nombre: 'Aislada con momento', desc: 'Carga axial y momento biaxial', disponible: true },
    { id: 'aislada-concentrica', ico: '<path d="M8 34h32v6H8z"/><path d="M21 14h6v20h-6z"/><path class="ic-mov" d="M24 4v7M21 8l3 3 3-3"/>', nombre: 'Aislada concéntrica', desc: 'Solo carga axial', disponible: false },
    { id: 'medianera', ico: '<path d="M6 34h22v6H6z"/><path d="M6 14h6v20H6z"/><path class="ic-mov" d="M4 6v36" stroke-dasharray="3 3"/>', nombre: 'Medianera', desc: 'Columna en el lindero', disponible: false },
    { id: 'esquinera', ico: '<path d="M8 8h26v26H8z"/><path d="M8 8h8v8H8z"/><path class="ic-mov" d="M4 4h36M4 4v36" stroke-dasharray="3 3"/>', nombre: 'Esquinera', desc: 'Columna en la esquina del lote', disponible: false },
    { id: 'combinada', ico: '<path d="M4 34h40v6H4z"/><path d="M10 14h6v20h-6zM32 14h6v20h-6z"/>', nombre: 'Combinada', desc: 'Dos columnas sobre una zapata', disponible: false },
    { id: 'corrida', ico: '<path d="M6 34h36v6H6z"/><path d="M19 10h10v24H19z"/><path class="ic-mov" d="M19 16h10M19 22h10M19 28h10"/>', nombre: 'Corrida bajo muro', desc: 'Cimiento continuo', disponible: false },
  ];
})(window);

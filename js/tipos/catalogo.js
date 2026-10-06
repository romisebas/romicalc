/* Catálogo de tipos de zapata. Cada tipo disponible registra su módulo en window.Tipos. */
(function (global) {
  'use strict';
  global.CatalogoZapatas = [
    { id: 'aislada-momento', nombre: 'Aislada con momento', desc: 'Carga axial y momento biaxial', disponible: true },
    { id: 'aislada-concentrica', nombre: 'Aislada concéntrica', desc: 'Solo carga axial', disponible: false },
    { id: 'medianera', nombre: 'Medianera', desc: 'Columna en el lindero', disponible: false },
    { id: 'esquinera', nombre: 'Esquinera', desc: 'Columna en la esquina del lote', disponible: false },
    { id: 'combinada', nombre: 'Combinada', desc: 'Dos columnas sobre una zapata', disponible: false },
    { id: 'corrida', nombre: 'Corrida bajo muro', desc: 'Cimiento continuo', disponible: false },
  ];
})(window);

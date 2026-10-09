/* Elementos estructurales de RomiCalc: lo que muestra "¿Qué quieres calcular?".
 * Cada uno explica qué hace y por dónde le pasa la carga al siguiente (camino). Solo Zapatas está disponible.
 * El 3D (js/nucleo/camino3d.js) usa los mismos id para iluminar cada pieza.
 */
(function (global) {
  'use strict';
  global.GruposElementos = [
    { id: 'edificaciones', nombre: 'Edificaciones', norma: 'NSR-10' },
    { id: 'puentes', nombre: 'Puentes y obras', norma: 'CCP-14' },
  ];
  global.Elementos = [
    { id: 'losas', grupo: 'edificaciones', nombre: 'Losas', disponible: false,
      frase: 'Reciben el peso del piso y lo reparten a las vigas. Macizas o aligeradas.',
      explica: 'Recibe el peso del piso: personas, muebles y acabados. Se dobla entre las vigas y les pasa la carga por sus bordes.',
      camino: ['Losa', 'Viga', 'Columna', 'Zapata', 'Suelo'], actual: 'Losa', revisa: 'Flexión · cortante · deflexión',
      ico: '<path d="M4 18h40v6H4z"/><path d="M10 24v14M38 24v14"/><path class="ic-mov" d="M14 8v6M24 8v6M34 8v6"/>' },
    { id: 'vigas', grupo: 'edificaciones', nombre: 'Vigas', disponible: false,
      frase: 'Llevan la carga de la losa hasta las columnas.',
      explica: 'Recibe la losa y lleva su carga hasta las columnas. Trabaja a flexión: se comprime arriba y se estira abajo, por eso el acero principal va en la cara inferior.',
      camino: ['Losa', 'Viga', 'Columna', 'Zapata', 'Suelo'], actual: 'Viga', revisa: 'Flexión · cortante · deflexión',
      ico: '<path d="M4 16h40v10H4z"/><path d="M8 26v14M40 26v14"/><path class="ic-mov" d="M10 22h28"/>' },
    { id: 'columnas', grupo: 'edificaciones', nombre: 'Columnas', disponible: false,
      frase: 'Bajan la carga de cada piso hasta la cimentación.',
      explica: 'Recoge la carga de las vigas de cada piso y la baja hasta la cimentación. Trabaja a compresión con algo de flexión; los estribos confinan el concreto.',
      camino: ['Viga', 'Columna', 'Zapata', 'Suelo'], actual: 'Columna', revisa: 'Flexocompresión · esbeltez · confinamiento',
      ico: '<path d="M18 4h12v40H18z"/><path class="ic-mov" d="M18 12h12M18 20h12M18 28h12M18 36h12"/>' },
    { id: 'zapatas', grupo: 'edificaciones', nombre: 'Zapatas', disponible: true,
      frase: 'Reparten la carga de la columna sobre el suelo. Aisladas y combinadas.',
      explica: 'Ensancha el apoyo de la columna para que el suelo aguante: reparte la carga en un área mucho mayor. Se revisa la presión en el suelo, el punzonamiento y la flexión.',
      camino: ['Columna', 'Zapata', 'Suelo'], actual: 'Zapata', revisa: 'Presión del suelo · punzonamiento · flexión',
      ico: '<path d="M8 32h32v8H8z"/><path d="M21 8h6v24h-6z"/><path class="ic-mov" d="M8 44c6-4 26-4 32 0"/>' },
    { id: 'puente-losa', grupo: 'puentes', nombre: 'Puente de losa', disponible: false,
      frase: 'Una losa maciza salva el cauce de un apoyo al otro. Para luces cortas.',
      explica: 'El tablero es una losa maciza que va de un estribo al otro. Recibe el camión de diseño y lo lleva directo a los apoyos.',
      camino: ['Camión', 'Losa', 'Estribo', 'Cimentación'], actual: 'Losa', revisa: 'Camión de diseño · flexión · deflexión',
      ico: '<path d="M2 20h44v6H2z"/><path d="M4 26l4 14M44 26l-4 14"/><path class="ic-mov" d="M12 40c6-3 18-3 24 0"/>' },
    { id: 'puente-viga', grupo: 'puentes', nombre: 'Puente de viga y losa', disponible: false,
      frase: 'Vigas bajo el tablero para salvar luces más largas.',
      explica: 'Para luces más largas, varias vigas bajo el tablero reciben la losa y llevan la carga a los estribos. La losa reparte el camión entre las vigas.',
      camino: ['Camión', 'Losa', 'Vigas', 'Estribo', 'Cimentación'], actual: 'Vigas', revisa: 'Camión de diseño · reparto entre vigas · flexión',
      ico: '<path d="M2 16h44v4H2z"/><path class="ic-mov" d="M8 20v8M18 20v8M30 20v8M40 20v8"/><path d="M4 28l4 12M44 28l-4 12"/>' },
    { id: 'box-culvert', grupo: 'puentes', nombre: 'Box culvert', disponible: false,
      frase: 'Un cajón de concreto deja pasar el agua bajo la vía.',
      explica: 'Un cajón de concreto enterrado deja pasar el agua. Aguanta la tierra de encima, el empuje de los lados y el camión que pasa por la vía.',
      camino: ['Camión', 'Tierra', 'Cajón', 'Suelo'], actual: 'Cajón', revisa: 'Presión de tierra · carga viva · flexión',
      ico: '<path d="M2 10h44"/><path d="M8 16h32v24H8z"/><path d="M13 21h22v14H13z"/><path class="ic-mov" d="M16 31c3-2 6 2 9 0s6 2 9 0"/>' },
  ];
})(window);

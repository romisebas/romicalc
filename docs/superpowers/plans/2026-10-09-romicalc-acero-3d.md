# RomiCalc: acero real en todos los 3D y plantas y cortes de la memoria en mini-3D

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + threejs-geometry, threejs-materials. Estado: **Q1–Q8 aprobadas (todas las recomendadas), terminado**.

**Objetivo:**
1. Las plantas y cortes que aún son SVG en las diapositivas pasan a mini-3D (quieto, como las demás). El PDF sigue con el SVG.
2. El acero de la zapata combinada se arma como en obra: cada cara con su acero, cuantía mínima donde el cálculo no pide acero y ganchos en las puntas.
3. Un solo armador de acero en 3D para todos los modelos (Planos de la aislada, Planos de la combinada y los mini-3D), para que muestren lo mismo.

## Lo que hay hoy (revisado en el código)
- **Figuras aún en SVG en la memoria:**
  - Aislada: planta con capas (presión, punzonamiento, acero) y corte en X (`js/nucleo/dibujo.js`).
  - Combinada: planta, corte longitudinal y cortes transversales (`js/combinada/dibujo-combinada.js`).
- **3D de la combinada** (`js/combinada/vista3d-combinada.js`):
  - Superior L1 cortada a l<sub>d</sub> de los puntos de inflexión, inferior L2, franjas T1/T2, entre franjas T3 y dovelas.
  - **Todas rectas, sin ganchos**, aunque el despiece ya les cobra ganchos de 12 d<sub>b</sub>.
  - **La cara superior queda sin acero** fuera de L1 y no lleva barras transversales que la sostengan.
- **3D de la aislada** (`js/nucleo/vista3d.js`): la parrilla inferior ya tiene ganchos de 12 d<sub>b</sub> y las dovelas su gancho de 90°.

## Cómo se arma una zapata combinada
Tomado de la práctica de diseño (NSR-10 C.15, C.7.12 y C.12, y ACI 318 cap. 13); la viga trabaja como una viga invertida:

| Cara | Sentido | Qué va | De dónde sale | Ganchos |
|---|---|---|---|---|
| Superior | Longitudinal | **L1**: momento negativo entre columnas, cortada a l<sub>d</sub> de los puntos de inflexión | cálculo (ya existe) | 90° hacia abajo si llega al borde |
| Superior | Longitudinal | **L3 nueva**: cuantía mínima en los tramos donde no hay L1 | 0.0018·b·h | 90° hacia abajo en el borde; empalme con L1 |
| Superior | Transversal | **T4 nueva**: barras de repartición a cuantía mínima que sostienen L1 y L3 | 0.0018·b·h | 90° hacia abajo en los dos bordes |
| Inferior | Longitudinal | **L2**: momento positivo bajo las columnas, de lado a lado | cálculo (ya existe; suele gobernar la mínima) | 90° hacia arriba en los dos extremos |
| Inferior | Transversal | **T1 y T2**: franjas bajo cada columna, ancho columna + d a cada lado | cálculo (ya existe) | 90° hacia arriba en los dos bordes |
| Inferior | Transversal | **T3**: entre franjas, a cuantía mínima | 0.0018·b·h (ya existe) | 90° hacia arriba |
| Columna | Vertical | **D1 y D2**: dovelas con gancho de 90° apoyado en la parrilla inferior | ya existe | gancho de 12 d<sub>b</sub> |

- **Gancho estándar:** extensión de 12 d<sub>b</sub> y doblez con diámetro de 6 d<sub>b</sub> para barras #3 a #8 (NSR-10 C.7.1 y C.7.2). Se dibuja con la curva, no como una esquina.
- **Orden de capas:** la inferior transversal va sobre la longitudinal, y la superior transversal bajo la longitudinal, cada una con su recubrimiento.

## Fases
- **A · Motor de la combinada:**
  - Agregar L3 y T4 al diseño y al despiece, con su peso.
  - Mostrarlos en la tabla de despiece, en la memoria (cap. 10) y en el PDF.
  - Pruebas: nuevas marcas, pesos y que los valores comparados con el documento no cambien.
- **B · Armador 3D compartido** (`js/nucleo/armado3d.js`):
  - Recibe una lista de marcas (tramo, número, barra, cara y ganchos) y arma barras con gancho curvo en mallas instanciadas, una por marca.
  - Lo usan los Planos de la combinada y de la aislada y los mini-3D.
  - Se quita el dibujo de barras repetido en `vista3d.js` y `vista3d-combinada.js`.
- **C · 3D de la combinada en Planos:**
  - Grupos nuevos (superior mínima y repartición) con su botón y color.
  - Al pasar el ratón, cada barra muestra su marca.
  - "Separar" levanta cada cara.
- **D · Mini-3D de las plantas y cortes de la aislada:**
  - Planta con presión (superficie coloreada bajo la zapata).
  - Planta con punzonamiento (perímetro b<sub>o</sub> y área A<sub>o</sub>).
  - Planta con el acero (parrilla con ganchos y la etiqueta "14 #4 @ 0.14 m"), vista desde arriba en ángulo.
  - Corte en X: la zapata cortada con el acero visto de punta.
- **E · Mini-3D de las plantas y cortes de la combinada:**
  - Planta de dimensiones (L, B, x̄ y franjas sombreadas).
  - Planta de entre franjas y conclusiones (todo el armado).
  - Corte longitudinal (L1, L2 y L3 con sus cortes y ganchos).
  - Corte transversal de cada franja.
- **F · Cierre:**
  - Hoja de capturas antes y después.
  - Pruebas: marcas nuevas, ganchos presentes y tipo 3D en cada diapositiva.
  - Suite completa, PROGRESO y un commit por fase.

## Decisiones (con recomendación)
- **Q1. Acero mínimo en la cara superior de la combinada:**
  - (a) **L3 longitudinal donde no llega L1, más T4 de repartición, ambos a 0.0018·b·h** *(recomendada: es lo que pediste y es la práctica habitual)*.
  - (b) Solo T4 de repartición.
  - (c) Llevar L1 de lado a lado y no usar L3.
- **Q2. ¿Se calculan L3 y T4 en el motor?**
  - (a) **Sí: entran al despiece, al peso, a la memoria y al PDF, para que el 3D y los papeles digan lo mismo** *(recomendada)*.
  - (b) Solo dibujadas en el 3D.
- **Q3. Ganchos:** **90° con 12 d<sub>b</sub> y doblez curvo de 6 d<sub>b</sub>** *(recomendada)*, o esquina recta como hoy en la aislada.
- **Q4. Cara superior de la aislada:** con presión del suelo siempre a compresión no hay momento negativo y la NSR-10 no pide parrilla superior.
  - (a) **Sin parrilla superior; se avisa en la memoria** *(recomendada)*.
  - (b) Agregar parrilla superior a cuantía mínima.
- **Q5. Separar las barras en el 3D:**
  - (a) **Una malla por marca, con su color y su nombre al pasar el ratón** *(recomendada)*.
  - (b) Todo el acero de un solo color.
- **Q6. Plantas de la aislada en mini-3D:** **las tres capas (presión, punzonamiento y acero), cada una en su diapositiva** *(recomendada)*, o solo la de acero.
- **Q7. Maqueta de la portada y de "¿Qué quieres calcular?":**
  - (a) **Quedan como están, son una maqueta de ciudad** *(recomendada)*.
  - (b) Agregarles acero visible.
- **Q8. Revisión:** **te mando una hoja de capturas al cerrar las fases C, D y E** *(recomendada)*.

## Fuera de este plan
- Estribos de amarre de las dovelas dentro de la zapata.
- Cambiar los valores que se comparan con el documento de referencia: L3 y T4 no tocan A<sub>s</sub>, V ni M.

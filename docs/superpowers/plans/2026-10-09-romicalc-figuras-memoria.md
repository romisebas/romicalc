# RomiCalc: figuras de la memoria (SVG técnico para el PDF y mini-3D en la app)

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail + threejs-geometry, threejs-materials, threejs-lighting. Estado: **Q1–Q9 aprobadas (todas las recomendadas), en ejecución**.

**Objetivo:** las figuras de la memoria de cálculo de la zapata aislada y de la combinada se ven hoy como dibujos simples (rectángulos, flechas y textos). Se mejoran en dos versiones:
1. **SVG técnico** (más trabajado): es el que va en el **PDF** y el respaldo cuando no hay 3D.
2. **Mini-3D con Three.js** en las diapositivas de la app: **quieto**, con una cámara fija que deja apreciar la pieza; no gira como la maqueta.

## Inventario (revisado en el código)
| Figura | Dónde | Usada en |
|---|---|---|
| Cargas sobre la columna (servicio y mayoradas) | `js/nucleo/figuras.js` `cargas` | Aislada, cap. 1 |
| Núcleo central y resultante | `figuras.js` `nucleo` | Aislada, cap. 1 |
| Resistencias a cortante (vc) | `figuras.js` `vc` | Aislada, cap. 2 |
| Prisma de punzonamiento | `figuras.js` `prisma` | Aislada, cap. 2 |
| Voladizo a cortante y flexión | `figuras.js` `voladizo` | Aislada, cap. 3 y 4 |
| Sección con acero | `figuras.js` `seccion` | Aislada, cap. 4 |
| Diagrama de momento | `figuras.js` `momento` | Aislada, cap. 4 |
| Áreas de aplastamiento A1/A2 | `figuras.js` `aplastamiento` | Aislada, cap. 5 |
| Pirámide 1:2 para A2 | `figuras.js` `piramide` | Aislada, cap. 5 |
| Planta con capas (presiones, punzonamiento, acero) y corte | `js/nucleo/dibujo.js` | Aislada, varios |
| Cargas sobre la viga de cimentación | `js/combinada/dibujo-combinada.js` `figCargas` | Combinada |
| Presión del suelo | `figPresion` | Combinada |
| Cortante y momento (V y M) | `figVM` | Combinada |
| Punzonamiento de cada columna | `figPunz` | Combinada |
| Planta, corte longitudinal y cortes transversales | `planta`, `corteLongitudinal`, `corteTransversal` | Combinada |

Las diapositivas llaman a las figuras por tipo (`fig: { tipo, dir, ult }` o `fig: { svg }`), y el PDF toma la última figura de cada capítulo (`js/nucleo/informe.js` `figuraCapitulo`). Al pasar el ratón por una ecuación se resalta su parte de la figura (`js/nucleo/diapositivas.js`, tabla `LIGAS`), y al revés.

## Fases
- **A · Base del SVG técnico** (`js/nucleo/svg-tecnico.js`):
  - Achurado de concreto (puntos y triángulos) y de suelo.
  - Grosores de línea por jerarquía: contorno, ejes y cotas.
  - Cotas con flechas y su valor.
  - Flechas de fuerza y momento con el sentido de su signo.
  - Subíndices reales (M<sub>x</sub>) y acero en sección como círculos llenos.
  - Una tinta y gris, para que el PDF imprima bien en blanco y negro.
- **B · SVG de la aislada:** las 9 figuras de `figuras.js`, más la planta y el corte que usa la memoria. Van **a escala** con las medidas del proyecto (L<sub>x</sub>, L<sub>y</sub>, h, columna, d).
- **C · SVG de la combinada:** cargas, presión, V y M, punzonamiento, planta y cortes, también a escala.
- **D · Motor mini-3D** (`js/nucleo/mini3d.js`):
  - Un solo renderizador compartido por todas las diapositivas, para no abrir 22 contextos WebGL.
  - Se dibuja solo la diapositiva visible, una vez, porque es quieto.
  - Cámara fija en la mejor vista de cada pieza y la luz de la maqueta.
  - Etiquetas en HTML encima del 3D, con los mismos textos y subíndices del SVG.
  - La parte ligada a una ecuación se ilumina en azul.
- **E · Mini-3D de la aislada:**
  - Columna sobre la zapata con P y los momentos como arcos.
  - Núcleo central marcado en la cara superior.
  - Prisma de punzonamiento translúcido a d/2.
  - Voladizo con la presión del suelo en bloques.
  - Sección con sus barras, diagrama de momento como cinta y pirámide 1:2 de A<sub>2</sub>.
- **F · Mini-3D de la combinada:**
  - Viga de cimentación con sus dos columnas y las cargas.
  - Superficie de presión del suelo.
  - Cintas de V y M bajo la viga.
  - Perímetros de punzonamiento (el de la columna exterior con 3 lados).
- **G · Cierre:**
  - El PDF sigue usando el SVG; se revisa impreso en blanco y negro.
  - Pruebas: tipo de figura por diapositiva, SVG en el informe y 3D quieto.
  - Hoja de capturas antes y después, PROGRESO y un commit por fase.

## Decisiones (con recomendación)
- **Q1. 3D quieto.**
  - (a) **Fijo, sin girar solo; se puede arrastrar para mirarlo y al soltar vuelve suave a su posición** *(recomendada)*.
  - (b) Totalmente fijo.
  - (c) Fijo, con un botón "Girar".
- **Q2. Etiquetas del 3D:** (a) **en HTML encima del 3D, nítidas y con subíndices reales** *(recomendada)*; (b) texto dibujado dentro del 3D.
- **Q3. Ecuación ↔ figura:** (a) **se mantiene en el 3D: al pasar por una ecuación su parte se ilumina en azul, y al revés** *(recomendada)*; (b) solo en el SVG.
- **Q4. Estilo del SVG para el PDF:** (a) **dibujo técnico en una tinta y gris, con achurados, cotas y grosores de línea** *(recomendada: imprime bien en blanco y negro)*; (b) con los colores de la app.
- **Q5. Fuerzas y momentos con su signo real:** **las flechas van en el sentido del valor y si vale 0 no se dibujan** *(recomendada)*.
- **Q6. A escala:** **las figuras usan las medidas reales del proyecto** *(recomendada)*, o proporciones fijas como hoy.
- **Q7. Sin 3D (celular lento, sin WebGL o animaciones desactivadas):** **se muestra el SVG técnico** *(recomendada)*.
- **Q8. Orden:** **primero el SVG (fases A–C, porque sirve para el PDF y de respaldo) y después el 3D (D–F)** *(recomendada)*.
- **Q9. Revisión:** **te mando una hoja de antes y después al terminar cada fase** *(recomendada)*.

## Fuera de este plan
- Los planos grandes de la pestaña Planos y el 3D del refuerzo, que ya existen. Solo cambian si la memoria usa la misma función.
- Figuras 3D en el PDF: el PDF lleva solo SVG.

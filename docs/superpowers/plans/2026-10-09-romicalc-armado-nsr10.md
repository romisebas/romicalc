# RomiCalc: armado de la combinada según la NSR-10 y el documento guía, y barras junto al 3D

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (en línea) + ponytail. Estado: **Q1–Q7 aprobadas (todas las recomendadas), terminado salvo Q6 (DWG que descarga el usuario)**.

**Objetivo:**
1. El acero de la zapata combinada sigue la NSR-10 y el documento guía. La cuantía mínima solo va en las partes sin acero calculado, y los traslapos solo en los puntos de inflexión.
2. Las barras se eligen junto al visor 3D (Planos), en la aislada y en la combinada, y el 3D cambia al instante.

## El documento guía (Ing. G. A. Chang Nieto, "Zapata Combinada", págs. 6–9)
- **Longitudinal superior:** 1#6 @ 0.19 m (A<sub>s</sub><sup>−</sup> = 48.53 cm²), dibujada de punta a punta con ganchos hacia abajo.
- **Longitudinal superior, otra marca:** junto a la columna interior aparece otra barra superior, 1#6 @ 0.23 m. Es el acero mínimo en la parte donde no hay momento negativo.
- **Longitudinal inferior:** 1#6 @ 0.23 m (A<sub>s</sub><sup>+</sup> = 41.62 cm², gobierna la mínima), bajo las dos columnas, con ganchos hacia arriba.
- **Transversal inferior:**
  - Franja exterior: 1#6 @ 0.20 m (b = 1.18 m).
  - Franja interior: 1#6 @ 0.17 m (b = 1.86 m).
  - Las dos con ganchos en ambos bordes, recubrimiento de 0.075 m y L<sub>c</sub> = 3.91 m.
- **Lo que el documento no dibuja:** el acero entre franjas, la parrilla superior transversal y la ubicación de los traslapos. Esas partes se completan con la NSR-10.

## Reglas de la NSR-10 que se aplican
| Tema | Artículo | Regla |
|---|---|---|
| Cuantía mínima | C.7.12.2.1 y C.15.10.4 | 0.0018·b·h en cada dirección principal, en las partes sin acero calculado |
| Separación de la mínima | C.7.12.2.2 | s ≤ 3h y s ≤ 450 mm |
| Prolongación del negativo | C.12.12.3 | Pasa el punto de inflexión al menos el mayor de d, 12 d<sub>b</sub> y l<sub>n</sub>/16 |
| Traslapo a tracción | C.12.15.1 | Clase B, 1.3·l<sub>d</sub> (≥ 300 mm); se ubica donde el momento es cero, es decir, en el punto de inflexión |
| Gancho estándar | C.7.1.2 y C.7.2.1 | 90° con 12 d<sub>b</sub> de extensión; doblez de diámetro 6 d<sub>b</sub> (#3 a #8) |
| Recubrimiento | C.7.7.1 (a) | 75 mm contra el suelo |
| Anclaje de las franjas | C.15.6 y C.12.2 | l<sub>d</sub> dentro del voladizo, o gancho en el borde |

## Cómo queda el armado (propuesta)
- **Superior longitudinal:**
  - **L1** (calculada): cubre la zona de momento negativo y pasa cada punto de inflexión una longitud e = max(d, 12 d<sub>b</sub>, l<sub>n</sub>/16, 1.3·l<sub>d</sub>). Si la zona negativa llega al borde, L1 llega al borde con gancho.
  - **L3 y L4** (mínima, solo en los extremos vacíos): van del borde, con gancho, hasta el punto de inflexión.
  - **Traslapo:** queda entre el punto de inflexión y el final de L1, todo en la zona sin momento negativo.
  - **Lo que cambia frente a hoy:** hoy L4 se mete 1.3·l<sub>d</sub> desde el final de L1, así que el traslapo no empieza en el punto de inflexión.
- **Superior transversal (T4):** mínima, porque no hay acero calculado a lo ancho arriba. Va de borde a borde con ganchos y sostiene L1, L3 y L4.
- **Inferior longitudinal (L2):** la calculada, que coincide con la mínima. Va de lado a lado con ganchos, sin traslapo si cabe en 12 m.
- **Inferior transversal:**
  - T1 y T2 en las franjas (calculadas).
  - T3 mínima, solo entre franjas (las partes vacías). Así está hoy.
- **Dovelas:** con su gancho apoyado en la parrilla inferior. Sin cambios.

## Fases
- **A · Motor:** L1 con la prolongación de C.12.12.3 y L3/L4 hasta el punto de inflexión, con el traslapo que empieza en él. Se actualizan el despiece, la memoria (con los artículos citados) y la prueba que lo revisa.
- **B · Dibujos:** corte longitudinal en SVG y en 3D con la zona de traslapo marcada en el punto de inflexión.
- **C · Barras junto al 3D:**
  - Una fila compacta encima del visor 3D de Planos con la barra de cada grupo.
  - Combinada: Superior, Mínima, Inferior y Transversal. Aislada: barras en X y en Y.
  - Cada opción muestra su color de estado (cumple, aviso, no cumple).
  - Al cambiar, se recalcula y el 3D se rehace sin mover la cámara.
- **D · Cierre:** pruebas, capturas y PROGRESO.

## Decisiones (con recomendación)
- **Q1. Dónde va el traslapo superior:**
  - (a) **Empieza en el punto de inflexión: L3/L4 llegan hasta el punto de inflexión y L1 lo pasa en e = max(d, 12 d<sub>b</sub>, l<sub>n</sub>/16, 1.3·l<sub>d</sub>)** *(recomendada: todo el traslapo queda donde el momento negativo es cero)*.
  - (b) Centrado en el punto de inflexión.
- **Q2. L1 en la zona de la columna exterior:**
  - (a) **Llega al borde con gancho cuando el punto de inflexión cae a menos de e del borde (como en el documento)** *(recomendada)*.
  - (b) Siempre de punta a punta, como lo dibuja el documento.
- **Q3. Barra de la mínima superior:**
  - (a) **Se elige aparte (dato nuevo `acero.barMin`, por defecto la misma de L1)** *(recomendada)*.
  - (b) Siempre igual a L1.
- **Q4. T4 (transversal superior):** **de borde a borde a cuantía mínima** *(recomendada: arriba no hay acero transversal calculado en ninguna parte)*, o solo bajo L1.
- **Q5. Barras junto al 3D:**
  - (a) **Una fila de listas desplegables encima del visor, en Planos de la aislada y de la combinada; la pestaña Refuerzo se queda con sus tablas** *(recomendada)*.
  - (b) Mover las tablas completas junto al 3D.
- **Q6. Planos DWG de la web:** todas las descargas piden crear una cuenta y yo no puedo crearla ni abrir archivos DWG. Encontré estos:
  - Perfil de zapatas combinadas, con planta del armado y franjas (documentos.arq.com.mx, 77 KB).
  - Zapatas combinadas con vigas centradoras (libreriacad, 53 KB).
  - Diseño de zapata combinada con sus detalles (libreriacad, 286 KB).
  - (a) **Los descargas tú, los abres en AutoCAD y me mandas una captura del armado; ajusto el plan si algo difiere** *(recomendada)*.
  - (b) Seguir solo con la NSR-10 y el documento guía.
- **Q7. Revisión:** **hoja de capturas al cerrar A–B y C** *(recomendada)*.

## Fuera de este plan
- Estribos en la viga de cimentación (el documento no los pide: V<sub>u</sub> ≤ φV<sub>c</sub>).
- Barras de más de 12 m con traslapo en la inferior.
